import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  insertContact,
  findAllContacts,
  findContactById,
  updateContact as updateContactRecord,
  type ContactRecord,
} from "@/data/contacts";
import { createContact, getContact, listContacts, updateContact } from "@/services/contacts";

// On teste les règles, pas la base : la couche données est simulée.
vi.mock("@/data/contacts", () => ({
  insertContact: vi.fn(),
  findAllContacts: vi.fn(),
  findContactById: vi.fn(),
  updateContact: vi.fn(),
}));

const record = (id: number, name: string): ContactRecord => ({ id, name, company: null, email: null, phone: null });

beforeEach(() => {
  vi.mocked(insertContact).mockReset();
  vi.mocked(insertContact).mockImplementation((fields) => ({ id: 1, ...fields }));
  vi.mocked(findAllContacts).mockReset();
  vi.mocked(findAllContacts).mockReturnValue([]);
  vi.mocked(findContactById).mockReset();
  vi.mocked(findContactById).mockReturnValue(null);
  vi.mocked(updateContactRecord).mockReset();
  vi.mocked(updateContactRecord).mockImplementation((id, fields) => ({ id, ...fields }));
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

    const result = createContact({ name: "Dupont" }, { confirmDuplicate: "1" });

    expect(result.status).toBe("created");
    expect(insertContact).toHaveBeenCalledOnce();
  });

  // La confirmation vient brute du formulaire : seule la valeur "1" confirme.
  it.each([true, 1, "oui", "", null, ["1"]])("ne confirme pas le doublon pour une valeur invalide (%j)", (confirmDuplicate) => {
    vi.mocked(findAllContacts).mockReturnValue([record(7, "Dupont")]);

    expect(createContact({ name: "Dupont" }, { confirmDuplicate })).toEqual({ status: "duplicate" });
    expect(insertContact).not.toHaveBeenCalled();
  });

  it("valide avant de chercher un doublon", () => {
    vi.mocked(findAllContacts).mockReturnValue([record(7, "Dupont")]);

    expect(createContact({ name: "Dupont", email: "x" })).toEqual({ status: "invalid", errors: { email: "invalid" } });
  });
});

describe("getContact", () => {
  it("renvoie le contact demandé, l'id venant de l'URL sous forme de texte", () => {
    const alice = record(3, "Alice");
    vi.mocked(findContactById).mockReturnValue(alice);

    expect(getContact("3")).toEqual(alice);
    expect(findContactById).toHaveBeenCalledWith(3);
  });

  it.each(["12345678901234567890", "9".repeat(400)])("renvoie null pour un id trop long (%s), sans interroger la base", (id) => {
    expect(getContact(id)).toBeNull();
    expect(findContactById).not.toHaveBeenCalled();
  });

  it("renvoie null pour un contact inconnu", () => {
    expect(getContact("99")).toBeNull();
  });

  it.each(["abc", "-1", "0", "1.5", "", undefined])("renvoie null pour un id invalide (%j), sans interroger la base", (id) => {
    expect(getContact(id)).toBeNull();
    expect(findContactById).not.toHaveBeenCalled();
  });
});

describe("updateContact", () => {
  beforeEach(() => {
    vi.mocked(findContactById).mockImplementation((id) => (id === 3 ? record(3, "Alice") : null));
  });

  it("enregistre une modification valide avec ses valeurs nettoyées", () => {
    const result = updateContact("3", { name: " Alice Martin ", company: " Acme ", email: "", phone: " 06 12 " });

    expect(updateContactRecord).toHaveBeenCalledWith(3, { name: "Alice Martin", company: "Acme", email: null, phone: "06 12" });
    expect(result).toEqual({ status: "updated", contact: { id: 3, name: "Alice Martin", company: "Acme", email: null, phone: "06 12" } });
  });

  it.each(["", "   "])("refuse un nom vidé (%j) et n'enregistre rien", (name) => {
    expect(updateContact("3", { name })).toEqual({ status: "invalid", errors: { name: "required" } });
    expect(updateContactRecord).not.toHaveBeenCalled();
  });

  it("refuse un nom absent et n'enregistre rien", () => {
    expect(updateContact("3", {})).toEqual({ status: "invalid", errors: { name: "required" } });
    expect(updateContactRecord).not.toHaveBeenCalled();
  });

  it.each([
    ["name", 42],
    ["company", new File(["x"], "x.txt")],
    ["email", ["a@b.fr"]],
    ["phone", { n: 1 }],
  ])("refuse une valeur non textuelle pour %s et n'enregistre rien", (field, value) => {
    expect(updateContact("3", { name: "Alice", [field]: value })).toEqual({ status: "invalid", errors: { [field]: "invalid" } });
    expect(updateContactRecord).not.toHaveBeenCalled();
  });

  it.each([
    ["name", "n".repeat(101)],
    ["company", "c".repeat(101)],
  ])("refuse %s trop long et n'enregistre rien", (field, value) => {
    expect(updateContact("3", { name: "Alice", [field]: value })).toEqual({ status: "invalid", errors: { [field]: "too_long" } });
    expect(updateContactRecord).not.toHaveBeenCalled();
  });

  it.each([undefined, "", "12345678901234567890"])("signale un id absent ou trop long (%j) sans interroger la base", (id) => {
    expect(updateContact(id, { name: "Alice" })).toEqual({ status: "not_found" });
    expect(findContactById).not.toHaveBeenCalled();
    expect(updateContactRecord).not.toHaveBeenCalled();
  });

  it("ne confirme pas le doublon pour une valeur invalide", () => {
    vi.mocked(findAllContacts).mockReturnValue([record(3, "Alice"), record(7, "Dupont")]);

    expect(updateContact("3", { name: "Dupont" }, { confirmDuplicate: true })).toEqual({ status: "duplicate" });
    expect(updateContactRecord).not.toHaveBeenCalled();
  });

  it("applique la même validation qu'à l'ajout", () => {
    expect(updateContact("3", { name: "Alice", email: "pas-un-mail", phone: "0".repeat(31) })).toEqual({
      status: "invalid",
      errors: { email: "invalid", phone: "too_long" },
    });
    expect(updateContactRecord).not.toHaveBeenCalled();
  });

  it.each(["99", "abc"])("signale un contact introuvable (%j) et n'enregistre rien", (id) => {
    expect(updateContact(id, { name: "Alice" })).toEqual({ status: "not_found" });
    expect(updateContactRecord).not.toHaveBeenCalled();
  });

  it("demande confirmation pour le nom d'un autre contact", () => {
    vi.mocked(findAllContacts).mockReturnValue([record(3, "Alice"), record(7, "Dupont")]);

    expect(updateContact("3", { name: "dupont" })).toEqual({ status: "duplicate" });
    expect(updateContactRecord).not.toHaveBeenCalled();
  });

  it("enregistre le doublon une fois confirmé", () => {
    vi.mocked(findAllContacts).mockReturnValue([record(3, "Alice"), record(7, "Dupont")]);

    expect(updateContact("3", { name: "Dupont" }, { confirmDuplicate: "1" }).status).toBe("updated");
    expect(updateContactRecord).toHaveBeenCalledOnce();
  });

  it("ne compte pas le contact lui-même comme un doublon", () => {
    vi.mocked(findAllContacts).mockReturnValue([record(3, "Alice")]);

    expect(updateContact("3", { name: "ALICE", company: "Acme" }).status).toBe("updated");
  });
});
