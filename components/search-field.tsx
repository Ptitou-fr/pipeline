"use client";
// Couche présentation : champ de recherche au-dessus de la liste. Chaque frappe relance la liste
// avec ?q=… (le texte brut) ; c'est le service qui valide et filtre.
import Form from "next/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SearchField({ defaultValue, error }: { defaultValue: string; error?: string }) {
  return (
    <Form action="/" replace role="search" className="flex flex-col gap-2">
      <Label htmlFor="q" className="sr-only">
        Rechercher un contact
      </Label>
      <Input
        id="q"
        name="q"
        type="search"
        autoComplete="off"
        placeholder="Rechercher par nom ou entreprise"
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? "q-error" : undefined}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      />
      {error && (
        <p id="q-error" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </Form>
  );
}
