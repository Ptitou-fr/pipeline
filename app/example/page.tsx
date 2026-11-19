// Route /example : montre l'exemple vide qui traverse les trois couches,
// habillé avec le design system Menthe (utilitaires Tailwind issus des tokens shadcn).
// Rendu en clair et en sombre côte à côte : `.dark` sur un conteneur redéfinit les tokens de son sous-arbre.
import { Example } from "@/components/example";

function Preview({ dark = false }: { dark?: boolean }) {
  return (
    <section
      className={`${dark ? "dark " : ""}flex flex-col gap-6 rounded-2xl border border-border bg-background p-6 text-foreground`}
    >
      <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
        {dark ? "Sombre" : "Clair"}
      </p>

      <article className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 text-card-foreground">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-10 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground"
          >
            Ex
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-bold tracking-tight">Exemple</h2>
            <span className="w-fit rounded-full bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
              données → service → présentation
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span aria-hidden="true" className="size-2 rounded-full bg-primary" />
          <Example />
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="h-9 rounded-full border border-input px-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            Secondaire
          </button>
          <button
            type="button"
            className="h-9 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground hover:brightness-110"
          >
            Principal
          </button>
        </div>
      </article>
    </section>
  );
}

export default function ExamplePage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Exemple</h1>
        <p className="text-muted-foreground">
          Valeur lue dans la couche données, relayée par le service, affichée ici.
        </p>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        <Preview />
        <Preview dark />
      </div>
    </main>
  );
}
