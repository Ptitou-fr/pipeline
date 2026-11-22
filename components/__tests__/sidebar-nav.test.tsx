import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SidebarNav } from "@/components/sidebar-nav";

// La page en cours est passée directement : `usePathname` n'est lu que par le composant qui l'enveloppe.
const link = (html: string, href: string) => html.match(new RegExp(`<a[^>]*href="${href}"[^>]*>[\\s\\S]*?</a>`))?.[0] ?? "";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

describe("SidebarNav : le menu latéral (lot 6)", () => {
  it("mène aux trois vues et à l'ajout d'un contact", () => {
    const html = renderToStaticMarkup(<SidebarNav pathname="/" />);

    expect(link(html, "/")).toContain("Pipeline");
    expect(link(html, "/contacts")).toContain("Contacts");
    expect(link(html, "/follow-ups")).toContain("À relancer");
    expect(link(html, "/contacts/new")).toContain("Ajouter un contact");
  });

  it.each([
    ["/", "/"],
    ["/contacts", "/contacts"],
    ["/contacts/12/edit", "/contacts"],
    ["/follow-ups", "/follow-ups"],
  ])("marque comme active la vue en cours (%s)", (pathname, active) => {
    const html = renderToStaticMarkup(<SidebarNav pathname={pathname} />);

    for (const href of ["/", "/contacts", "/follow-ups"]) {
      const current = link(html, href).includes('aria-current="page"');
      expect(current, href).toBe(href === active);
    }
  });

  it("n'en marque aucune avant de connaître la page", () => {
    const html = renderToStaticMarkup(<SidebarNav />);

    expect(html).not.toContain("aria-current");
  });

  it("affiche le nombre de contacts de chaque vue", () => {
    const html = renderToStaticMarkup(<SidebarNav pathname="/" counts={{ contacts: 7, followUps: 2 }} />);

    expect(link(html, "/")).toMatch(/>7</);
    expect(link(html, "/contacts")).toMatch(/>7</);
    expect(link(html, "/follow-ups")).toMatch(/>2</);
  });
});
