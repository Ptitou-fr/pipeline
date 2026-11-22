import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SearchField } from "@/components/search-field";

describe("components/search-field", () => {
  it("envoie le texte cherché dans le paramètre q de la vue Contacts", () => {
    const html = renderToStaticMarkup(<SearchField defaultValue="" />);

    expect(html).toMatch(/<form[^>]*action="\/contacts"/);
    expect(html).toMatch(/<input[^>]*name="q"/);
  });

  it("garde le texte en cours de recherche", () => {
    const html = renderToStaticMarkup(<SearchField defaultValue="dup" />);

    expect(html).toContain('value="dup"');
  });

  it("affiche l'erreur renvoyée par le service", () => {
    const html = renderToStaticMarkup(<SearchField defaultValue="" error="Recherche trop longue." />);

    expect(html).toContain("Recherche trop longue.");
  });
});
