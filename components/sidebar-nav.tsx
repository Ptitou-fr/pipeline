"use client";
// Couche présentation : les entrées du menu latéral (lot 6), avec le nombre de contacts de chaque vue.
// `SidebarNav` n'utilise aucun hook : il sert aussi de repli pendant le prérendu, quand la page en cours
// et les nombres ne sont pas encore connus.
import { Clock, Columns3, Plus, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

export type ViewCounts = { contacts: number; followUps: number };

const VIEWS = [
  { href: "/", label: "Pipeline", Icon: Columns3, count: (c: ViewCounts) => c.contacts },
  { href: "/contacts", label: "Contacts", Icon: Users, count: (c: ViewCounts) => c.contacts },
  { href: "/follow-ups", label: "À relancer", Icon: Clock, count: (c: ViewCounts) => c.followUps },
] as const;

// Une vue est active sur sa page et sur les pages qu'elle contient (/contacts/12/edit → Contacts).
const isActive = (href: string, pathname: string) => pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

export function SidebarNav({ pathname, counts }: { pathname?: string; counts?: ViewCounts }) {
  return (
    <div className="flex flex-col gap-6">
      <Button size="lg" nativeButton={false} render={<Link href="/contacts/new" />}>
        <Plus aria-hidden="true" />
        Ajouter un contact
      </Button>
      <nav aria-label="Vues" className="flex flex-col gap-1">
        <span className="px-3.5 pb-1 text-xs font-bold tracking-wide text-muted-foreground uppercase">Vues</span>
        {VIEWS.map(({ href, label, Icon, count }) => {
          const active = pathname !== undefined && isActive(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className="flex min-h-11 items-center gap-3 rounded-lg px-3.5 text-sm font-semibold text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground"
            >
              <Icon aria-hidden="true" className="size-4.5 shrink-0" />
              <span>{label}</span>
              {counts && (
                <span className="ml-auto rounded-full border border-border bg-card px-2 py-0.5 font-mono text-xs font-medium">
                  {count(counts)}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function CurrentSidebarNav({ counts }: { counts?: ViewCounts }) {
  return <SidebarNav pathname={usePathname()} counts={counts} />;
}
