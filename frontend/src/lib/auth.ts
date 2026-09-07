import { apiBaseUrl } from "./api";
import { supabase } from "./supabase";

export type Account = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Request failed.");
  return payload as T;
}

export const register = (firstName: string, lastName: string, email: string, password: string) =>
  request<Account>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ firstName, lastName, email, password }),
  });

export const login = (email: string, password: string) =>
  request<Account>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const registerWithSupabase = async (firstName: string, lastName: string, email: string, password: string) => {
  if (!supabase) throw new Error("Supabase authentication is not configured yet.");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name: firstName, last_name: lastName },
      emailRedirectTo: `${window.location.origin}/login`,
    },
  });
  if (error) throw error;
  return data;
};

export const loginWithSupabase = async (email: string, password: string) => {
  if (!supabase) throw new Error("Supabase authentication is not configured yet.");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const account = await syncSupabaseSession();
  if (!account) throw new Error("Unable to create the application session.");
  return account;
};

export const signInWithGoogle = async () => {
  if (!supabase) throw new Error("Supabase authentication is not configured yet.");
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/login` },
  });
  if (error) throw error;
};

export const syncSupabaseSession = async () => {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  return request<Account>("/auth/supabase-session", {
    method: "POST",
    body: JSON.stringify({ accessToken: session.access_token }),
  });
};

export const currentAccount = () => request<Account>("/auth/me");

export const updateProfile = (firstName: string, lastName: string) =>
  request<Account>("/auth/profile", {
    method: "PATCH",
    body: JSON.stringify({ firstName, lastName }),
  });

export const logout = () =>
  request<void>("/auth/logout", { method: "POST" });

export type CreatedSpace = {
  spaceId: string;
  inviteToken: string;
  loverName: string;
};

export type Space = {
  id: string;
  lover_name: string;
  created_at: string;
  expires_at: string | null;
};

export const createSpace = (loverName: string) =>
  request<CreatedSpace>("/spaces", {
    method: "POST",
    body: JSON.stringify({ loverName }),
  });

export const listSpaces = () =>
  request<{ spaces: Space[] }>("/spaces");

export const deleteSpace = (spaceId: string) =>
  request<void>(`/spaces/${encodeURIComponent(spaceId)}`, {
    method: "DELETE",
  });

export const regenerateInvite = (spaceId: string) =>
  request<{ inviteToken: string; inviteUrl: string; expiresAt: string }>(
    `/spaces/${encodeURIComponent(spaceId)}/invitations`,
    { method: "POST" },
  );

export const revokeInvite = (spaceId: string) =>
  request<void>(`/spaces/${encodeURIComponent(spaceId)}/invitations`, {
    method: "DELETE",
  });

export const lookupInvite = (token: string) =>
  request<{ spaceId: string; loverName: string; senderName: string }>(
    `/invitations/${encodeURIComponent(token)}`,
  );
