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

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "");

export async function addContact(_prev: ContactFormState, formData: FormData): Promise<ContactFormState> {
  const values: ContactFormValues = {
    name: text(formData, "name"),
    company: text(formData, "company"),
    email: text(formData, "email"),
    phone: text(formData, "phone"),
  };

  const result = createContact(values, { confirmDuplicate: formData.get("confirmDuplicate") === "1" });

  if (result.status === "invalid") return { values, errors: result.errors };
  if (result.status === "duplicate") return { values, duplicate: true };

  revalidatePath("/");
  redirect("/");
}
