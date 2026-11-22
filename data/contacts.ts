// Couche données : seule couche qui parle à la base (Turso, par le client libSQL).
// Lire, écrire, renvoyer : aucune règle métier, aucun tri. Aucun type du pilote n'est exporté.
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createClient, type Client, type InStatement, type Row } from "@libsql/client";

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

// Sans TURSO_DATABASE_URL, en local : un fichier libSQL, ignoré par git.
const LOCAL_FILE = ".data/pipeline.db";

// Sur Vercel, un fichier local ne survit pas aux redéploiements : la base Turso est obligatoire.
function databaseUrl(): string {
  const url = process.env.TURSO_DATABASE_URL;
  if (url) return url;
  if (process.env.VERCEL) {
    throw new Error("TURSO_DATABASE_URL manquante : sur Vercel, la base doit être Turso (voir .env.example).");
  }
  mkdirSync(dirname(LOCAL_FILE), { recursive: true });
  return `file:${LOCAL_FILE}`;
}

// Ouverte et migrée au premier appel, une seule fois même pour des requêtes simultanées.
// Un échec n'est pas retenu : l'appel suivant réessaie.
let ready: Promise<Client> | undefined;

function database(): Promise<Client> {
  ready ??= open().catch((error: unknown) => {
    ready = undefined;
    throw error;
  });
  return ready;
}

async function open(): Promise<Client> {
  const client = createClient({ url: databaseUrl(), authToken: process.env.TURSO_AUTH_TOKEN });
  await client.execute(`CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    phone TEXT,
    stage TEXT,
    follow_up_date TEXT
  )`);
  await migrate(client);
  return client;
}

// Ajoute les colonnes apparues après la création d'une base existante.
// Lot 4 : les contacts déjà enregistrés n'ont pas d'étape (null).
// Lot 5 : ils n'ont pas de date de relance.
async function migrate(client: Client) {
  const { rows } = await client.execute("PRAGMA table_info(contacts)");
  const columns = new Set(rows.map((column) => column.name));
  if (!columns.has("stage")) await client.execute("ALTER TABLE contacts ADD COLUMN stage TEXT");
  if (!columns.has("follow_up_date")) await client.execute("ALTER TABLE contacts ADD COLUMN follow_up_date TEXT");
}

const toRecord = (row: Row): ContactRecord => ({
  id: Number(row.id),
  name: String(row.name),
  company: row.company === null ? null : String(row.company),
  email: row.email === null ? null : String(row.email),
  phone: row.phone === null ? null : String(row.phone),
  followUpDate: row.follow_up_date === null ? null : String(row.follow_up_date),
  stage: row.stage === null ? null : String(row.stage),
});

async function query(statement: InStatement): Promise<ContactRecord[]> {
  const { rows } = await (await database()).execute(statement);
  return rows.map(toRecord);
}

const first = (records: ContactRecord[]): ContactRecord | null => records[0] ?? null;

export async function insertContact(fields: NewContactRecord): Promise<ContactRecord> {
  const [record] = await query({
    sql: `INSERT INTO contacts (name, company, email, phone, follow_up_date, stage) VALUES (?, ?, ?, ?, ?, ?) RETURNING ${COLUMNS}`,
    args: [fields.name, fields.company, fields.email, fields.phone, fields.followUpDate, fields.stage],
  });
  return record;
}

export async function findAllContacts(): Promise<ContactRecord[]> {
  return query(`SELECT ${COLUMNS} FROM contacts`);
}

export async function findContactById(id: number): Promise<ContactRecord | null> {
  return first(await query({ sql: `SELECT ${COLUMNS} FROM contacts WHERE id = ?`, args: [id] }));
}

// Renvoie null si aucun contact ne porte cet id.
export async function updateContact(id: number, fields: ContactFields): Promise<ContactRecord | null> {
  return first(
    await query({
      sql: `UPDATE contacts SET name = ?, company = ?, email = ?, phone = ?, follow_up_date = ? WHERE id = ? RETURNING ${COLUMNS}`,
      args: [fields.name, fields.company, fields.email, fields.phone, fields.followUpDate, id],
    }),
  );
}

// Renvoie null si aucun contact ne porte cet id.
export async function updateContactStage(id: number, stage: string): Promise<ContactRecord | null> {
  return first(await query({ sql: `UPDATE contacts SET stage = ? WHERE id = ? RETURNING ${COLUMNS}`, args: [stage, id] }));
}
