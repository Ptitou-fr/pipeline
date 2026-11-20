// Couche présentation : affiche la liste reçue, dans l'ordre donné par le service.
import Link from "next/link";
import type { Contact } from "@/services/contacts";
import { Button } from "@/components/ui/button";

// `query` : le texte de la recherche en cours, tel que renvoyé par le service (vide sans recherche).
export function ContactList({ contacts, query = "" }: { contacts: Contact[]; query?: string }) {
  if (contacts.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
        {query ? `Aucun résultat pour « ${query} ».` : "Aucun contact pour l’instant."}
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
          </div>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/contacts/${contact.id}/edit`} />}>
            Modifier
          </Button>
        </li>
      ))}
    </ul>
  );
}
