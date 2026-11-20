// Couche données : seule couche qui parle à la base (SQLite, module intégré node:sqlite).
// Lire, écrire, renvoyer : aucune règle métier, aucun tri. Aucun type du pilote n'est exporté.
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

export type ContactRecord = {
  id: number;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
};

export type NewContactRecord = Omit<ContactRecord, "id">;

let db: DatabaseSync | undefined;

// Ouverte au premier appel. PIPELINE_DB_PATH ne sert qu'aux tests (fichier temporaire).
function database(): DatabaseSync {
  if (!db) {
    const path = process.env.PIPELINE_DB_PATH ?? ".data/pipeline.db";
    mkdirSync(dirname(path), { recursive: true });
    db = new DatabaseSync(path);
    db.exec(`CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      company TEXT,
      email TEXT,
      phone TEXT
    )`);
  }
  return db;
}

const toRecord = (row: Record<string, unknown>): ContactRecord => ({
  id: Number(row.id),
  name: String(row.name),
  company: row.company === null ? null : String(row.company),
  email: row.email === null ? null : String(row.email),
  phone: row.phone === null ? null : String(row.phone),
});

export function insertContact(fields: NewContactRecord): ContactRecord {
  const row = database()
    .prepare("INSERT INTO contacts (name, company, email, phone) VALUES (?, ?, ?, ?) RETURNING *")
    .get(fields.name, fields.company, fields.email, fields.phone);
  return toRecord(row as Record<string, unknown>);
}

export function findAllContacts(): ContactRecord[] {
  return database()
    .prepare("SELECT id, name, company, email, phone FROM contacts")
    .all()
    .map((row) => toRecord(row as Record<string, unknown>));
}

export function findContactById(id: number): ContactRecord | null {
  const row = database().prepare("SELECT id, name, company, email, phone FROM contacts WHERE id = ?").get(id);
  return row ? toRecord(row as Record<string, unknown>) : null;
}

// Renvoie null si aucun contact ne porte cet id.
export function updateContact(id: number, fields: NewContactRecord): ContactRecord | null {
  const row = database()
    .prepare("UPDATE contacts SET name = ?, company = ?, email = ?, phone = ? WHERE id = ? RETURNING *")
    .get(fields.name, fields.company, fields.email, fields.phone, id);
  return row ? toRecord(row as Record<string, unknown>) : null;
}
