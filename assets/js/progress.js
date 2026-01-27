console.log("progress.js loaded");

async function loadProgress() {
    const container = document.getElementById("progress-container");

container.appendChild(test);

    try {
        const res = await fetch("asset/js/progress.json");
        const data = await res.json();

        container.innerHTML = "";

        data.forEach(item => {
            const card = document.createElement("div");
            card.classList.add("card");

            card.innerHTML = `
                <div class="date">${item.date}</div>
                <h2>${item.title}</h2>
                <p>${item.description}</p>
                ${item.image ? `<img src="${item.image}" class="progress-image" />` : ""}
            `;

            container.appendChild(card);
        });
    } catch (err) {
        container.innerHTML = "<p>Could not load progress.</p>";
        console.error(err);
    }
}

loadProgress();
