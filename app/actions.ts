"use server";
// Couche présentation : reçoit le formulaire, délègue au service, puis revient à la liste.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createContact, type ContactErrors } from "@/services/contacts";

export type ContactFormValues = { name: string; company: string; email: string; phone: string };

export type ContactFormState = {
  values: ContactFormValues;
  errors?: ContactErrors;
  duplicate?: boolean;
};

const FIELDS = ["name", "company", "email", "phone"] as const;

export async function addContact(_prev: ContactFormState, formData: FormData): Promise<ContactFormState> {
  // Les valeurs brutes vont au service, qui les valide ; seules les valeurs textuelles sont réaffichées.
  const raw = Object.fromEntries(FIELDS.map((field) => [field, formData.get(field)]));
  const values = Object.fromEntries(
    FIELDS.map((field) => [field, typeof raw[field] === "string" ? raw[field] : ""]),
  ) as ContactFormValues;

  const result = createContact(raw, { confirmDuplicate: formData.get("confirmDuplicate") === "1" });

  if (result.status === "invalid") return { values, errors: result.errors };
  if (result.status === "duplicate") return { values, duplicate: true };

  revalidatePath("/");
  redirect("/");
}
