import { beforeEach, describe, expect, it, vi } from "vitest";
import { insertContact, findAllContacts, type ContactRecord } from "@/data/contacts";
import { createContact, listContacts } from "@/services/contacts";

// On teste les règles, pas la base : la couche données est simulée.
vi.mock("@/data/contacts", () => ({
  insertContact: vi.fn(),
  findAllContacts: vi.fn(),
}));

const record = (id: number, name: string): ContactRecord => ({ id, name, company: null, email: null, phone: null });

beforeEach(() => {
  vi.mocked(insertContact).mockReset();
  vi.mocked(insertContact).mockImplementation((fields) => ({ id: 1, ...fields }));
  vi.mocked(findAllContacts).mockReset();
  vi.mocked(findAllContacts).mockReturnValue([]);
});

describe("listContacts", () => {
  it("renvoie une liste vide quand il n'y a aucun contact", () => {
    expect(listContacts()).toEqual([]);
  });

  it("trie par nom, sans tenir compte de la casse ni des accents", () => {
    vi.mocked(findAllContacts).mockReturnValue([record(1, "émile"), record(2, "Bernard"), record(3, "alice")]);

    expect(listContacts().map((c) => c.name)).toEqual(["alice", "Bernard", "émile"]);
  });
});

describe("createContact", () => {
  it("crée un contact valide avec ses valeurs nettoyées", () => {
    const result = createContact({ name: "  Alice  ", company: " Acme ", email: " alice@acme.fr ", phone: " 06 12 " });

    expect(insertContact).toHaveBeenCalledWith({ name: "Alice", company: "Acme", email: "alice@acme.fr", phone: "06 12" });
    expect(result).toEqual({ status: "created", contact: { id: 1, name: "Alice", company: "Acme", email: "alice@acme.fr", phone: "06 12" } });
  });

  it("enregistre les champs facultatifs vides à null", () => {
    createContact({ name: "Bob", company: "", email: "  ", phone: "" });

    expect(insertContact).toHaveBeenCalledWith({ name: "Bob", company: null, email: null, phone: null });
  });

  it.each(["", "   "])("refuse un nom vide (%j) et ne crée rien", (name) => {
    expect(createContact({ name })).toEqual({ status: "invalid", errors: { name: "required" } });
    expect(insertContact).not.toHaveBeenCalled();
  });

  it.each(["pas-un-mail", "a@b", "a b@c.fr", "@acme.fr"])("refuse un e-mail mal formé (%j) et ne crée rien", (email) => {
    expect(createContact({ name: "Alice", email })).toEqual({ status: "invalid", errors: { email: "invalid" } });
    expect(insertContact).not.toHaveBeenCalled();
  });

  it("signale les deux erreurs à la fois", () => {
    expect(createContact({ name: "", email: "x" })).toEqual({ status: "invalid", errors: { name: "required", email: "invalid" } });
  });

  it("refuse un nom absent", () => {
    expect(createContact({})).toEqual({ status: "invalid", errors: { name: "required" } });
    expect(insertContact).not.toHaveBeenCalled();
  });

  it.each([
    ["name", 42],
    ["company", new File(["x"], "x.txt")],
    ["email", ["a@b.fr"]],
    ["phone", { n: 1 }],
  ])("refuse une valeur non textuelle pour %s et ne crée rien", (field, value) => {
    expect(createContact({ name: "Alice", [field]: value })).toEqual({ status: "invalid", errors: { [field]: "invalid" } });
    expect(insertContact).not.toHaveBeenCalled();
  });

  // Limites : nom 100, entreprise 100, e-mail 254, téléphone 30 caractères, comptés après trim.
  const email = (length: number) => `${"a".repeat(length - "@acme.fr".length)}@acme.fr`;

  it.each([
    ["name", "n".repeat(100)],
    ["company", "c".repeat(100)],
    ["email", email(254)],
    ["phone", "0".repeat(30)],
  ])("accepte %s à sa longueur maximale", (field, value) => {
    expect(createContact({ name: "Alice", [field]: value }).status).toBe("created");
  });

  it.each([
    ["name", "n".repeat(101)],
    ["company", "c".repeat(101)],
    ["email", email(255)],
    ["phone", "0".repeat(31)],
  ])("refuse %s trop long et ne crée rien", (field, value) => {
    expect(createContact({ name: "Alice", [field]: value })).toEqual({ status: "invalid", errors: { [field]: "too_long" } });
    expect(insertContact).not.toHaveBeenCalled();
  });

  it("compte la longueur après avoir retiré les espaces autour", () => {
    expect(createContact({ name: `  ${"n".repeat(100)}  ` }).status).toBe("created");
  });

  it("demande confirmation pour un nom déjà pris, sans tenir compte de la casse, des accents ni des espaces", () => {
    vi.mocked(findAllContacts).mockReturnValue([record(7, "Émile Dupont")]);

    expect(createContact({ name: "  emile DUPONT " })).toEqual({ status: "duplicate" });
    expect(insertContact).not.toHaveBeenCalled();
  });

  it("crée le doublon une fois confirmé", () => {
    vi.mocked(findAllContacts).mockReturnValue([record(7, "Dupont")]);

    const result = createContact({ name: "Dupont" }, { confirmDuplicate: true });

    expect(result.status).toBe("created");
    expect(insertContact).toHaveBeenCalledOnce();
  });

  it("valide avant de chercher un doublon", () => {
    vi.mocked(findAllContacts).mockReturnValue([record(7, "Dupont")]);

    expect(createContact({ name: "Dupont", email: "x" })).toEqual({ status: "invalid", errors: { email: "invalid" } });
  });
});
