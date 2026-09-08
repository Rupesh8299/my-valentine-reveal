import initSqlJs from "sql.js";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = process.env.DATA_DIR || path.join(backendDir, "data");
const databaseFile = path.join(dataDir, "app.sqlite");

const SQL = await initSqlJs({
  locateFile: (file) => path.join(backendDir, "..", "node_modules", "sql.js", "dist", file),
});
await mkdir(dataDir, { recursive: true });

let database;
try {
  database = new SQL.Database(await readFile(databaseFile));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  database = new SQL.Database();
}

database.run(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    first_name TEXT NOT NULL DEFAULT 'Valentine',
    last_name TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS couple_spaces (
    id TEXT PRIMARY KEY,
    owner_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    lover_name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS invitations (
    token_hash TEXT PRIMARY KEY,
    space_id TEXT NOT NULL REFERENCES couple_spaces(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    revoked_at TEXT,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    space_id TEXT NOT NULL REFERENCES couple_spaces(id) ON DELETE CASCADE,
    payload TEXT NOT NULL,
    sender_role TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

const accountColumns = database.exec("PRAGMA table_info(accounts)")[0]?.values || [];
const hasColumn = (name) => accountColumns.some((column) => column[1] === name);
if (!hasColumn("first_name")) database.run("ALTER TABLE accounts ADD COLUMN first_name TEXT NOT NULL DEFAULT 'Valentine'");
if (!hasColumn("last_name")) database.run("ALTER TABLE accounts ADD COLUMN last_name TEXT NOT NULL DEFAULT ''");

async function persist() {
  await writeFile(databaseFile, Buffer.from(database.export()));
}

function one(sql, params = []) {
  const statement = database.prepare(sql);
  statement.bind(params);
  const row = statement.step() ? statement.getAsObject() : null;
  statement.free();
  return row;
}

export async function createAccount({ id, email, firstName, lastName, passwordHash, createdAt }) {
  database.run(
    "INSERT INTO accounts (id, email, first_name, last_name, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [id, email, firstName, lastName, passwordHash, createdAt],
  );
  await persist();
}

export function findAccountByEmail(email) {
  return one("SELECT * FROM accounts WHERE email = ?", [email]);
}

export function findAccountById(id) {
  return one("SELECT * FROM accounts WHERE id = ?", [id]);
}

export async function updateAccountName({ id, firstName, lastName }) {
  database.run(
    "UPDATE accounts SET first_name = ?, last_name = ? WHERE id = ?",
    [firstName, lastName, id],
  );
  await persist();
}

export async function createSession({ tokenHash, accountId, expiresAt, createdAt }) {
  database.run(
    "INSERT INTO sessions (token_hash, account_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
    [tokenHash, accountId, expiresAt, createdAt],
  );
  await persist();
}

export async function deleteSession(tokenHash) {
  database.run("DELETE FROM sessions WHERE token_hash = ?", [tokenHash]);
  await persist();
}

export function findSession(tokenHash) {
  return one(
    "SELECT sessions.*, accounts.email, accounts.first_name, accounts.last_name FROM sessions JOIN accounts ON accounts.id = sessions.account_id WHERE token_hash = ? AND expires_at > ?",
    [tokenHash, new Date().toISOString()],
  );
}

export async function createSpace({ id, ownerAccountId, loverName, createdAt }) {
  database.run(
    "INSERT INTO couple_spaces (id, owner_account_id, lover_name, created_at) VALUES (?, ?, ?, ?)",
    [id, ownerAccountId, loverName, createdAt],
  );
  await persist();
}

export async function deleteSpace(spaceId) {
  database.run("DELETE FROM couple_spaces WHERE id = ?", [spaceId]);
  await persist();
}

export async function saveChatMessage({ id, spaceId, payload, senderRole, createdAt }) {
  database.run(
    "INSERT OR REPLACE INTO chat_messages (id, space_id, payload, sender_role, created_at) VALUES (?, ?, ?, ?, ?)",
    [id, spaceId, JSON.stringify(payload), senderRole, createdAt],
  );
  await persist();
}

export function listChatMessages(spaceId) {
  const statement = database.prepare(
    "SELECT id, payload, sender_role FROM chat_messages WHERE space_id = ? ORDER BY created_at ASC LIMIT 200",
  );
  statement.bind([spaceId]);
  const rows = [];
  while (statement.step()) {
    const row = statement.getAsObject();
    try {
      rows.push({ ...(JSON.parse(row.payload)), senderRole: row.sender_role });
    } catch {
      // Ignore malformed legacy rows rather than breaking the full history.
    }
  }
  statement.free();
  return rows;
}

export async function createInvitation({ tokenHash, spaceId, expiresAt, createdAt }) {
  database.run(
    "INSERT INTO invitations (token_hash, space_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
    [tokenHash, spaceId, expiresAt, createdAt],
  );
  await persist();
}

export function listSpaces(ownerAccountId) {
  const statement = database.prepare(`
    SELECT couple_spaces.id, couple_spaces.lover_name, couple_spaces.created_at,
      invitations.expires_at, invitations.revoked_at
    FROM couple_spaces
    LEFT JOIN invitations ON invitations.space_id = couple_spaces.id
      AND invitations.revoked_at IS NULL
      AND invitations.expires_at > ?
    WHERE couple_spaces.owner_account_id = ?
    ORDER BY couple_spaces.created_at DESC
  `);
  statement.bind([new Date().toISOString(), ownerAccountId]);
  const rows = [];
  while (statement.step()) rows.push(statement.getAsObject());
  statement.free();
  return rows;
}

export async function revokeInvitations(spaceId) {
  database.run(
    "UPDATE invitations SET revoked_at = ? WHERE space_id = ? AND revoked_at IS NULL",
    [new Date().toISOString(), spaceId],
  );
  await persist();
}

export function ownsSpace(spaceId, ownerAccountId) {
  return Boolean(one(
    "SELECT id FROM couple_spaces WHERE id = ? AND owner_account_id = ?",
    [spaceId, ownerAccountId],
  ));
}

export function findInvitation(tokenHash) {
  return one(
    `SELECT invitations.*, couple_spaces.lover_name,
      accounts.first_name AS owner_first_name, accounts.last_name AS owner_last_name
      FROM invitations
      JOIN couple_spaces ON couple_spaces.id = invitations.space_id
      JOIN accounts ON accounts.id = couple_spaces.owner_account_id
      WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > ?`,
    [tokenHash, new Date().toISOString()],
  );
}
