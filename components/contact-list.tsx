// Couche présentation : affiche la liste reçue, dans l'ordre donné par le service.
import Link from "next/link";
import type { Contact } from "@/services/contacts";
import { StageSelect } from "@/components/stage-select";
import { Button } from "@/components/ui/button";

// AAAA-MM-JJ → JJ/MM/AAAA, pour l'affichage.
const frenchDate = (date: string) => date.split("-").reverse().join("/");

// `query` : le texte de la recherche en cours, tel que renvoyé par le service (vide sans recherche).
// `emptyMessage` : message d'une liste vide propre à la page (ex. la vue « À relancer »).
export function ContactList({ contacts, query = "", emptyMessage }: { contacts: Contact[]; query?: string; emptyMessage?: string }) {
  if (contacts.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
        {query ? `Aucun résultat pour « ${query} ».` : (emptyMessage ?? "Aucun contact pour l’instant.")}
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {contacts.map((contact) => (
        <li
          key={contact.id}
          className="flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4 text-card-foreground"
        >
          <div className="flex min-w-0 flex-col gap-1">
            <span className="font-bold">{contact.name}</span>
            {contact.company && <span className="text-sm text-muted-foreground">{contact.company}</span>}
            {(contact.email || contact.phone) && (
              <span className="flex flex-wrap gap-x-4 font-mono text-xs text-muted-foreground">
                {contact.email && <span>{contact.email}</span>}
                {contact.phone && <span>{contact.phone}</span>}
              </span>
            )}
            {contact.followUpDate && (
              <span className="text-xs font-medium text-primary">Relance le {frenchDate(contact.followUpDate)}</span>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <StageSelect contactId={contact.id} contactName={contact.name} stage={contact.stage} />
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/contacts/${contact.id}/edit`} />}>
              Modifier
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
