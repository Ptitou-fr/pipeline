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
  // Date de prochaine relance (lot 5), au format AAAA-MM-JJ.
  followUpDate: string | null;
  // Null pour un contact enregistré avant le lot 4 : la couche service décide de son étape.
  stage: string | null;
};

export type NewContactRecord = Omit<ContactRecord, "id" | "stage"> & { stage: string };
// Informations modifiables par le formulaire : l'étape change à part (updateContactStage).
export type ContactFields = Omit<ContactRecord, "id" | "stage">;

const COLUMNS = "id, name, company, email, phone, follow_up_date, stage";

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
      phone TEXT,
      stage TEXT,
      follow_up_date TEXT
    )`);
    migrate(db);
  }
  return db;
}

// Ajoute les colonnes apparues après la création d'une base existante.
// Lot 4 : les contacts déjà enregistrés n'ont pas d'étape (null).
// Lot 5 : ils n'ont pas de date de relance.
function migrate(db: DatabaseSync) {
  const columns = new Set(db.prepare("PRAGMA table_info(contacts)").all().map((column) => column.name));
  if (!columns.has("stage")) db.exec("ALTER TABLE contacts ADD COLUMN stage TEXT");
  if (!columns.has("follow_up_date")) db.exec("ALTER TABLE contacts ADD COLUMN follow_up_date TEXT");
}

const toRecord = (row: Record<string, unknown>): ContactRecord => ({
  id: Number(row.id),
  name: String(row.name),
  company: row.company === null ? null : String(row.company),
  email: row.email === null ? null : String(row.email),
  phone: row.phone === null ? null : String(row.phone),
  followUpDate: row.follow_up_date === null ? null : String(row.follow_up_date),
  stage: row.stage === null ? null : String(row.stage),
});

export function insertContact(fields: NewContactRecord): ContactRecord {
  const row = database()
    .prepare(
      `INSERT INTO contacts (name, company, email, phone, follow_up_date, stage) VALUES (?, ?, ?, ?, ?, ?) RETURNING ${COLUMNS}`,
    )
    .get(fields.name, fields.company, fields.email, fields.phone, fields.followUpDate, fields.stage);
  return toRecord(row as Record<string, unknown>);
}

export function findAllContacts(): ContactRecord[] {
  return database()
    .prepare(`SELECT ${COLUMNS} FROM contacts`)
    .all()
    .map((row) => toRecord(row as Record<string, unknown>));
}

export function findContactById(id: number): ContactRecord | null {
  const row = database().prepare(`SELECT ${COLUMNS} FROM contacts WHERE id = ?`).get(id);
  return row ? toRecord(row as Record<string, unknown>) : null;
}

// Renvoie null si aucun contact ne porte cet id.
export function updateContact(id: number, fields: ContactFields): ContactRecord | null {
  const row = database()
    .prepare(
      `UPDATE contacts SET name = ?, company = ?, email = ?, phone = ?, follow_up_date = ? WHERE id = ? RETURNING ${COLUMNS}`,
    )
    .get(fields.name, fields.company, fields.email, fields.phone, fields.followUpDate, id);
  return row ? toRecord(row as Record<string, unknown>) : null;
}

// Renvoie null si aucun contact ne porte cet id.
export function updateContactStage(id: number, stage: string): ContactRecord | null {
  const row = database().prepare(`UPDATE contacts SET stage = ? WHERE id = ? RETURNING ${COLUMNS}`).get(stage, id);
  return row ? toRecord(row as Record<string, unknown>) : null;
}
