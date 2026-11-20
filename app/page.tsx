// Route / : la liste de mes contacts, lue à chaque requête (base SQLite synchrone, hors prérendu).
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ContactList } from "@/components/contact-list";
import { Button } from "@/components/ui/button";
import { listContacts } from "@/services/contacts";

async function Contacts() {
  await connection();
  return <ContactList contacts={listContacts()} />;
}

export default function ContactsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Mes contacts</h1>
        <Button nativeButton={false} render={<Link href="/contacts/new" />}>
          Ajouter un contact
        </Button>
      </header>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <Contacts />
      </Suspense>
    </main>
  );
}
