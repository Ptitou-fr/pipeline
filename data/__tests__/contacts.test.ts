import { mkdtempSync, rmSync } from "node:fs";
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
    const fields = { name: "Alice Martin", company: "Acme", email: "alice@acme.fr", phone: "06 12 34 56 78" };

    const created = insertContact(fields);

    expect(created).toEqual({ id: expect.any(Number), ...fields });
    expect(findAllContacts()).toEqual([created]);
  });

  it("conserve les champs facultatifs à null", async () => {
    const { insertContact, findAllContacts } = await load();
    insertContact({ name: "Bob", company: null, email: null, phone: null });

    expect(findAllContacts()).toEqual([{ id: expect.any(Number), name: "Bob", company: null, email: null, phone: null }]);
  });

  it("retrouve le contact après un redémarrage (nouvelle connexion sur le même fichier)", async () => {
    const first = await load();
    const created = first.insertContact({ name: "Alice", company: null, email: null, phone: null });

    vi.resetModules();
    const second = await load();

    expect(second).not.toBe(first);
    expect(second.findAllContacts()).toEqual([created]);
  });

  it("retrouve un contact par son id, ou null s'il n'existe pas", async () => {
    const { insertContact, findContactById } = await load();
    const created = insertContact({ name: "Alice", company: "Acme", email: null, phone: null });

    expect(findContactById(created.id)).toEqual(created);
    expect(findContactById(created.id + 1)).toBeNull();
  });

  it("modifie un contact et renvoie ses nouvelles valeurs", async () => {
    const { insertContact, updateContact, findAllContacts } = await load();
    const created = insertContact({ name: "Alice", company: "Acme", email: "a@acme.fr", phone: null });
    const other = insertContact({ name: "Bob", company: null, email: null, phone: null });
    const fields = { name: "Alice Martin", company: null, email: "alice@martin.fr", phone: "06 12" };

    const updated = updateContact(created.id, fields);

    expect(updated).toEqual({ id: created.id, ...fields });
    expect(findAllContacts()).toEqual([updated, other]);
  });

  it("renvoie null quand le contact à modifier n'existe pas", async () => {
    const { updateContact, findAllContacts } = await load();

    expect(updateContact(42, { name: "X", company: null, email: null, phone: null })).toBeNull();
    expect(findAllContacts()).toEqual([]);
  });

  it("conserve la modification après un redémarrage (nouvelle connexion sur le même fichier)", async () => {
    const first = await load();
    const created = first.insertContact({ name: "Alice", company: null, email: null, phone: null });
    const updated = first.updateContact(created.id, { name: "Alice Martin", company: "Acme", email: null, phone: null });

    vi.resetModules();
    const second = await load();

    expect(second.findContactById(created.id)).toEqual(updated);
  });
});
