"use client";
// Couche présentation : formulaire d'ajout et de modification. La validation et les doublons sont décidés par le service.
import Link from "next/link";
import { useActionState } from "react";
import type { ContactFormAction, ContactFormValues } from "@/app/actions";
import type { ContactError } from "@/services/contacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Longueurs maximales par champ, fournies par la page serveur (le service en est la source).
export type ContactLimits = Record<keyof ContactFormValues, number>;

export function contactErrorMessage(field: keyof ContactFormValues, error: ContactError | undefined, limits: ContactLimits) {
  if (!error) return undefined;
  if (error === "required") return "Le nom est obligatoire.";
  if (error === "too_long") return `${limits[field]} caractères au plus.`;
  if (field === "email") return "Le format de l’e-mail n’est pas valide.";
  if (field === "followUpDate") return "Cette date n’est pas valide.";
  return "Cette valeur n’est pas valide.";
}

const EMPTY: ContactFormValues = { name: "", company: "", email: "", phone: "", followUpDate: "" };

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

type ContactFormProps = {
  action: ContactFormAction;
  limits: ContactLimits;
  submitLabel: string;
  // Valeurs de départ : vides pour un ajout, celles du contact pour une modification.
  initialValues?: ContactFormValues;
  // Lien « Annuler » (modification) : quitte le formulaire sans l'envoyer.
  cancelHref?: string;
};

export function ContactForm({ action, limits, submitLabel, initialValues = EMPTY, cancelHref }: ContactFormProps) {
  const [state, formAction, pending] = useActionState(action, { values: initialValues });
  const { values, errors } = state;
  const error = (field: keyof ContactFormValues) => contactErrorMessage(field, errors?.[field], limits);
  const cancel = cancelHref && (
    <Button variant="outline" nativeButton={false} render={<Link href={cancelHref} />}>
      Annuler
    </Button>
  );

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
      <Field
        name="followUpDate"
        label="Prochaine relance (facultatif)"
        type="date"
        defaultValue={values.followUpDate}
        error={error("followUpDate")}
      />

      {state.duplicate ? (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-border bg-muted p-4">
          <p className="text-sm">
            Un contact nommé « {values.name.trim()} » existe déjà. Continuer quand même ?
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" name="confirmDuplicate" value="1" disabled={pending}>
              {submitLabel} quand même
            </Button>
            {cancel}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap justify-end gap-2">
          {cancel}
          <Button type="submit" disabled={pending}>
            {submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
}
