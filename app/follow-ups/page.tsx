// Route /follow-ups : la vue « À relancer » (lot 5), calculée à chaque requête pour la date du jour
// locale de la machine (connection() : rien de figé au prérendu).
import { connection } from "next/server";
import { Suspense } from "react";
import { ContactList } from "@/components/contact-list";
import { listFollowUps, localToday } from "@/services/contacts";

async function FollowUps() {
  await connection();
  const result = listFollowUps(localToday());
  if (result.status === "invalid") {
    return <p className="text-destructive">La date du jour n’a pas pu être déterminée.</p>;
  }
  return <ContactList contacts={result.contacts} emptyMessage="Personne à relancer aujourd’hui." />;
}

export default function FollowUpsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">À relancer</h1>
        <p className="text-muted-foreground">Date de relance aujourd’hui ou passée, hors contacts gagnés ou perdus.</p>
      </header>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <FollowUps />
      </Suspense>
    </main>
  );
}
