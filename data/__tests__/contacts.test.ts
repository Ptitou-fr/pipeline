import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@libsql/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Chaque test travaille sur un fichier libSQL temporaire, jamais sur .data/pipeline.db ni sur la base Turso.
let dir: string;

const fileUrl = (name: string) => `file:${join(dir, name)}`;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "pipeline-"));
  vi.stubEnv("TURSO_DATABASE_URL", fileUrl("test.db"));
  vi.stubEnv("TURSO_AUTH_TOKEN", undefined);
  vi.stubEnv("VERCEL", undefined);
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(dir, { recursive: true, force: true });
});

const load = () => import("@/data/contacts");

// Fabrique une base dans un état antérieur, avec le pilote, pour tester la migration des colonnes.
async function oldDatabase(name: string, statements: string[]) {
  const url = fileUrl(name);
  const client = createClient({ url });
  await client.batch(statements, "write");
  client.close();
  vi.stubEnv("TURSO_DATABASE_URL", url);
}

describe("data/contacts", () => {
  it("renvoie une liste vide sur une base neuve", async () => {
    const { findAllContacts } = await load();
    expect(await findAllContacts()).toEqual([]);
  });

  it("relit le contact inséré, avec son id", async () => {
    const { insertContact, findAllContacts } = await load();
    const fields = { name: "Alice Martin", company: "Acme", email: "alice@acme.fr", phone: "06 12 34 56 78", followUpDate: null, stage: "contacted" };

    const created = await insertContact(fields);

    expect(created).toEqual({ id: expect.any(Number), ...fields });
    expect(await findAllContacts()).toEqual([created]);
  });

  it("conserve les champs facultatifs à null", async () => {
    const { insertContact, findAllContacts } = await load();
    await insertContact({ name: "Bob", company: null, email: null, phone: null, followUpDate: null, stage: "to_contact" });

    expect(await findAllContacts()).toEqual([{ id: expect.any(Number), name: "Bob", company: null, email: null, phone: null, followUpDate: null, stage: "to_contact" }]);
  });

  it("retrouve le contact après un redémarrage (nouvelle connexion sur le même fichier)", async () => {
    const first = await load();
    const created = await first.insertContact({ name: "Alice", company: null, email: null, phone: null, followUpDate: null, stage: "to_contact" });

    vi.resetModules();
    const second = await load();

    expect(second).not.toBe(first);
    expect(await second.findAllContacts()).toEqual([created]);
  });

  it("retrouve un contact par son id, ou null s'il n'existe pas", async () => {
    const { insertContact, findContactById } = await load();
    const created = await insertContact({ name: "Alice", company: "Acme", email: null, phone: null, followUpDate: null, stage: "to_contact" });

    expect(await findContactById(created.id)).toEqual(created);
    expect(await findContactById(created.id + 1)).toBeNull();
  });

  it("modifie un contact et renvoie ses nouvelles valeurs", async () => {
    const { insertContact, updateContact, findAllContacts } = await load();
    const created = await insertContact({ name: "Alice", company: "Acme", email: "a@acme.fr", phone: null, followUpDate: null, stage: "to_contact" });
    const other = await insertContact({ name: "Bob", company: null, email: null, phone: null, followUpDate: null, stage: "to_contact" });
    const fields = { name: "Alice Martin", company: null, email: "alice@martin.fr", phone: "06 12", followUpDate: "2026-12-01" };

    const updated = await updateContact(created.id, fields);

    expect(updated).toEqual({ id: created.id, ...fields, stage: "to_contact" });
    expect(await findAllContacts()).toEqual([updated, other]);
  });

  it("renvoie null quand le contact à modifier n'existe pas", async () => {
    const { updateContact, findAllContacts } = await load();

    expect(await updateContact(42, { name: "X", company: null, email: null, phone: null, followUpDate: null })).toBeNull();
    expect(await findAllContacts()).toEqual([]);
  });

  it("conserve la modification après un redémarrage (nouvelle connexion sur le même fichier)", async () => {
    const first = await load();
    const created = await first.insertContact({ name: "Alice", company: null, email: null, phone: null, followUpDate: null, stage: "to_contact" });
    const updated = await first.updateContact(created.id, { name: "Alice Martin", company: "Acme", email: null, phone: null, followUpDate: null });

    vi.resetModules();
    const second = await load();

    expect(await second.findContactById(created.id)).toEqual(updated);
  });

  // Lot 4 : étape du pipeline.
  it("enregistre l'étape donnée à l'insertion et peut la changer seule", async () => {
    const { insertContact, updateContactStage, findContactById } = await load();
    const created = await insertContact({ name: "Alice", company: "Acme", email: null, phone: null, followUpDate: null, stage: "to_contact" });

    const moved = await updateContactStage(created.id, "won");

    expect(moved).toEqual({ ...created, stage: "won" });
    expect(await findContactById(created.id)).toEqual(moved);
  });

  it("renvoie null quand le contact dont on change l'étape n'existe pas", async () => {
    const { updateContactStage } = await load();

    expect(await updateContactStage(42, "won")).toBeNull();
  });

  it("ne change pas l'étape quand on modifie les informations du contact", async () => {
    const { insertContact, updateContactStage, updateContact } = await load();
    const created = await insertContact({ name: "Alice", company: null, email: null, phone: null, followUpDate: null, stage: "to_contact" });
    await updateContactStage(created.id, "in_discussion");

    expect((await updateContact(created.id, { name: "Alice Martin", company: null, email: null, phone: null, followUpDate: null }))?.stage).toBe("in_discussion");
  });

  it("conserve l'étape après un redémarrage (nouvelle connexion sur le même fichier)", async () => {
    const first = await load();
    const created = await first.insertContact({ name: "Alice", company: null, email: null, phone: null, followUpDate: null, stage: "to_contact" });
    await first.updateContactStage(created.id, "contacted");

    vi.resetModules();
    const second = await load();

    expect((await second.findContactById(created.id))?.stage).toBe("contacted");
  });

  // Issue #11 : l'étape de départ est une règle métier, appliquée par le service ; la base n'en connaît aucune.
  it("crée la colonne de l'étape sans valeur par défaut ni obligation", async () => {
    const { findAllContacts } = await load();
    await findAllContacts();

    const client = createClient({ url: fileUrl("test.db") });
    const { rows } = await client.execute("PRAGMA table_info(contacts)");
    client.close();
    const stage = rows.find((column) => column.name === "stage");

    expect({ notnull: stage?.notnull, dflt_value: stage?.dflt_value }).toEqual({ notnull: 0, dflt_value: null });
  });

  it("ajoute une étape vide (null) aux contacts d'une base créée avant le lot 4", async () => {
    await oldDatabase("ancienne.db", [
      "CREATE TABLE contacts (id INTEGER PRIMARY KEY, name TEXT NOT NULL, company TEXT, email TEXT, phone TEXT)",
      "INSERT INTO contacts (name) VALUES ('Ancien')",
    ]);

    const { findAllContacts } = await load();

    expect(await findAllContacts()).toEqual([{ id: 1, name: "Ancien", company: null, email: null, phone: null, followUpDate: null, stage: null }]);
  });

  // Lot 5 : date de prochaine relance.
  it("enregistre et modifie la date de prochaine relance, et la conserve après un redémarrage", async () => {
    const first = await load();
    const created = await first.insertContact({ name: "Alice", company: null, email: null, phone: null, followUpDate: "2026-11-20", stage: "to_contact" });
    expect(created.followUpDate).toBe("2026-11-20");
    await first.updateContact(created.id, { name: "Alice", company: null, email: null, phone: null, followUpDate: "2026-12-01" });

    vi.resetModules();
    const second = await load();

    expect((await second.findContactById(created.id))?.followUpDate).toBe("2026-12-01");
  });

  it("ajoute une date de relance vide aux contacts d'une base créée avant le lot 5", async () => {
    await oldDatabase("lot4.db", [
      "CREATE TABLE contacts (id INTEGER PRIMARY KEY, name TEXT NOT NULL, company TEXT, email TEXT, phone TEXT, stage TEXT NOT NULL DEFAULT 'to_contact')",
      "INSERT INTO contacts (name, stage) VALUES ('Ancien', 'won')",
    ]);

    const { findAllContacts } = await load();

    expect(await findAllContacts()).toEqual([
      { id: 1, name: "Ancien", company: null, email: null, phone: null, followUpDate: null, stage: "won" },
    ]);
  });

  // Turso : la base distante est partagée, plusieurs requêtes arrivent ensemble (menu et page).
  it("migre une seule fois quand deux requêtes ouvrent la base en même temps", async () => {
    await oldDatabase("concurrente.db", [
      "CREATE TABLE contacts (id INTEGER PRIMARY KEY, name TEXT NOT NULL, company TEXT, email TEXT, phone TEXT)",
      "INSERT INTO contacts (name) VALUES ('Ancien')",
    ]);

    const { findAllContacts, findContactById } = await load();
    const [all, one] = await Promise.all([findAllContacts(), findContactById(1)]);

    expect(all).toEqual([{ id: 1, name: "Ancien", company: null, email: null, phone: null, followUpDate: null, stage: null }]);
    expect(one).toEqual(all[0]);
  });

  // Sur Vercel, le fichier local ne survit pas aux redéploiements : sans base configurée, on refuse.
  it("refuse de démarrer sur Vercel sans TURSO_DATABASE_URL", async () => {
    vi.stubEnv("TURSO_DATABASE_URL", undefined);
    vi.stubEnv("VERCEL", "1");

    const { findAllContacts } = await load();

    await expect(findAllContacts()).rejects.toThrow("TURSO_DATABASE_URL");
  });
});
