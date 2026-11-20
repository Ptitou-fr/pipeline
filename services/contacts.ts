// Couche service : règles métier des contacts (validation par schéma Zod, doublons, tri). N'appelle que la couche données.
import { z } from "zod";
import { findAllContacts, insertContact, type ContactRecord } from "@/data/contacts";

export type Contact = ContactRecord;

// Ce qu'envoie l'appelant (formulaire…), tel quel : le schéma ci-dessous décide de ce qui est accepté.
export type ContactInput = Record<string, unknown>;

type Field = "name" | "company" | "email" | "phone";
export type ContactError = "required" | "invalid" | "too_long";
export type ContactErrors = Partial<Record<Field, ContactError>>;

export type CreateContactResult =
  | { status: "created"; contact: Contact }
  | { status: "invalid"; errors: ContactErrors }
  | { status: "duplicate" };

// Longueurs maximales, comptées après retrait des espaces autour (254 : limite pratique d'une adresse e-mail).
export const MAX_LENGTH = { name: 100, company: 100, email: 254, phone: 30 } as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
});

// Comparaison des noms insensible à la casse et aux accents, pour le tri comme pour les doublons.
const collator = new Intl.Collator("fr", { sensitivity: "base" });

export function listContacts(): Contact[] {
  return findAllContacts().sort((a, b) => collator.compare(a.name, b.name) || a.id - b.id);
}

export function createContact(
  input: ContactInput,
  { confirmDuplicate = false }: { confirmDuplicate?: boolean } = {},
): CreateContactResult {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    const errors: ContactErrors = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as Field;
      errors[field] ??= issue.message as ContactError; // la première erreur d'un champ suffit
    }
    return { status: "invalid", errors };
  }
  const fields = parsed.data;

  if (!confirmDuplicate && findAllContacts().some((c) => collator.compare(c.name, fields.name) === 0)) {
    return { status: "duplicate" };
  }

  return { status: "created", contact: insertContact(fields) };
}
