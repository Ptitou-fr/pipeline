// Couche présentation : le menu latéral, sur toutes les pages (lot 6). À la largeur d'un téléphone,
// il passe au-dessus du contenu. Les nombres et la vue active dépendent de la requête : ils sont lus
// dans un <Suspense>, le reste du menu est prérendu.
import { Columns3 } from "lucide-react";
import { connection } from "next/server";
import { Suspense } from "react";
import { CurrentSidebarNav, SidebarNav } from "@/components/sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { countViews, localToday } from "@/services/contacts";

async function CountedNav() {
  await connection();
  const result = await countViews(localToday());
  return <CurrentSidebarNav counts={result.status === "ok" ? result : undefined} />;
}

export function AppSidebar() {
  return (
    <aside className="flex w-full shrink-0 flex-col gap-6 border-b border-sidebar-border bg-sidebar px-4 py-6 text-sidebar-foreground md:sticky md:top-0 md:h-svh md:w-62 md:border-r md:border-b-0">
      <div className="flex items-center gap-2.5 px-1.5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Columns3 aria-hidden="true" className="size-5" />
        </span>
        <span className="text-lg font-bold tracking-tight">Pipeline</span>
      </div>
      <Suspense fallback={<SidebarNav />}>
        <CountedNav />
      </Suspense>
      <div className="flex flex-col gap-2 md:mt-auto">
        <span className="px-1.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">Apparence</span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
