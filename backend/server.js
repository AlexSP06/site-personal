const express = require("express");
const cors = require("cors");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const DATA_FILE = path.join(__dirname, "contact-messages.json");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const ADMIN_SESSION_COOKIE = "admin_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const LOGIN_MAX_FAILS = 5;
const LOGIN_BLOCK_MS = 15 * 60 * 1000;

const sessions = new Map();
const loginAttempts = new Map();

app.get("/", (_req, res) => {
    res.status(200).json({
        ok: true,
        message: "Contact API is running",
        endpoints: ["/contact", "/admin/login", "/admin/session", "/contact/stats", "/contact/messages"]
    });
});

app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
});

function parseCookies(headerValue) {
    const out = {};
    if (!headerValue) return out;

    const pairs = headerValue.split(";");
    for (const pair of pairs) {
        const idx = pair.indexOf("=");
        if (idx < 0) continue;
        const key = pair.slice(0, idx).trim();
        const value = pair.slice(idx + 1).trim();
        out[key] = decodeURIComponent(value);
    }
    return out;
}

function createSession() {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + SESSION_TTL_MS;
    sessions.set(token, expiresAt);
    return { token, expiresAt };
}

function invalidateSession(token) {
    if (token) sessions.delete(token);
}

function isSessionValid(token) {
    if (!token) return false;
    const expiresAt = sessions.get(token);
    if (!expiresAt) return false;
    if (Date.now() > expiresAt) {
        sessions.delete(token);
        return false;
    }
    return true;
}

function requireAdmin(req, res, next) {
    if (!ADMIN_PASSWORD) {
        return res.status(503).json({ error: "Admin password is not configured on server" });
    }

    const cookies = parseCookies(req.headers.cookie || "");
    const token = cookies[ADMIN_SESSION_COOKIE];

    if (!isSessionValid(token)) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    next();
}

function getClientIp(req) {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.length > 0) {
        return forwarded.split(",")[0].trim();
    }
    return req.socket?.remoteAddress || "unknown";
}

function getLoginState(ip) {
    const current = loginAttempts.get(ip) || { fails: 0, blockedUntil: 0 };
    if (current.blockedUntil && Date.now() > current.blockedUntil) {
        const reset = { fails: 0, blockedUntil: 0 };
        loginAttempts.set(ip, reset);
        return reset;
    }
    return current;
}

async function readStore() {
    try {
        const raw = await fs.readFile(DATA_FILE, "utf8");
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed.messages)) {
            return { messages: [] };
        }
        return parsed;
    } catch (err) {
        if (err.code === "ENOENT") {
            return { messages: [] };
        }
        throw err;
    }
}

async function writeStore(store) {
    await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

app.post("/contact", async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: "Missing fields" });
    }

    try {
        const store = await readStore();
        const entry = {
            id: Date.now(),
            name: String(name).trim(),
            email: String(email).trim(),
            message: String(message).trim(),
            createdAt: new Date().toISOString()
        };

        store.messages.push(entry);
        await writeStore(store);

        res.status(200).json({ success: true, totalMessages: store.messages.length });
    } catch (err) {
        console.error("Failed to store contact message:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.post("/admin/login", (req, res) => {
    if (!ADMIN_PASSWORD) {
        return res.status(503).json({ error: "Admin password is not configured on server" });
    }

    const ip = getClientIp(req);
    const state = getLoginState(ip);
    if (state.blockedUntil && Date.now() < state.blockedUntil) {
        return res.status(429).json({ error: "Too many attempts. Try again later." });
    }

    const password = String(req.body?.password || "");
    if (!password || password !== ADMIN_PASSWORD) {
        const nextFails = state.fails + 1;
        const blockedUntil = nextFails >= LOGIN_MAX_FAILS ? Date.now() + LOGIN_BLOCK_MS : 0;
        loginAttempts.set(ip, { fails: nextFails, blockedUntil });
        return res.status(401).json({ error: "Invalid credentials" });
    }

    loginAttempts.set(ip, { fails: 0, blockedUntil: 0 });

    const { token } = createSession();
    const maxAgeSec = Math.floor(SESSION_TTL_MS / 1000);

    res.setHeader(
        "Set-Cookie",
        `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax`
    );

    return res.status(200).json({ success: true });
});

app.post("/admin/logout", (req, res) => {
    const cookies = parseCookies(req.headers.cookie || "");
    const token = cookies[ADMIN_SESSION_COOKIE];
    invalidateSession(token);

    res.setHeader(
        "Set-Cookie",
        `${ADMIN_SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
    );

    return res.status(200).json({ success: true });
});

app.get("/admin/session", requireAdmin, (_req, res) => {
    res.status(200).json({ authenticated: true });
});

app.get("/contact/stats", requireAdmin, async (_req, res) => {
    try {
        const store = await readStore();
        const count = store.messages.length;
        const last = count > 0 ? store.messages[count - 1] : null;

        res.status(200).json({
            count,
            lastMessageAt: last ? last.createdAt : null
        });
    } catch (err) {
        console.error("Failed to read contact stats:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/contact/messages", requireAdmin, async (_req, res) => {
    try {
        const store = await readStore();
        res.status(200).json({
            count: store.messages.length,
            messages: store.messages.slice(-20).reverse()
        });
    } catch (err) {
        console.error("Failed to read contact messages:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

setInterval(() => {
    const now = Date.now();
    for (const [token, expiresAt] of sessions.entries()) {
        if (expiresAt <= now) sessions.delete(token);
    }
}, 10 * 60 * 1000).unref();

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
