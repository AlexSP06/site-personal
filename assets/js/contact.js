const form = document.getElementById("contactForm");
const statusText = document.getElementById("form-status");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const message = document.getElementById("message").value.trim();

    if (!name || !email || !message) {
        statusText.textContent = "All fields are required.";
        statusText.className = "form-status error";
        return;
    }

    try {
        const res = await fetch("http://localhost:3000/contact", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, email, message })
        });

        if (!res.ok) throw new Error();

        statusText.textContent = "Message sent successfully!";
        statusText.className = "form-status success";
        form.reset();

    } catch (err) {
        statusText.textContent = "Server error. Try again later.";
        statusText.className = "form-status error";
    }
});
