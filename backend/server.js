const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/contact", (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: "Missing fields" });
    }

    console.log("New contact message:");
    console.log("Name:", name);
    console.log("Email:", email);
    console.log("Message:", message);

    // aici mai târziu:
    // - trimitere email
    // - salvare DB
    // - notificare

    res.status(200).json({ success: true });
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});

