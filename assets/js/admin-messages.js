const API_BASE = "http://localhost:3000";

const totalMessagesEl = document.getElementById("total-messages");
const lastMessageTimeEl = document.getElementById("last-message-time");
const messagesListEl = document.getElementById("messages-list");
const refreshBtn = document.getElementById("refresh-btn");
const apiStatusEl = document.getElementById("api-status");
const adminPasswordInput = document.getElementById("admin-password");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");

function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString();
}

function setApiStatus(text, isError = false) {
    apiStatusEl.textContent = text;
    apiStatusEl.classList.toggle("error", isError);
}

function renderMessages(messages) {
    messagesListEl.innerHTML = "";

    if (!Array.isArray(messages) || messages.length === 0) {
        messagesListEl.innerHTML = "<p class='empty-messages'>No messages yet.</p>";
        return;
    }

    messages.forEach((msg) => {
        const card = document.createElement("article");
        card.className = "message-card";
        card.innerHTML = `
            <div class="message-head">
                <h3 class="message-name">${msg.name || "Unknown"}</h3>
                <p class="message-date">${formatDate(msg.createdAt)}</p>
            </div>
            <p class="message-email"><strong>Email:</strong> ${msg.email || "-"}</p>
            <p class="message-body">${msg.message || ""}</p>
        `;
        messagesListEl.appendChild(card);
    });
}

async function apiFetch(path, options = {}) {
    return fetch(`${API_BASE}${path}`, {
        credentials: "include",
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });
}

function resetDashboard() {
    totalMessagesEl.textContent = "-";
    lastMessageTimeEl.textContent = "-";
    renderMessages([]);
}

async function checkSession() {
    try {
        const res = await apiFetch("/admin/session", { method: "GET" });
        return { ok: res.ok, status: res.status };
    } catch (_err) {
        return { ok: false, status: 0 };
    }
}

async function login() {
    const password = adminPasswordInput.value.trim();
    if (!password) {
        setApiStatus("Enter password first.", true);
        return;
    }

    loginBtn.disabled = true;
    try {
        const res = await apiFetch("/admin/login", {
            method: "POST",
            body: JSON.stringify({ password })
        });

        if (!res.ok) {
            if (res.status === 429) {
                setApiStatus("Too many attempts. Try again later.", true);
            } else {
                setApiStatus("Invalid password.", true);
            }
            return;
        }

        adminPasswordInput.value = "";
        setApiStatus("Authenticated.");
        await loadDashboard();
    } catch (_err) {
        setApiStatus("Cannot connect to API.", true);
    } finally {
        loginBtn.disabled = false;
    }
}

async function logout() {
    try {
        await apiFetch("/admin/logout", { method: "POST" });
    } catch (_err) {
        // Ignore network errors here.
    }

    resetDashboard();
    setApiStatus("Logged out.");
}

async function loadDashboard() {
    setApiStatus("Loading...");
    refreshBtn.disabled = true;

    try {
        const session = await checkSession();
        if (!session.ok) {
            resetDashboard();
            if (session.status === 503) {
                setApiStatus("Server not configured. Start backend with ADMIN_PASSWORD.", true);
            } else {
                setApiStatus("Login required.", true);
            }
            return;
        }

        const [statsRes, messagesRes] = await Promise.all([
            apiFetch("/contact/stats", { method: "GET" }),
            apiFetch("/contact/messages", { method: "GET" })
        ]);

        if (!statsRes.ok || !messagesRes.ok) {
            throw new Error("API request failed");
        }

        const stats = await statsRes.json();
        const payload = await messagesRes.json();

        totalMessagesEl.textContent = String(stats.count ?? 0);
        lastMessageTimeEl.textContent = formatDate(stats.lastMessageAt);
        renderMessages(payload.messages);
        setApiStatus("Connected.");
    } catch (_err) {
        resetDashboard();
        setApiStatus("Cannot connect to API. Start backend on port 3000.", true);
    } finally {
        refreshBtn.disabled = false;
    }
}

refreshBtn.addEventListener("click", loadDashboard);
loginBtn.addEventListener("click", login);
logoutBtn.addEventListener("click", logout);
adminPasswordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        login();
    }
});

document.addEventListener("DOMContentLoaded", loadDashboard);
