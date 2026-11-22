"use server";
// Couche présentation : reçoit le formulaire, délègue au service, puis revient à la liste (/contacts, lot 6).
import { refresh, revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import {
  changeStage,
  createContact,
  updateContact,
  type ChangeStageResult,
  type ContactErrors,
} from "@/services/contacts";

export type ContactFormValues = { name: string; company: string; email: string; phone: string; followUpDate: string };

export type ContactFormState = {
  values: ContactFormValues;
  errors?: ContactErrors;
  duplicate?: boolean;
};

const FIELDS = ["name", "company", "email", "phone", "followUpDate"] as const;

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

// Les trois vues du menu montrent les contacts (lot 6).
function revalidateViews() {
  revalidatePath("/");
  revalidatePath("/contacts");
  revalidatePath("/follow-ups");
}

export async function addContact(_prev: ContactFormState, formData: FormData): Promise<ContactFormState> {
  const { raw, values, confirmDuplicate } = readForm(formData);
  const result = await createContact(raw, { confirmDuplicate });

  if (result.status === "invalid") return { values, errors: result.errors };
  if (result.status === "duplicate") return { values, duplicate: true };

  revalidateViews();
  redirect("/contacts");
}

// Liée à l'id du contact par `bind` dans la page de modification.
export async function editContact(id: string, _prev: ContactFormState, formData: FormData): Promise<ContactFormState> {
  const { raw, values, confirmDuplicate } = readForm(formData);
  const result = await updateContact(id, raw, { confirmDuplicate });

  if (result.status === "not_found") notFound();
  if (result.status === "invalid") return { values, errors: result.errors };
  if (result.status === "duplicate") return { values, duplicate: true };

  revalidateViews();
  redirect("/contacts");
}

// Lot 4 : id et étape arrivent bruts du navigateur ; le service les valide. La liste est rafraîchie
// dans tous les cas, pour toujours montrer l'étape réellement enregistrée, et le résultat revient
// au sélecteur, qui signale un échec.
export async function changeContactStage(id: unknown, stage: unknown): Promise<ChangeStageResult> {
  const result = await changeStage(id, stage);
  refresh();
  return result;
}
