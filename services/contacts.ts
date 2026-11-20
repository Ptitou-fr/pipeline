// Couche service : règles métier des contacts (validation, doublons, tri). N'appelle que la couche données.
import { findAllContacts, insertContact, type ContactRecord } from "@/data/contacts";

export type Contact = ContactRecord;

export type ContactInput = {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
};

export type ContactErrors = {
  name?: "required";
  email?: "invalid";
};

export type CreateContactResult =
  | { status: "created"; contact: Contact }
  | { status: "invalid"; errors: ContactErrors }
  | { status: "duplicate" };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Comparaison des noms insensible à la casse et aux accents, pour le tri comme pour les doublons.
const collator = new Intl.Collator("fr", { sensitivity: "base" });

const optional = (value: string | undefined) => value?.trim() || null;

export function listContacts(): Contact[] {
  return findAllContacts().sort((a, b) => collator.compare(a.name, b.name) || a.id - b.id);
}

export function createContact(
  input: ContactInput,
  { confirmDuplicate = false }: { confirmDuplicate?: boolean } = {},
): CreateContactResult {
  const fields = {
    name: input.name.trim(),
    company: optional(input.company),
    email: optional(input.email),
    phone: optional(input.phone),
  };

  const errors: ContactErrors = {};
  if (!fields.name) errors.name = "required";
  if (fields.email && !EMAIL.test(fields.email)) errors.email = "invalid";
  if (Object.keys(errors).length > 0) return { status: "invalid", errors };

  if (!confirmDuplicate && findAllContacts().some((c) => collator.compare(c.name, fields.name) === 0)) {
    return { status: "duplicate" };
  }

  return { status: "created", contact: insertContact(fields) };
}
