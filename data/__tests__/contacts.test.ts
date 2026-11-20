import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Chaque test travaille sur un fichier SQLite temporaire, jamais sur .data/pipeline.db.
let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "pipeline-"));
  vi.stubEnv("PIPELINE_DB_PATH", join(dir, "test.db"));
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(dir, { recursive: true, force: true });
});

const load = () => import("@/data/contacts");

describe("data/contacts", () => {
  it("renvoie une liste vide sur une base neuve", async () => {
    const { findAllContacts } = await load();
    expect(findAllContacts()).toEqual([]);
  });

  it("relit le contact inséré, avec son id", async () => {
    const { insertContact, findAllContacts } = await load();
    const fields = { name: "Alice Martin", company: "Acme", email: "alice@acme.fr", phone: "06 12 34 56 78", followUpDate: null, stage: "contacted" };

    const created = insertContact(fields);

    expect(created).toEqual({ id: expect.any(Number), ...fields });
    expect(findAllContacts()).toEqual([created]);
  });

  it("conserve les champs facultatifs à null", async () => {
    const { insertContact, findAllContacts } = await load();
    insertContact({ name: "Bob", company: null, email: null, phone: null, followUpDate: null, stage: "to_contact" });

    expect(findAllContacts()).toEqual([{ id: expect.any(Number), name: "Bob", company: null, email: null, phone: null, followUpDate: null, stage: "to_contact" }]);
  });

  it("retrouve le contact après un redémarrage (nouvelle connexion sur le même fichier)", async () => {
    const first = await load();
    const created = first.insertContact({ name: "Alice", company: null, email: null, phone: null, followUpDate: null, stage: "to_contact" });

    vi.resetModules();
    const second = await load();

    expect(second).not.toBe(first);
    expect(second.findAllContacts()).toEqual([created]);
  });

  it("retrouve un contact par son id, ou null s'il n'existe pas", async () => {
    const { insertContact, findContactById } = await load();
    const created = insertContact({ name: "Alice", company: "Acme", email: null, phone: null, followUpDate: null, stage: "to_contact" });

    expect(findContactById(created.id)).toEqual(created);
    expect(findContactById(created.id + 1)).toBeNull();
  });

  it("modifie un contact et renvoie ses nouvelles valeurs", async () => {
    const { insertContact, updateContact, findAllContacts } = await load();
    const created = insertContact({ name: "Alice", company: "Acme", email: "a@acme.fr", phone: null, followUpDate: null, stage: "to_contact" });
    const other = insertContact({ name: "Bob", company: null, email: null, phone: null, followUpDate: null, stage: "to_contact" });
    const fields = { name: "Alice Martin", company: null, email: "alice@martin.fr", phone: "06 12", followUpDate: "2026-12-01" };

    const updated = updateContact(created.id, fields);

    expect(updated).toEqual({ id: created.id, ...fields, stage: "to_contact" });
    expect(findAllContacts()).toEqual([updated, other]);
  });

  it("renvoie null quand le contact à modifier n'existe pas", async () => {
    const { updateContact, findAllContacts } = await load();

    expect(updateContact(42, { name: "X", company: null, email: null, phone: null, followUpDate: null })).toBeNull();
    expect(findAllContacts()).toEqual([]);
  });

  it("conserve la modification après un redémarrage (nouvelle connexion sur le même fichier)", async () => {
    const first = await load();
    const created = first.insertContact({ name: "Alice", company: null, email: null, phone: null, followUpDate: null, stage: "to_contact" });
    const updated = first.updateContact(created.id, { name: "Alice Martin", company: "Acme", email: null, phone: null, followUpDate: null });

    vi.resetModules();
    const second = await load();

    expect(second.findContactById(created.id)).toEqual(updated);
  });

  // Lot 4 : étape du pipeline.
  it("enregistre l'étape donnée à l'insertion et peut la changer seule", async () => {
    const { insertContact, updateContactStage, findContactById } = await load();
    const created = insertContact({ name: "Alice", company: "Acme", email: null, phone: null, followUpDate: null, stage: "to_contact" });

    const moved = updateContactStage(created.id, "won");

    expect(moved).toEqual({ ...created, stage: "won" });
    expect(findContactById(created.id)).toEqual(moved);
  });

  it("renvoie null quand le contact dont on change l'étape n'existe pas", async () => {
    const { updateContactStage } = await load();

    expect(updateContactStage(42, "won")).toBeNull();
  });

  it("ne change pas l'étape quand on modifie les informations du contact", async () => {
    const { insertContact, updateContactStage, updateContact } = await load();
    const created = insertContact({ name: "Alice", company: null, email: null, phone: null, followUpDate: null, stage: "to_contact" });
    updateContactStage(created.id, "in_discussion");

    expect(updateContact(created.id, { name: "Alice Martin", company: null, email: null, phone: null, followUpDate: null })?.stage).toBe("in_discussion");
  });

  it("conserve l'étape après un redémarrage (nouvelle connexion sur le même fichier)", async () => {
    const first = await load();
    const created = first.insertContact({ name: "Alice", company: null, email: null, phone: null, followUpDate: null, stage: "to_contact" });
    first.updateContactStage(created.id, "contacted");

    vi.resetModules();
    const second = await load();

    expect(second.findContactById(created.id)?.stage).toBe("contacted");
  });

  it("ajoute l'étape « to_contact » aux contacts d'une base créée avant le lot 4", async () => {
    const path = join(dir, "ancienne.db");
    mkdirSync(dir, { recursive: true });
    const old = new DatabaseSync(path);
    old.exec("CREATE TABLE contacts (id INTEGER PRIMARY KEY, name TEXT NOT NULL, company TEXT, email TEXT, phone TEXT)");
    old.exec("INSERT INTO contacts (name) VALUES ('Ancien')");
    old.close();
    vi.stubEnv("PIPELINE_DB_PATH", path);

    const { findAllContacts } = await load();

    expect(findAllContacts()).toEqual([{ id: 1, name: "Ancien", company: null, email: null, phone: null, followUpDate: null, stage: "to_contact" }]);
  });

  // Lot 5 : date de prochaine relance.
  it("enregistre et modifie la date de prochaine relance, et la conserve après un redémarrage", async () => {
    const first = await load();
    const created = first.insertContact({ name: "Alice", company: null, email: null, phone: null, followUpDate: "2026-11-20", stage: "to_contact" });
    expect(created.followUpDate).toBe("2026-11-20");
    first.updateContact(created.id, { name: "Alice", company: null, email: null, phone: null, followUpDate: "2026-12-01" });

    vi.resetModules();
    const second = await load();

    expect(second.findContactById(created.id)?.followUpDate).toBe("2026-12-01");
  });

  it("ajoute une date de relance vide aux contacts d'une base créée avant le lot 5", async () => {
    const path = join(dir, "lot4.db");
    const old = new DatabaseSync(path);
    old.exec("CREATE TABLE contacts (id INTEGER PRIMARY KEY, name TEXT NOT NULL, company TEXT, email TEXT, phone TEXT, stage TEXT NOT NULL DEFAULT 'to_contact')");
    old.exec("INSERT INTO contacts (name, stage) VALUES ('Ancien', 'won')");
    old.close();
    vi.stubEnv("PIPELINE_DB_PATH", path);

    const { findAllContacts } = await load();

    expect(findAllContacts()).toEqual([
      { id: 1, name: "Ancien", company: null, email: null, phone: null, followUpDate: null, stage: "won" },
    ]);
  });
});
