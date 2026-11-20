import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ContactList } from "@/components/contact-list";

describe("components/contact-list", () => {
  it("affiche un état vide quand il n'y a aucun contact", () => {
    const html = renderToStaticMarkup(<ContactList contacts={[]} />);

    expect(html).toContain("Aucun contact pour l’instant");
  });

  it("affiche chaque contact avec ses champs renseignés, dans l'ordre reçu", () => {
    const html = renderToStaticMarkup(
      <ContactList
        contacts={[
          { id: 1, name: "Alice Martin", company: "Acme", email: "alice@acme.fr", phone: "06 12 34 56 78", stage: "to_contact", followUpDate: null },
          { id: 2, name: "Bob", company: null, email: null, phone: null, stage: "to_contact", followUpDate: null },
        ]}
      />,
    );

    expect(html).not.toContain("Aucun contact");
    for (const text of ["Alice Martin", "Acme", "alice@acme.fr", "06 12 34 56 78", "Bob"]) {
      expect(html).toContain(text);
    }
    expect(html.indexOf("Alice Martin")).toBeLessThan(html.indexOf("Bob"));
  });

  it("propose de modifier chaque contact", () => {
    const html = renderToStaticMarkup(
      <ContactList
        contacts={[
          { id: 1, name: "Alice", company: null, email: null, phone: null, stage: "to_contact", followUpDate: null },
          { id: 2, name: "Bob", company: null, email: null, phone: null, stage: "to_contact", followUpDate: null },
        ]}
      />,
    );

    expect(html).toContain('href="/contacts/1/edit"');
    expect(html).toContain('href="/contacts/2/edit"');
    expect(html.match(/Modifier/g)).toHaveLength(2);
  });

  it("affiche « aucun résultat » quand une recherche ne trouve rien", () => {
    const html = renderToStaticMarkup(<ContactList contacts={[]} query="zzz" />);

    expect(html).toContain("Aucun résultat pour « zzz »");
    expect(html).not.toContain("Aucun contact pour l’instant");
  });

  it("affiche l'étape de chaque contact dans un sélecteur nommé", () => {
    const html = renderToStaticMarkup(
      <ContactList
        contacts={[
          { id: 1, name: "Alice", company: null, email: null, phone: null, stage: "contacted", followUpDate: null },
          { id: 2, name: "Bob", company: null, email: null, phone: null, stage: "won", followUpDate: null },
        ]}
      />,
    );

    expect(html).toContain('aria-label="Étape de Alice"');
    expect(html).toContain("Contacté");
    expect(html).toContain('aria-label="Étape de Bob"');
    expect(html).toContain("Gagné");
  });

  it("affiche la date de prochaine relance quand elle est renseignée", () => {
    const html = renderToStaticMarkup(
      <ContactList contacts={[{ id: 1, name: "Alice", company: null, email: null, phone: null, stage: "to_contact", followUpDate: "2026-12-01" }]} />,
    );

    expect(html).toContain("Relance le 01/12/2026");
  });

  it("affiche le message vide fourni par la page", () => {
    const html = renderToStaticMarkup(<ContactList contacts={[]} emptyMessage="Personne à relancer aujourd’hui." />);

    expect(html).toContain("Personne à relancer aujourd’hui.");
  });
});
