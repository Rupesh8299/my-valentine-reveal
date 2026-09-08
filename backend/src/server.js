import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import crypto from "node:crypto";
import { createServer } from "node:http";
import { Readable } from "node:stream";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer } from "ws";
import {
  createAccount,
  createInvitation,
  createSession,
  createSpace,
  deleteSpace,
  listChatMessages,
  saveChatMessage,
  deleteSession,
  findAccountByEmail,
  findInvitation,
  findSession,
  listSpaces,
  ownsSpace,
  revokeInvitations,
  updateAccountName,
} from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, "..");
const assetsDir = path.join(backendDir, "assets");
const frontendDist = path.resolve(backendDir, "..", "frontend", "dist");
dotenv.config({ path: path.join(backendDir, ".env"), override: true });
const app = express();
const httpServer = createServer(app);
const port = Number(process.env.PORT || 3001);
const messageRecipientEmail = process.env.MESSAGE_RECIPIENT_EMAIL || "";
const resendApiKey = process.env.RESEND_API_KEY || "";
const resendFromEmail = process.env.RESEND_FROM_EMAIL || "";
const sessionSecret = process.env.SESSION_SECRET || "";
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";
const jamendoClientId = process.env.JAMENDO_CLIENT_ID || "";
const musicPreviewEnabled = process.env.MUSIC_PREVIEW_ENABLED === "true";
const isProduction = process.env.NODE_ENV === "production";
const escapeHtml = (value) => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}[character]));
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:8080")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  credentials: true,
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Origin is not allowed by CORS."));
  },
}));
app.use(express.json({ limit: "100kb" }));
const assetDirectories = new Set(["emoji", "fonts", "music", "root"]);
app.get("/api/assets/:category/:file", (request, response, next) => {
  const { category, file } = request.params;
  if (!assetDirectories.has(category) || path.basename(file) !== file) {
    response.status(404).json({ error: "Asset not found." });
    return;
  }

  const assetPath = category === "root"
    ? path.join(assetsDir, file)
    : path.join(assetsDir, category, file);
  response.sendFile(assetPath, (error) => {
    if (error) next(error);
  });
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => callback(null, file.mimetype.startsWith("image/")),
});

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

const dayMusic = {
  rose: { mood: "tender", jamendoTags: "romantic love acoustic", previewQuery: "romantic acoustic love" },
  propose: { mood: "hopeful", jamendoTags: "romantic hopeful piano", previewQuery: "hopeful love piano" },
  chocolate: { mood: "sweet", jamendoTags: "sweet chill love", previewQuery: "sweet chill love" },
  teddy: { mood: "warm", jamendoTags: "warm cozy acoustic", previewQuery: "warm cozy acoustic" },
  promise: { mood: "devoted", jamendoTags: "devoted romantic cinematic", previewQuery: "devoted romantic cinematic" },
  hug: { mood: "comforting", jamendoTags: "comforting love soul", previewQuery: "comforting love soul" },
  kiss: { mood: "intimate", jamendoTags: "intimate romantic rnb", previewQuery: "intimate romantic rnb" },
  valentine: { mood: "celebratory", jamendoTags: "celebration love pop", previewQuery: "celebratory love pop" },
};

app.get("/api/music/day/:dayId", async (request, response, next) => {
  try {
    const selection = dayMusic[request.params.dayId];
    if (!selection) return response.status(404).json({ error: "Music selection not found." });
    const mode = request.query.mode === "preview" ? "preview" : "radio";
    if (mode === "radio" && jamendoClientId) {
      const query = new URLSearchParams({
        client_id: jamendoClientId,
        format: "json",
        limit: "10",
        audioformat: "mp32",
        fuzzytags: selection.jamendoTags,
        order: "popularity_total",
      });

      const result = await fetch(`https://api.jamendo.com/v3.0/tracks/?${query}`);
      if (!result.ok) throw new Error("Jamendo music request failed.");
      const payload = await result.json();
      return response.json({
        mode,
        mood: selection.mood,
        tracks: (payload.results || []).map((track) => ({
          id: String(track.id),
          title: track.name,
          artist: track.artist_name,
          url: track.audio,
        })).filter((track) => track.url),
      });
    }
    if (mode === "preview" && musicPreviewEnabled) {
      const query = new URLSearchParams({ q: selection.previewQuery, limit: "10" });
      const result = await fetch(`https://api.deezer.com/search?${query}`);
      if (!result.ok) throw new Error("Preview music request failed.");
      const payload = await result.json();
      return response.json({
        mode,
        mood: selection.mood,
        tracks: (payload.data || []).map((track) => ({
          id: String(track.id),
          title: track.title,
          artist: track.artist?.name || "Unknown artist",
          url: track.preview,
        })).filter((track) => track.url),
      });
    }
    response.json({ mode, mood: selection.mood, tracks: [] });
  } catch (error) {
    next(error);
  }
});

app.get("/api/music/stream", async (request, response, next) => {
  try {
    const source = typeof request.query.url === "string" ? request.query.url : "";
    const sourceUrl = new URL(source);
    if (sourceUrl.protocol !== "https:" || sourceUrl.hostname !== "prod-1.storage.jamendo.com") {
      return response.status(400).json({ error: "Unsupported music source." });
    }
    const upstream = await fetch(sourceUrl);
    if (!upstream.ok || !upstream.body) {
      return response.status(502).json({ error: "Music source is unavailable." });
    }
    response.statusCode = 200;
    response.setHeader("Content-Type", upstream.headers.get("content-type") || "audio/mpeg");
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) response.setHeader("Content-Length", contentLength);
    Readable.fromWeb(upstream.body).pipe(response);
  } catch (error) {
    next(error);
  }
});

const hashValue = (value) => crypto.createHash("sha256").update(value).digest("hex");
const now = () => new Date().toISOString();
const sessionCookie = "valentine_session";

function sessionAccount(request) {
  const token = request.headers.cookie?.match(new RegExp(`${sessionCookie}=([^;]+)`))?.[1];
  if (!token || !sessionSecret) return null;
  return findSession(hashValue(`${sessionSecret}:${token}`));
}

function sessionToken(request) {
  return request.headers.cookie?.match(new RegExp(`${sessionCookie}=([^;]+)`))?.[1] || "";
}

app.post("/api/auth/register", async (request, response, next) => {
  try {
    const email = typeof request.body.email === "string" ? request.body.email.trim().toLowerCase() : "";
    const firstName = typeof request.body.firstName === "string" ? request.body.firstName.trim() : "";
    const lastName = typeof request.body.lastName === "string" ? request.body.lastName.trim() : "";
    const password = typeof request.body.password === "string" ? request.body.password : "";
    if (!firstName || !email || password.length < 10) {
      return response.status(400).json({ error: "Enter your first name, a valid email, and a password of at least 10 characters." });
    }
    if (findAccountByEmail(email)) return response.status(409).json({ error: "An account already exists." });
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = await new Promise((resolve, reject) => {
      crypto.scrypt(password, salt, 64, (error, derivedKey) => {
        if (error) reject(error);
        else resolve(`${salt}:${derivedKey.toString("hex")}`);
      });
    });
    const accountId = crypto.randomUUID();
    await createAccount({ id: accountId, email, firstName, lastName, passwordHash, createdAt: now() });
    response.status(201).json({ id: accountId, email, firstName, lastName });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/supabase-session", async (request, response, next) => {
  try {
    const accessToken = typeof request.body.accessToken === "string" ? request.body.accessToken : "";
    if (!supabaseUrl || !supabaseAnonKey || !accessToken) {
      return response.status(503).json({ error: "Supabase authentication is not configured." });
    }
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const user = await userResponse.json();
    if (!userResponse.ok || !user.email) return response.status(401).json({ error: "Supabase session is invalid." });
    let account = findAccountByEmail(user.email);
    if (!account) {
      const firstName = String(user.user_metadata?.first_name || user.user_metadata?.full_name || "Valentine").trim().slice(0, 80) || "Valentine";
      const lastName = String(user.user_metadata?.last_name || "").trim().slice(0, 80);
      const salt = crypto.randomBytes(16).toString("hex");
      const passwordHash = `${salt}:${crypto.randomBytes(64).toString("hex")}`;
      await createAccount({
        id: crypto.randomUUID(),
        email: user.email.trim().toLowerCase(),
        firstName,
        lastName,
        passwordHash,
        createdAt: now(),
      });
      account = findAccountByEmail(user.email);
    }
    if (!sessionSecret) return response.status(503).json({ error: "Authentication is not configured." });
    const token = crypto.randomBytes(32).toString("base64url");
    await createSession({
      tokenHash: hashValue(`${sessionSecret}:${token}`),
      accountId: account.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      createdAt: now(),
    });
    response.setHeader(
      "Set-Cookie",
      `${sessionCookie}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${isProduction ? "; Secure" : ""}`,
    );
    response.json({ id: account.id, email: account.email, firstName: account.first_name, lastName: account.last_name });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", async (request, response, next) => {
  try {
    const email = typeof request.body.email === "string" ? request.body.email.trim().toLowerCase() : "";
    const password = typeof request.body.password === "string" ? request.body.password : "";
    const account = findAccountByEmail(email);
    if (!account) return response.status(401).json({ error: "Invalid email or password." });
    const [salt, expected] = account.password_hash.split(":");
    const actual = await new Promise((resolve, reject) => {
      crypto.scrypt(password, salt, 64, (error, derivedKey) => {
        if (error) reject(error);
        else resolve(derivedKey.toString("hex"));
      });
    });
    if (actual.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected))) {
      return response.status(401).json({ error: "Invalid email or password." });
    }
    if (!sessionSecret) return response.status(503).json({ error: "Authentication is not configured." });
    const token = crypto.randomBytes(32).toString("base64url");
    await createSession({
      tokenHash: hashValue(`${sessionSecret}:${token}`),
      accountId: account.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      createdAt: now(),
    });
    response.setHeader(
      "Set-Cookie",
      `${sessionCookie}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${isProduction ? "; Secure" : ""}`,
    );
    response.json({ id: account.id, email: account.email, firstName: account.first_name, lastName: account.last_name });
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/me", (request, response) => {
  const account = sessionAccount(request);
  if (!account) return response.status(401).json({ error: "You are not signed in." });
  response.json({
    id: account.account_id,
    email: account.email,
    firstName: account.first_name,
    lastName: account.last_name,
  });
});

app.patch("/api/auth/profile", async (request, response, next) => {
  try {
    const account = sessionAccount(request);
    if (!account) return response.status(401).json({ error: "You are not signed in." });
    const firstName = typeof request.body.firstName === "string" ? request.body.firstName.trim() : "";
    const lastName = typeof request.body.lastName === "string" ? request.body.lastName.trim() : "";
    if (!firstName || firstName.length > 80 || lastName.length > 80) {
      return response.status(400).json({ error: "Enter a first name. Names must be 80 characters or fewer." });
    }
    await updateAccountName({ id: account.account_id, firstName, lastName });
    response.json({
      id: account.account_id,
      email: account.email,
      firstName,
      lastName,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/logout", async (request, response, next) => {
  try {
    const token = sessionToken(request);
    if (token && sessionSecret) {
      await deleteSession(hashValue(`${sessionSecret}:${token}`));
    }
    response.setHeader(
      "Set-Cookie",
      `${sessionCookie}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${isProduction ? "; Secure" : ""}`,
    );
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post("/api/spaces", async (request, response, next) => {
  try {
    const account = sessionAccount(request);
    if (!account) return response.status(401).json({ error: "Sign in before creating a lover page." });
    const loverName = typeof request.body.loverName === "string" ? request.body.loverName.trim() : "";
    if (!loverName) return response.status(400).json({ error: "A lover name is required." });
    const spaceId = crypto.randomUUID();
    await createSpace({ id: spaceId, ownerAccountId: account.account_id, loverName, createdAt: now() });
    const invite = crypto.randomBytes(32).toString("base64url");
    await createInvitation({
      tokenHash: hashValue(invite),
      spaceId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
      createdAt: now(),
    });
    response.status(201).json({ spaceId, inviteToken: invite, loverName });
  } catch (error) {
    next(error);
  }
});

app.get("/api/spaces", (request, response) => {
  const account = sessionAccount(request);
  if (!account) return response.status(401).json({ error: "Sign in before viewing your pages." });
  response.json({ spaces: listSpaces(account.account_id) });
});

app.get("/api/spaces/:spaceId", (request, response) => {
  const account = sessionAccount(request);
  if (!account || !ownsSpace(request.params.spaceId, account.account_id)) {
    return response.status(404).json({ error: "Page not found." });
  }
  const spaces = listSpaces(account.account_id);
  const space = spaces.find((item) => item.id === request.params.spaceId);
  if (!space) return response.status(404).json({ error: "Page not found." });
  response.json({
    spaceId: space.id,
    loverName: space.lover_name,
    ownerName: [account.first_name, account.last_name].filter(Boolean).join(" "),
  });
});

app.delete("/api/spaces/:spaceId", async (request, response, next) => {
  try {
    const account = sessionAccount(request);
    if (!account) return response.status(401).json({ error: "Sign in before managing your pages." });
    if (!ownsSpace(request.params.spaceId, account.account_id)) {
      return response.status(404).json({ error: "Page not found." });
    }
    await deleteSpace(request.params.spaceId);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post("/api/spaces/:spaceId/invitations", async (request, response, next) => {
  try {
    const account = sessionAccount(request);
    if (!account) return response.status(401).json({ error: "Sign in before managing invitations." });
    if (!ownsSpace(request.params.spaceId, account.account_id)) {
      return response.status(404).json({ error: "Page not found." });
    }
    await revokeInvitations(request.params.spaceId);
    const invite = crypto.randomBytes(32).toString("base64url");
    await createInvitation({
      tokenHash: hashValue(invite),
      spaceId: request.params.spaceId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
      createdAt: now(),
    });
    response.status(201).json({
      inviteToken: invite,
      inviteUrl: `/invite/${invite}`,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/spaces/:spaceId/invitations", async (request, response, next) => {
  try {
    const account = sessionAccount(request);
    if (!account) return response.status(401).json({ error: "Sign in before managing invitations." });
    if (!ownsSpace(request.params.spaceId, account.account_id)) {
      return response.status(404).json({ error: "Page not found." });
    }
    await revokeInvitations(request.params.spaceId);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get("/api/invitations/:token", (request, response) => {
  const invitation = findInvitation(hashValue(request.params.token));
  if (!invitation) return response.status(404).json({ error: "Invite is invalid or expired." });
  response.json({
    spaceId: invitation.space_id,
    loverName: invitation.lover_name,
    senderName: [invitation.owner_first_name, invitation.owner_last_name].filter(Boolean).join(" "),
  });
});

const webSocketServer = new WebSocketServer({ noServer: true });
const connectedSpaces = new Map();

httpServer.on("upgrade", (request, socket, head) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);
  if (url.pathname !== "/ws") {
    socket.destroy();
    return;
  }
  const invitation = findInvitation(hashValue(url.searchParams.get("invite") || ""));
  const ownerAccount = sessionAccount(request);
  const ownerSpaceId = url.searchParams.get("spaceId") || "";
  const isOwner = Boolean(ownerAccount && ownerSpaceId && ownsSpace(ownerSpaceId, ownerAccount.account_id));
  if (!invitation && !isOwner) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }
  webSocketServer.handleUpgrade(request, socket, head, (client) => {
    client.spaceId = invitation?.space_id || ownerSpaceId;
    client.role = isOwner ? "owner" : "lover";
    webSocketServer.emit("connection", client);
  });
});

webSocketServer.on("connection", (client) => {
  const peers = connectedSpaces.get(client.spaceId) || new Set();
  if (peers.size >= 2) {
    client.close(1008, "This private page already has two connected devices.");
    return;
  }
  peers.forEach((peer) => {
    if (peer.readyState === 1) peer.send(JSON.stringify({ type: "peer-joined" }));
  });
  peers.add(client);
  connectedSpaces.set(client.spaceId, peers);
  client.send(JSON.stringify({ type: "connected", peers: peers.size }));
  const history = listChatMessages(client.spaceId);
  if (history.length) client.send(JSON.stringify({ type: "chat-history", messages: history }));
  client.on("message", (raw) => {
    let event;
    try {
      event = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (!["offer", "answer", "ice-candidate", "chat", "chat-history-sync", "gesture", "liquid-pointer", "presentation", "presentation-request"].includes(event.type)) return;
    if (event.type === "chat-history-sync" && Array.isArray(event.messages)) {
      event.messages.slice(-200).forEach((message) => {
        if (typeof message?.id !== "string") return;
        saveChatMessage({
          id: message.id,
          spaceId: client.spaceId,
          payload: message,
          senderRole: message.senderRole === "owner" || message.senderRole === "lover" ? message.senderRole : client.role,
          createdAt: typeof message.sentAt === "string" ? message.sentAt : now(),
        }).catch((error) => console.error("Unable to persist chat history:", error));
      });
    }
    if (event.type === "chat" && typeof event.id === "string") {
      saveChatMessage({
        id: event.id,
        spaceId: client.spaceId,
        payload: event,
        senderRole: client.role,
        createdAt: typeof event.sentAt === "string" ? event.sentAt : now(),
      }).catch(() => undefined);
    }
    peers.forEach((peer) => {
      if (peer !== client && peer.readyState === 1) {
        peer.send(JSON.stringify({ ...event, sender: undefined, senderRole: client.role }));
      }
    });
  });
  client.on("close", () => {
    peers.delete(client);
    if (!peers.size) connectedSpaces.delete(client.spaceId);
    else peers.forEach((peer) => {
      if (peer.readyState === 1) peer.send(JSON.stringify({ type: "peer-left" }));
    });
  });
});

app.post("/api/messages", upload.single("image"), async (request, response, next) => {
  try {
    const message = typeof request.body.message === "string" ? request.body.message.trim() : "";
    const day = typeof request.body.day === "string" ? request.body.day.trim() : "";
    const sender = typeof request.body.sender === "string" ? request.body.sender.trim() : "Anonymous";

    if (!message && !request.file) {
      return response.status(400).json({ error: "A message or image is required." });
    }

    if (!resendApiKey || !messageRecipientEmail || !resendFromEmail) {
      return response.status(503).json({ error: "Message delivery is not configured." });
    }

    const email = {
      from: resendFromEmail,
      to: [messageRecipientEmail],
      subject: `New message from ${sender} on ${day}`,
      html: `
        <h2>New message from ${escapeHtml(sender)}</h2>
        <p><strong>Day:</strong> ${escapeHtml(day)}</p>
        <p>${escapeHtml(message || "(Image attachment only)")}</p>
      `,
      attachments: [],
    };
    if (request.file) {
      email.attachments.push({
        filename: request.file.originalname,
        content: request.file.buffer.toString("base64"),
      });
    }

    const providerResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(email),
    });
    if (!providerResponse.ok) {
      const providerError = await providerResponse.json().catch(() => null);
      throw new Error(
        providerError?.message || `Resend returned HTTP ${providerResponse.status}.`,
      );
    }
    const providerResult = await providerResponse.json();

    response.status(201).json({ message: "Message sent.", id: providerResult.id });
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return response.status(413).json({ error: "Images must be 5 MB or smaller." });
  }
  response.status(502).json({
    error: error instanceof Error ? error.message : "Unable to send the message.",
  });
});

app.use(express.static(frontendDist));
app.get("*", (_request, response) => response.sendFile(path.join(frontendDist, "index.html")));

httpServer.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
