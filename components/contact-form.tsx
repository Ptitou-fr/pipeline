"use client";
// Couche présentation : formulaire d'ajout. La validation et les doublons sont décidés par le service.
import { useActionState } from "react";
import { addContact, type ContactFormState, type ContactFormValues } from "@/app/actions";
import type { ContactError } from "@/services/contacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Longueurs maximales par champ, fournies par la page serveur (le service en est la source).
export type ContactLimits = Record<keyof ContactFormValues, number>;

function message(field: keyof ContactFormValues, error: ContactError | undefined, limits: ContactLimits) {
  if (!error) return undefined;
  if (error === "required") return "Le nom est obligatoire.";
  if (error === "too_long") return `${limits[field]} caractères au plus.`;
  return field === "email" ? "Le format de l’e-mail n’est pas valide." : "Cette valeur n’est pas valide.";
}

const initialState: ContactFormState = { values: { name: "", company: "", email: "", phone: "" } };

function Field({
  name,
  label,
  defaultValue,
  error,
  ...props
}: {
  name: keyof ContactFormValues;
  label: string;
  defaultValue: string;
  error?: string;
} & React.ComponentProps<typeof Input>) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${name}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function ContactForm({ limits }: { limits: ContactLimits }) {
  const [state, formAction, pending] = useActionState(addContact, initialState);
  const { values, errors } = state;
  const error = (field: keyof ContactFormValues) => message(field, errors?.[field], limits);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-5">
      <Field name="name" label="Nom" defaultValue={values.name} error={error("name")} />
      <Field name="company" label="Entreprise (facultatif)" defaultValue={values.company} error={error("company")} />
      <Field
        name="email"
        label="E-mail (facultatif)"
        type="email"
        defaultValue={values.email}
        error={error("email")}
      />
      <Field name="phone" label="Téléphone (facultatif)" type="tel" defaultValue={values.phone} error={error("phone")} />

      {state.duplicate ? (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-border bg-muted p-4">
          <p className="text-sm">
            Un contact nommé « {values.name.trim()} » existe déjà. L’ajouter quand même ?
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" name="confirmDuplicate" value="1" disabled={pending}>
              Ajouter quand même
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            Ajouter le contact
          </Button>
        </div>
      )}
    </form>
  );
}
