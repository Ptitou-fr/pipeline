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
          { id: 1, name: "Alice Martin", company: "Acme", email: "alice@acme.fr", phone: "06 12 34 56 78" },
          { id: 2, name: "Bob", company: null, email: null, phone: null },
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
          { id: 1, name: "Alice", company: null, email: null, phone: null },
          { id: 2, name: "Bob", company: null, email: null, phone: null },
        ]}
      />,
    );

    expect(html).toContain('href="/contacts/1/edit"');
    expect(html).toContain('href="/contacts/2/edit"');
    expect(html.match(/Modifier/g)).toHaveLength(2);
  });
});
