const API_BASE = "http://localhost:3000";
const TOKEN_STORAGE_KEY = "messages_admin_token";

const totalMessagesEl = document.getElementById("total-messages");
const lastMessageTimeEl = document.getElementById("last-message-time");
const messagesListEl = document.getElementById("messages-list");
const refreshBtn = document.getElementById("refresh-btn");
const apiStatusEl = document.getElementById("api-status");
const adminTokenInput = document.getElementById("admin-token");
const saveTokenBtn = document.getElementById("save-token-btn");

function getSavedToken() {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || "";
}

function saveToken(value) {
    localStorage.setItem(TOKEN_STORAGE_KEY, value.trim());
}

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

async function loadDashboard() {
    setApiStatus("Loading...");
    refreshBtn.disabled = true;
    const token = getSavedToken();

    if (!token) {
        totalMessagesEl.textContent = "-";
        lastMessageTimeEl.textContent = "-";
        renderMessages([]);
        setApiStatus("Set admin token first.", true);
        refreshBtn.disabled = false;
        return;
    }

    try {
        const headers = { "x-admin-token": token };
        const [statsRes, messagesRes] = await Promise.all([
            fetch(`${API_BASE}/contact/stats`, { headers }),
            fetch(`${API_BASE}/contact/messages`, { headers })
        ]);

        if (!statsRes.ok || !messagesRes.ok) {
            throw new Error(statsRes.status === 401 || messagesRes.status === 401 ? "UNAUTHORIZED" : "API_FAILED");
        }

        const stats = await statsRes.json();
        const payload = await messagesRes.json();

        totalMessagesEl.textContent = String(stats.count ?? 0);
        lastMessageTimeEl.textContent = formatDate(stats.lastMessageAt);
        renderMessages(payload.messages);
        setApiStatus("Connected to API");
    } catch (err) {
        totalMessagesEl.textContent = "-";
        lastMessageTimeEl.textContent = "-";
        renderMessages([]);
        if (err.message === "UNAUTHORIZED") {
            setApiStatus("Invalid token.", true);
        } else {
            setApiStatus("Cannot connect to API. Start backend on port 3000.", true);
        }
    } finally {
        refreshBtn.disabled = false;
    }
}

function initTokenUI() {
    adminTokenInput.value = getSavedToken();
    saveTokenBtn.addEventListener("click", () => {
        saveToken(adminTokenInput.value);
        setApiStatus("Token saved locally.");
    });
}

refreshBtn.addEventListener("click", loadDashboard);
document.addEventListener("DOMContentLoaded", () => {
    initTokenUI();
    loadDashboard();
});
