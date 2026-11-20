"use server";
// Couche présentation : reçoit le formulaire, délègue au service, puis revient à la liste.
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { createContact, updateContact, type ContactErrors } from "@/services/contacts";

export type ContactFormValues = { name: string; company: string; email: string; phone: string };

export type ContactFormState = {
  values: ContactFormValues;
  errors?: ContactErrors;
  duplicate?: boolean;
};

const FIELDS = ["name", "company", "email", "phone"] as const;

export type ContactFormAction = (prev: ContactFormState, formData: FormData) => Promise<ContactFormState>;

// Les valeurs brutes vont au service, qui les valide ; seules les valeurs textuelles sont réaffichées
// dans le formulaire (affichage, rien n'est transmis au service sous cette forme).
function readForm(formData: FormData) {
  const raw = Object.fromEntries(FIELDS.map((field) => [field, formData.get(field)]));
  const values = Object.fromEntries(
    FIELDS.map((field) => [field, typeof raw[field] === "string" ? raw[field] : ""]),
  ) as ContactFormValues;
  return { raw, values, confirmDuplicate: formData.get("confirmDuplicate") };
}

export async function addContact(_prev: ContactFormState, formData: FormData): Promise<ContactFormState> {
  const { raw, values, confirmDuplicate } = readForm(formData);
  const result = createContact(raw, { confirmDuplicate });

  if (result.status === "invalid") return { values, errors: result.errors };
  if (result.status === "duplicate") return { values, duplicate: true };

  revalidatePath("/");
  redirect("/");
}

// Liée à l'id du contact par `bind` dans la page de modification.
export async function editContact(id: string, _prev: ContactFormState, formData: FormData): Promise<ContactFormState> {
  const { raw, values, confirmDuplicate } = readForm(formData);
  const result = updateContact(id, raw, { confirmDuplicate });

  if (result.status === "not_found") notFound();
  if (result.status === "invalid") return { values, errors: result.errors };
  if (result.status === "duplicate") return { values, duplicate: true };

  revalidatePath("/");
  redirect("/");
}
