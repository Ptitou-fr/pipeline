// Couche service : règles métier des contacts (validation par schéma Zod, doublons, tri). N'appelle que la couche données.
import { z } from "zod";
import {
  findAllContacts,
  findContactById,
  insertContact,
  updateContact as updateContactRecord,
  updateContactStage,
  type ContactFields,
  type ContactRecord,
} from "@/data/contacts";
import { INITIAL_STAGE, STAGES, stageSchema, type Stage } from "@/services/stages";

export type Contact = Omit<ContactRecord, "stage"> & { stage: string };

// Lot 4 : un contact enregistré avant les étapes n'en a pas en base ; il est à l'étape de départ.
const withStage = (record: ContactRecord): Contact => ({ ...record, stage: record.stage ?? INITIAL_STAGE });

// Ce qu'envoie l'appelant (formulaire…), tel quel : le schéma ci-dessous décide de ce qui est accepté.
export type ContactInput = Record<string, unknown>;

type Field = "name" | "company" | "email" | "phone" | "followUpDate";
export type ContactError = "required" | "invalid" | "too_long";
export type ContactErrors = Partial<Record<Field, ContactError>>;

export type CreateContactResult =
  | { status: "created"; contact: Contact }
  | { status: "invalid"; errors: ContactErrors }
  | { status: "duplicate" };

export type UpdateContactResult =
  | { status: "updated"; contact: Contact }
  | { status: "invalid"; errors: ContactErrors }
  | { status: "duplicate" }
  | { status: "not_found" };

// Longueurs maximales, comptées après retrait des espaces autour (254 : limite pratique d'une adresse e-mail).
export const MAX_LENGTH = { name: 100, company: 100, email: 254, phone: 30, followUpDate: 10 } as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Date au format AAAA-MM-JJ, jour existant (pas de 30 février).
const isoDate = z.iso.date();

// Le message de chaque erreur Zod est directement le code renvoyé à la présentation.
const text = (max: number) => z.string({ error: "invalid" }).trim().max(max, { error: "too_long" });
// Champ facultatif : absent, null ou vide → null.
const optional = <T extends z.ZodType<string, string>>(schema: T) => schema.nullish().transform((v) => v || null);

const contactSchema = z.object({
  name: z
    .string({ error: (issue) => (issue.input == null ? "required" : "invalid") })
    .trim()
    .min(1, { error: "required" })
    .max(MAX_LENGTH.name, { error: "too_long" }),
  company: optional(text(MAX_LENGTH.company)),
  email: optional(text(MAX_LENGTH.email).refine((v) => v === "" || EMAIL.test(v), { error: "invalid" })),
  phone: optional(text(MAX_LENGTH.phone)),
  // Date de prochaine relance (lot 5) : AAAA-MM-JJ, date réelle.
  followUpDate: optional(text(MAX_LENGTH.followUpDate).refine((v) => v === "" || isoDate.safeParse(v).success, { error: "invalid" })),
});

// Id venu de l'extérieur (URL…) : entier strictement positif.
const idSchema = z.coerce.number().int().positive();

// Confirmation d'un doublon, telle qu'envoyée par le formulaire : seule la valeur "1" confirme.
const confirmSchema = z.literal("1");

type ContactOptions = { confirmDuplicate?: unknown };

// Comparaison des noms insensible à la casse et aux accents, pour le tri comme pour les doublons.
const collator = new Intl.Collator("fr", { sensitivity: "base" });

const byName = (a: Contact, b: Contact) => collator.compare(a.name, b.name) || a.id - b.id;

export function listContacts(): Contact[] {
  return findAllContacts().map(withStage).sort(byName);
}

// Recherche (lot 3) : texte contenu dans le nom ou l'entreprise, sans tenir compte de la casse ni des accents.
export const SEARCH_MAX_LENGTH = 100;

const searchSchema = z
  .string({ error: "invalid" })
  .trim()
  .max(SEARCH_MAX_LENGTH, { error: "too_long" })
  .nullish()
  .transform((v) => v ?? "");

export type SearchContactsResult =
  | { status: "ok"; contacts: Contact[]; query: string }
  | { status: "invalid"; error: "invalid" | "too_long" };

const fold = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function searchContacts(query: unknown): SearchContactsResult {
  const parsed = searchSchema.safeParse(query);
  if (!parsed.success) return { status: "invalid", error: parsed.error.issues[0].message as "invalid" | "too_long" };

  const text = parsed.data;
  const contacts = listContacts();
  if (!text) return { status: "ok", contacts, query: "" };

  const needle = fold(text);
  const matches = (value: string | null) => value !== null && fold(value).includes(needle);
  return { status: "ok", contacts: contacts.filter((c) => matches(c.name) || matches(c.company)), query: text };
}

function parseContact(input: ContactInput): { fields: ContactFields } | { errors: ContactErrors } {
  const parsed = contactSchema.safeParse(input);
  if (parsed.success) return { fields: parsed.data };
  const errors: ContactErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as Field;
    errors[field] ??= issue.message as ContactError; // la première erreur d'un champ suffit
  }
  return { errors };
}

// Un autre contact porte déjà ce nom ; `exceptId` exclut le contact modifié lui-même.
function isDuplicate(name: string, exceptId?: number): boolean {
  return findAllContacts().some((c) => c.id !== exceptId && collator.compare(c.name, name) === 0);
}

function isConfirmed(confirmDuplicate: unknown): boolean {
  return confirmSchema.safeParse(confirmDuplicate).success;
}

function parseId(id: unknown): number | null {
  const parsed = idSchema.safeParse(id);
  return parsed.success ? parsed.data : null;
}

export function getContact(id: unknown): Contact | null {
  const contactId = parseId(id);
  if (contactId === null) return null;
  const record = findContactById(contactId);
  return record && withStage(record);
}

export function createContact(
  input: ContactInput,
  { confirmDuplicate }: ContactOptions = {},
): CreateContactResult {
  const parsed = parseContact(input);
  if ("errors" in parsed) return { status: "invalid", errors: parsed.errors };

  if (!isConfirmed(confirmDuplicate) && isDuplicate(parsed.fields.name)) return { status: "duplicate" };

  return { status: "created", contact: withStage(insertContact({ ...parsed.fields, stage: INITIAL_STAGE })) };
}

export function updateContact(
  id: unknown,
  input: ContactInput,
  { confirmDuplicate }: ContactOptions = {},
): UpdateContactResult {
  const contactId = parseId(id);
  if (contactId === null || !findContactById(contactId)) return { status: "not_found" };

  const parsed = parseContact(input);
  if ("errors" in parsed) return { status: "invalid", errors: parsed.errors };

  if (!isConfirmed(confirmDuplicate) && isDuplicate(parsed.fields.name, contactId)) return { status: "duplicate" };

  const contact = updateContactRecord(contactId, parsed.fields);
  return contact ? { status: "updated", contact: withStage(contact) } : { status: "not_found" };
}

export type ChangeStageResult = { status: "updated"; contact: Contact } | { status: "invalid" } | { status: "not_found" };

// Lot 4 : on passe librement d'une étape à l'autre, mais seulement parmi les cinq.
export function changeStage(id: unknown, stage: unknown): ChangeStageResult {
  // Les deux entrées sont validées avant tout accès à la couche données.
  const contactId = parseId(id);
  if (contactId === null) return { status: "not_found" };
  const parsed = stageSchema.safeParse(stage);
  if (!parsed.success) return { status: "invalid" };
  if (!findContactById(contactId)) return { status: "not_found" };

  const contact = updateContactStage(contactId, parsed.data);
  return contact ? { status: "updated", contact: withStage(contact) } : { status: "not_found" };
}

// ---------- Lot 5 : qui relancer aujourd'hui

// Un contact à ces étapes n'est plus à relancer, quelle que soit sa date.
const CLOSED_STAGES: readonly Stage[] = ["won", "lost"];

export type FollowUpsResult = { status: "ok"; contacts: Contact[] } | { status: "invalid" };

// Un contact est à relancer si sa date de relance est aujourd'hui ou passée (une relance en retard
// reste visible tant que la date ne change pas) et s'il n'est ni gagné ni perdu.
// `today` est une date AAAA-MM-JJ déjà validée.
function isDue(contact: Contact, today: string): boolean {
  return contact.followUpDate !== null && contact.followUpDate <= today && !CLOSED_STAGES.some((stage) => stage === contact.stage);
}

// `today` (AAAA-MM-JJ) est reçu en paramètre pour que la règle soit testable.
export function listFollowUps(today: unknown): FollowUpsResult {
  const parsed = isoDate.safeParse(today);
  if (!parsed.success) return { status: "invalid" };

  return { status: "ok", contacts: listContacts().filter((c) => isDue(c, parsed.data)) };
}

// ---------- Lot 6 : le pipeline par étapes

// État de la relance affiché sur une carte : à relancer avec une date passée (overdue) ou du jour
// (today), une date mais pas à relancer (scheduled : date future, ou contact gagné ou perdu), pas de date (none).
export type FollowUpStatus = "overdue" | "today" | "scheduled" | "none";

// Même règle « à relancer » que listFollowUps. `today` est une date AAAA-MM-JJ déjà validée.
export function followUpStatus(contact: Contact, today: string): FollowUpStatus {
  if (contact.followUpDate === null) return "none";
  if (!isDue(contact, today)) return "scheduled";
  return contact.followUpDate < today ? "overdue" : "today";
}

export type PipelineContact = Contact & { followUp: FollowUpStatus };
export type PipelineColumn = { stage: Stage; contacts: PipelineContact[] };
export type PipelineResult = { status: "ok"; columns: PipelineColumn[] } | { status: "invalid" };

// Une colonne par étape, dans l'ordre du lot 4, même vide ; dans chaque colonne, les contacts triés
// par nom comme la liste, chacun avec son état de relance pour `today` (AAAA-MM-JJ).
export function listPipeline(today: unknown): PipelineResult {
  const parsed = isoDate.safeParse(today);
  if (!parsed.success) return { status: "invalid" };

  const contacts = listContacts().map((c) => ({ ...c, followUp: followUpStatus(c, parsed.data) }));
  return { status: "ok", columns: STAGES.map((stage) => ({ stage, contacts: contacts.filter((c) => c.stage === stage) })) };
}

export type ViewCountsResult = { status: "ok"; contacts: number; followUps: number } | { status: "invalid" };

// Les nombres du menu : tous les contacts, et ceux à relancer pour `today` (AAAA-MM-JJ).
export function countViews(today: unknown): ViewCountsResult {
  const parsed = isoDate.safeParse(today);
  if (!parsed.success) return { status: "invalid" };

  const contacts = listContacts();
  return { status: "ok", contacts: contacts.length, followUps: contacts.filter((c) => isDue(c, parsed.data)).length };
}

// « Aujourd'hui » suit l'heure locale de la machine.
export function localToday(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
