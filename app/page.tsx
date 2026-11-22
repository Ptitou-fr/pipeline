// Route / : la vue Pipeline (lot 6), une colonne par étape, calculée à chaque requête pour la date du
// jour locale de la machine (connection() : rien de figé au prérendu).
import { connection } from "next/server";
import { Suspense } from "react";
import { PipelineBoard } from "@/components/pipeline-board";
import { listPipeline, localToday } from "@/services/contacts";

async function Board() {
  await connection();
  const result = await listPipeline(localToday());
  if (result.status === "invalid") {
    return <p className="text-destructive">La date du jour n’a pas pu être déterminée.</p>;
  }
  return <PipelineBoard columns={result.columns} />;
}

export default function PipelinePage() {
  return (
    <main className="flex w-full min-w-0 flex-col gap-4 px-4 py-10 md:px-9">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Pipeline</h1>
        <p className="text-muted-foreground">
          Glissez une carte d’une colonne à l’autre, ou utilisez ses flèches, pour changer l’étape du contact.
        </p>
      </header>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <Board />
      </Suspense>
    </main>
  );
}
