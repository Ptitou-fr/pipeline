import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  insertContact,
  findAllContacts,
  findContactById,
  updateContact as updateContactRecord,
  updateContactStage,
  type ContactRecord,
} from "@/data/contacts";
import {
  changeStage,
  createContact,
  getContact,
  listContacts,
  listFollowUps,
  localToday,
  searchContacts,
  updateContact,
} from "@/services/contacts";

// On teste les règles, pas la base : la couche données est simulée.
vi.mock("@/data/contacts", () => ({
  insertContact: vi.fn(),
  findAllContacts: vi.fn(),
  findContactById: vi.fn(),
  updateContact: vi.fn(),
  updateContactStage: vi.fn(),
}));

const record = (id: number, name: string): ContactRecord => ({ id, name, company: null, email: null, phone: null, followUpDate: null, stage: "to_contact" });

beforeEach(() => {
  vi.mocked(insertContact).mockReset();
  vi.mocked(insertContact).mockImplementation((fields) => ({ id: 1, ...fields }));
  vi.mocked(findAllContacts).mockReset();
  vi.mocked(findAllContacts).mockReturnValue([]);
  vi.mocked(findContactById).mockReset();
  vi.mocked(findContactById).mockReturnValue(null);
  vi.mocked(updateContactRecord).mockReset();
  vi.mocked(updateContactRecord).mockImplementation((id, fields) => ({ id, ...fields, stage: "to_contact" }));
  vi.mocked(updateContactStage).mockReset();
  vi.mocked(updateContactStage).mockImplementation((id, stage) => ({ ...record(id, "Alice"), stage }));
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

    expect(insertContact).toHaveBeenCalledWith({ name: "Alice", company: "Acme", email: "alice@acme.fr", phone: "06 12", followUpDate: null, stage: "to_contact" });
    expect(result).toEqual({
      status: "created",
      contact: { id: 1, name: "Alice", company: "Acme", email: "alice@acme.fr", phone: "06 12", followUpDate: null, stage: "to_contact" },
    });
  });

  it("enregistre les champs facultatifs vides à null", () => {
    createContact({ name: "Bob", company: "", email: "  ", phone: "" });

    expect(insertContact).toHaveBeenCalledWith({ name: "Bob", company: null, email: null, phone: null, followUpDate: null, stage: "to_contact" });
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

    expect(updateContactRecord).toHaveBeenCalledWith(3, { name: "Alice Martin", company: "Acme", email: null, phone: "06 12", followUpDate: null });
    expect(result).toEqual({
      status: "updated",
      contact: { id: 3, name: "Alice Martin", company: "Acme", email: null, phone: "06 12", followUpDate: null, stage: "to_contact" },
    });
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

describe("searchContacts", () => {
  const contacts = [
    record(1, "Martin"),
    { ...record(2, "Éts Dupuis"), company: "Bâtiment" },
    record(3, "Dupont"),
    { ...record(4, "Bernard"), company: "Dupré SA" },
  ];
  const names = (query: unknown) => {
    const result = searchContacts(query);
    return result.status === "ok" ? result.contacts.map((c) => c.name) : result;
  };

  beforeEach(() => {
    vi.mocked(findAllContacts).mockReturnValue(contacts);
  });

  it("ne garde que les contacts dont le nom contient le texte (« dup »), triés par nom", () => {
    vi.mocked(findAllContacts).mockReturnValue([record(1, "Martin"), record(2, "Éts Dupuis"), record(3, "Dupont")]);

    expect(names("dup")).toEqual(["Dupont", "Éts Dupuis"]);
  });

  it("cherche aussi dans l'entreprise", () => {
    expect(names("dupré")).toEqual(["Bernard"]);
    expect(names("batiment")).toEqual(["Éts Dupuis"]);
  });

  it.each(["DUP", "Dup", "dûp"])("ignore les majuscules et les accents du texte cherché (%j)", (query) => {
    expect(names(query)).toEqual(names("dup"));
  });

  it.each(["ets", "ETS", "éts"])("ignore les accents du contact (%j trouve « Éts Dupuis »)", (query) => {
    expect(names(query)).toEqual(["Éts Dupuis"]);
  });

  it("renvoie une liste vide quand rien ne correspond", () => {
    expect(searchContacts("zzz")).toEqual({ status: "ok", contacts: [], query: "zzz" });
  });

  it.each([undefined, null, "", "   "])("renvoie la liste complète pour une recherche vide (%j)", (query) => {
    expect(searchContacts(query)).toEqual({ status: "ok", contacts: listContacts(), query: "" });
  });

  it("renvoie le texte cherché sans les espaces autour", () => {
    expect(searchContacts("  dup ")).toMatchObject({ status: "ok", query: "dup" });
  });

  it.each([42, ["dup"], { q: "dup" }])("refuse un texte de mauvais type (%j) sans interroger la base", (query) => {
    vi.mocked(findAllContacts).mockClear();

    expect(searchContacts(query)).toEqual({ status: "invalid", error: "invalid" });
    expect(findAllContacts).not.toHaveBeenCalled();
  });

  it("refuse un texte trop long (plus de 100 caractères) sans interroger la base", () => {
    vi.mocked(findAllContacts).mockClear();

    expect(searchContacts("d".repeat(101))).toEqual({ status: "invalid", error: "too_long" });
    expect(findAllContacts).not.toHaveBeenCalled();
    expect(searchContacts("d".repeat(100)).status).toBe("ok");
  });
});

describe("étape d'un contact (lot 4)", () => {
  beforeEach(() => {
    vi.mocked(findContactById).mockImplementation((id) => (id === 3 ? record(3, "Alice") : null));
  });

  it("fait démarrer un nouveau contact à « À contacter » (to_contact)", () => {
    const result = createContact({ name: "Alice" });

    expect(insertContact).toHaveBeenCalledWith(expect.objectContaining({ stage: "to_contact" }));
    expect(result).toMatchObject({ status: "created", contact: { stage: "to_contact" } });
  });

  it.each(["to_contact", "contacted", "in_discussion", "won", "lost"])("accepte librement l'étape %s", (stage) => {
    expect(changeStage("3", stage)).toEqual({ status: "updated", contact: { ...record(3, "Alice"), stage } });
    expect(updateContactStage).toHaveBeenCalledWith(3, stage);
  });

  it.each(["archived", "Gagné", "WON", "", 3, null, undefined, ["won"], "won".repeat(400)])(
    "refuse une étape hors des cinq (%j) sans rien enregistrer",
    (stage) => {
      expect(changeStage("3", stage)).toEqual({ status: "invalid" });
      expect(findContactById).not.toHaveBeenCalled();
      expect(updateContactStage).not.toHaveBeenCalled();
    },
  );

  it.each(["99", "abc", undefined, "12345678901234567890"])("signale un contact introuvable (%j) sans rien enregistrer", (id) => {
    expect(changeStage(id, "won")).toEqual({ status: "not_found" });
    expect(updateContactStage).not.toHaveBeenCalled();
  });
});

// Issue #11 : un contact enregistré avant le lot 4 n'a pas d'étape en base (null) ; c'est le service,
// pas la couche données, qui lui donne l'étape de départ.
describe("contact sans étape enregistrée (lot 4)", () => {
  const withoutStage = (id: number, name: string): ContactRecord => ({ ...record(id, name), stage: null });
  const won = (id: number, name: string): ContactRecord => ({ ...record(id, name), stage: "won" });

  it("listContacts lui donne l'étape de départ et garde l'étape des autres", () => {
    vi.mocked(findAllContacts).mockReturnValue([withoutStage(1, "Ancien"), won(2, "Bob")]);

    expect(listContacts().map((c) => [c.name, c.stage])).toEqual([
      ["Ancien", "to_contact"],
      ["Bob", "won"],
    ]);
  });

  it("searchContacts lui donne l'étape de départ", () => {
    vi.mocked(findAllContacts).mockReturnValue([withoutStage(1, "Ancien")]);

    expect(searchContacts("anc")).toMatchObject({ status: "ok", contacts: [{ name: "Ancien", stage: "to_contact" }] });
  });

  it("getContact lui donne l'étape de départ", () => {
    vi.mocked(findContactById).mockReturnValue(withoutStage(1, "Ancien"));

    expect(getContact("1")?.stage).toBe("to_contact");
  });

  it("updateContact renvoie le contact modifié avec l'étape de départ", () => {
    vi.mocked(findContactById).mockReturnValue(withoutStage(1, "Ancien"));
    vi.mocked(updateContactRecord).mockImplementation((id, fields) => ({ id, ...fields, stage: null }));

    expect(updateContact("1", { name: "Ancien" })).toMatchObject({ status: "updated", contact: { stage: "to_contact" } });
  });

  it("listFollowUps le garde à relancer, comme un contact à l'étape de départ", () => {
    vi.mocked(findAllContacts).mockReturnValue([{ ...withoutStage(1, "Ancien"), followUpDate: "2026-11-20" }]);

    expect(listFollowUps("2026-11-21")).toMatchObject({ status: "ok", contacts: [{ name: "Ancien", stage: "to_contact" }] });
  });
});

describe("date de prochaine relance (lot 5)", () => {
  it("enregistre une date valide, et null quand le champ est vide ou absent", () => {
    createContact({ name: "Alice", followUpDate: " 2026-12-01 " });
    createContact({ name: "Bob", followUpDate: "" });
    createContact({ name: "Carla" });

    expect(vi.mocked(insertContact).mock.calls.map(([fields]) => fields.followUpDate)).toEqual(["2026-12-01", null, null]);
  });

  it("la modifie avec les autres informations", () => {
    vi.mocked(findContactById).mockReturnValue(record(3, "Alice"));

    updateContact("3", { name: "Alice", followUpDate: "2027-01-15" });

    expect(updateContactRecord).toHaveBeenCalledWith(3, expect.objectContaining({ followUpDate: "2027-01-15" }));
  });

  it.each(["01/12/2026", "2026-13-01", "2026-02-30", "demain", "2026-1-5"])("refuse une date mal formée (%j) sans rien enregistrer", (followUpDate) => {
    expect(createContact({ name: "Alice", followUpDate })).toEqual({ status: "invalid", errors: { followUpDate: "invalid" } });
    expect(insertContact).not.toHaveBeenCalled();
  });

  it.each([20261201, ["2026-12-01"], new Date()])("refuse une date de mauvais type (%j) sans rien enregistrer", (followUpDate) => {
    expect(createContact({ name: "Alice", followUpDate })).toEqual({ status: "invalid", errors: { followUpDate: "invalid" } });
    expect(insertContact).not.toHaveBeenCalled();
  });

  it("refuse une date trop longue sans rien enregistrer", () => {
    expect(createContact({ name: "Alice", followUpDate: "2026-12-01T10:00" })).toEqual({
      status: "invalid",
      errors: { followUpDate: "too_long" },
    });
    expect(insertContact).not.toHaveBeenCalled();
  });
});

describe("listFollowUps : qui relancer aujourd'hui (lot 5)", () => {
  const contact = (id: number, name: string, followUpDate: string | null, stage = "to_contact"): ContactRecord => ({
    ...record(id, name),
    followUpDate,
    stage,
  });
  const names = (today: unknown) => {
    const result = listFollowUps(today);
    return result.status === "ok" ? result.contacts.map((c) => c.name) : result;
  };

  it("garde exactement les contacts dont la date est aujourd'hui ou passée, triés par nom", () => {
    vi.mocked(findAllContacts).mockReturnValue([
      contact(1, "Zoé", "2026-11-20"),
      contact(2, "Alice", "2026-10-01"),
      contact(3, "Bruno", "2026-11-21"),
      contact(4, "Chloé", null),
    ]);

    expect(names("2026-11-20")).toEqual(["Alice", "Zoé"]);
  });

  it("ne montre pas aujourd'hui un contact à relancer demain, mais le montre demain", () => {
    vi.mocked(findAllContacts).mockReturnValue([contact(1, "Bruno", "2026-11-21")]);

    expect(names("2026-11-20")).toEqual([]);
    expect(names("2026-11-21")).toEqual(["Bruno"]);
  });

  it("garde une relance en retard tant que la date n'a pas changé", () => {
    vi.mocked(findAllContacts).mockReturnValue([contact(1, "Alice", "2026-01-02")]);

    expect(names("2026-11-20")).toEqual(["Alice"]);
  });

  it.each(["won", "lost"])("exclut un contact à l'étape %s même si sa date est passée", (stage) => {
    vi.mocked(findAllContacts).mockReturnValue([contact(1, "Alice", "2026-11-01", stage), contact(2, "Bob", "2026-11-01", "in_discussion")]);

    expect(names("2026-11-20")).toEqual(["Bob"]);
  });

  it("renvoie une liste vide quand personne n'est à relancer", () => {
    vi.mocked(findAllContacts).mockReturnValue([contact(1, "Alice", null), contact(2, "Bob", "2026-12-01")]);

    expect(listFollowUps("2026-11-20")).toEqual({ status: "ok", contacts: [] });
  });

  it.each([undefined, null, 20261120, "20/11/2026", "2026-11-31", "2026-11-20T00:00:00", "x".repeat(500)])(
    "refuse une date du jour invalide (%j) sans interroger la base",
    (today) => {
      expect(listFollowUps(today)).toEqual({ status: "invalid" });
      expect(findAllContacts).not.toHaveBeenCalled();
    },
  );
});

describe("localToday", () => {
  it("donne la date du jour à l'heure locale de la machine, au format AAAA-MM-JJ", () => {
    expect(localToday(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
    expect(localToday(new Date(2026, 10, 20, 0, 1))).toBe("2026-11-20");
  });
});
