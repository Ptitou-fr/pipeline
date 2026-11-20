import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ContactForm, contactErrorMessage } from "@/components/contact-form";

const limits = { name: 100, company: 100, email: 254, phone: 30 };
const action = vi.fn(async (prev) => prev);
const alice = { name: "Alice Martin", company: "Acme", email: "alice@acme.fr", phone: "06 12 34 56 78" };

describe("components/contact-form", () => {
  it("montre les valeurs actuelles du contact en modification", () => {
    const html = renderToStaticMarkup(
      <ContactForm action={action} limits={limits} initialValues={alice} submitLabel="Enregistrer" cancelHref="/" />,
    );

    for (const value of Object.values(alice)) {
      expect(html).toContain(`value="${value}"`);
    }
    expect(html).toContain("Enregistrer");
  });

  it("propose d'annuler par un lien vers la liste, qui n'envoie pas le formulaire", () => {
    const html = renderToStaticMarkup(
      <ContactForm action={action} limits={limits} initialValues={alice} submitLabel="Enregistrer" cancelHref="/" />,
    );

    expect(html).toMatch(/<a[^>]*href="\/"[^>]*>Annuler<\/a>/);
    expect(html.match(/type="submit"/g)).toHaveLength(1);
    expect(action).not.toHaveBeenCalled();
  });

  it("démarre vide et sans « Annuler » pour un ajout", () => {
    const html = renderToStaticMarkup(<ContactForm action={action} limits={limits} submitLabel="Ajouter le contact" />);

    expect(html).not.toContain("Annuler");
    expect(html).not.toMatch(/value="[^"]+"/);
  });
});

describe("contactErrorMessage", () => {
  it("dit ce qui manque quand le nom est vidé", () => {
    expect(contactErrorMessage("name", "required", limits)).toBe("Le nom est obligatoire.");
  });

  it("donne la longueur maximale du champ", () => {
    expect(contactErrorMessage("phone", "too_long", limits)).toBe("30 caractères au plus.");
  });

  it("signale un e-mail mal formé", () => {
    expect(contactErrorMessage("email", "invalid", limits)).toBe("Le format de l’e-mail n’est pas valide.");
  });

  it("ne dit rien sans erreur", () => {
    expect(contactErrorMessage("name", undefined, limits)).toBeUndefined();
  });
});
