// Couche présentation : affiche la liste reçue, dans l'ordre donné par le service.
import type { Contact } from "@/services/contacts";

export function ContactList({ contacts }: { contacts: Contact[] }) {
  if (contacts.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
        Aucun contact pour l’instant.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {contacts.map((contact) => (
        <li
          key={contact.id}
          className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4 text-card-foreground"
        >
          <span className="font-bold">{contact.name}</span>
          {contact.company && <span className="text-sm text-muted-foreground">{contact.company}</span>}
          {(contact.email || contact.phone) && (
            <span className="flex flex-wrap gap-x-4 font-mono text-xs text-muted-foreground">
              {contact.email && <span>{contact.email}</span>}
              {contact.phone && <span>{contact.phone}</span>}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
