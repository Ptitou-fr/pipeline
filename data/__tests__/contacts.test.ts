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
});
