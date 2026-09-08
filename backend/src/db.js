import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ws from "ws";

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(backendDir, ".env"), override: true });

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  console.warn("SUPABASE_URL and SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY must be defined in .env");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    transport: ws,
  },
});

export async function createAccount({ id, email, firstName, lastName, passwordHash, createdAt }) {
  const { error } = await supabase.from("accounts").insert({
    id,
    email: email.toLowerCase(),
    first_name: firstName,
    last_name: lastName,
    password_hash: passwordHash,
    created_at: createdAt,
  });
  if (error) throw error;
}

export async function findAccountByEmail(email) {
  if (!email) return null;
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .ilike("email", email.trim().toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function findAccountById(id) {
  if (!id) return null;
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function updateAccountName({ id, firstName, lastName }) {
  const { error } = await supabase
    .from("accounts")
    .update({ first_name: firstName, last_name: lastName })
    .eq("id", id);
  if (error) throw error;
}

export async function createSession({ tokenHash, accountId, expiresAt, createdAt }) {
  const { error } = await supabase.from("sessions").insert({
    token_hash: tokenHash,
    account_id: accountId,
    expires_at: expiresAt,
    created_at: createdAt,
  });
  if (error) throw error;
}

export async function deleteSession(tokenHash) {
  const { error } = await supabase.from("sessions").delete().eq("token_hash", tokenHash);
  if (error) throw error;
}

export async function findSession(tokenHash) {
  if (!tokenHash) return null;
  const { data, error } = await supabase
    .from("sessions")
    .select("token_hash, account_id, expires_at, created_at, accounts(email, first_name, last_name)")
    .eq("token_hash", tokenHash)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    token_hash: data.token_hash,
    account_id: data.account_id,
    expires_at: data.expires_at,
    created_at: data.created_at,
    email: data.accounts?.email,
    first_name: data.accounts?.first_name,
    last_name: data.accounts?.last_name,
  };
}

export async function createSpace({ id, ownerAccountId, loverName, createdAt }) {
  const { error } = await supabase.from("couple_spaces").insert({
    id,
    owner_account_id: ownerAccountId,
    lover_name: loverName,
    created_at: createdAt,
  });
  if (error) throw error;
}

export async function deleteSpace(spaceId) {
  const { error } = await supabase.from("couple_spaces").delete().eq("id", spaceId);
  if (error) throw error;
}

export async function saveChatMessage({ id, spaceId, payload, senderRole, createdAt }) {
  const { error } = await supabase.from("chat_messages").upsert({
    id,
    space_id: spaceId,
    payload,
    sender_role: senderRole,
    created_at: createdAt,
  });
  if (error) throw error;
}

export async function listChatMessages(spaceId) {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, payload, sender_role")
    .eq("space_id", spaceId)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) throw error;
  if (!data) return [];
  return data.map((row) => ({
    ...(typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload),
    senderRole: row.sender_role,
  }));
}

export async function createInvitation({ tokenHash, spaceId, expiresAt, createdAt }) {
  const { error } = await supabase.from("invitations").insert({
    token_hash: tokenHash,
    space_id: spaceId,
    expires_at: expiresAt,
    created_at: createdAt,
  });
  if (error) throw error;
}

export async function listSpaces(ownerAccountId) {
  const now = new Date().toISOString();
  const { data: spaces, error } = await supabase
    .from("couple_spaces")
    .select("id, lover_name, created_at, invitations(expires_at, revoked_at)")
    .eq("owner_account_id", ownerAccountId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!spaces) return [];

  return spaces.map((space) => {
    const activeInvite = Array.isArray(space.invitations)
      ? space.invitations.find((inv) => !inv.revoked_at && inv.expires_at > now)
      : null;
    return {
      id: space.id,
      lover_name: space.lover_name,
      created_at: space.created_at,
      expires_at: activeInvite ? activeInvite.expires_at : null,
      revoked_at: activeInvite ? activeInvite.revoked_at : null,
    };
  });
}

export async function revokeInvitations(spaceId) {
  const { error } = await supabase
    .from("invitations")
    .update({ revoked_at: new Date().toISOString() })
    .eq("space_id", spaceId)
    .is("revoked_at", null);
  if (error) throw error;
}

export async function ownsSpace(spaceId, ownerAccountId) {
  if (!spaceId || !ownerAccountId) return false;
  const { data, error } = await supabase
    .from("couple_spaces")
    .select("id")
    .eq("id", spaceId)
    .eq("owner_account_id", ownerAccountId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function findInvitation(tokenHash) {
  if (!tokenHash) return null;
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("invitations")
    .select(`
      token_hash,
      space_id,
      expires_at,
      revoked_at,
      created_at,
      couple_spaces (
        lover_name,
        accounts (
          first_name,
          last_name
        )
      )
    `)
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .gt("expires_at", now)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    token_hash: data.token_hash,
    space_id: data.space_id,
    expires_at: data.expires_at,
    revoked_at: data.revoked_at,
    created_at: data.created_at,
    lover_name: data.couple_spaces?.lover_name,
    owner_first_name: data.couple_spaces?.accounts?.first_name,
    owner_last_name: data.couple_spaces?.accounts?.last_name,
  };
}
