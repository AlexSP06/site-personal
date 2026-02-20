const express = require("express");
const cors = require("cors");
const fs = require("fs/promises");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const DATA_FILE = path.join(__dirname, "contact-messages.json");
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";

app.get("/", (_req, res) => {
    res.status(200).json({
        ok: true,
        message: "Contact API is running",
        endpoints: ["/contact", "/contact/stats", "/contact/messages"]
    });
});

app.get("/health", (_req, res) => {
    res.status(200).json({ ok: true });
});

function requireAdmin(req, res, next) {
    if (!ADMIN_TOKEN) {
        return res.status(503).json({ error: "Admin token is not configured on server" });
    }

    const token = req.get("x-admin-token");
    if (!token || token !== ADMIN_TOKEN) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    next();
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

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});
