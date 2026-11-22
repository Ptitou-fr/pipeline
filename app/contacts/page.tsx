// Route /contacts : la liste de mes contacts (lot 6 : déménagée depuis /), filtrée par ?q=…, lue à chaque requête (searchParams = donnée de requête,
// lue dans un <Suspense>). Le texte brut va au service, qui le valide et filtre.
import { Suspense } from "react";
import { ContactList } from "@/components/contact-list";
import { SearchField } from "@/components/search-field";
import { SEARCH_MAX_LENGTH, searchContacts } from "@/services/contacts";

const SEARCH_ERRORS = {
  invalid: "Cette recherche n’est pas valide.",
  too_long: `${SEARCH_MAX_LENGTH} caractères au plus.`,
};

async function Contacts({ searchParams }: { searchParams: PageProps<"/contacts">["searchParams"] }) {
  const { q } = await searchParams;
  const result = await searchContacts(q);
  // Réaffichage seulement : le champ montre ce qui a été tapé.
  const typed = typeof q === "string" ? q : "";

  return (
    <>
      <SearchField defaultValue={typed} error={result.status === "invalid" ? SEARCH_ERRORS[result.error] : undefined} />
      {result.status === "ok" && <ContactList contacts={result.contacts} query={result.query} />}
    </>
  );
}

export default function ContactsPage({ searchParams }: PageProps<"/contacts">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
        <p className="text-muted-foreground">Triés par nom. La recherche porte sur le nom et l’entreprise.</p>
      </header>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <Contacts searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
