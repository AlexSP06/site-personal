console.log("projects.js loaded");

async function loadProjects() {
    const container = document.getElementById("projects-container");
    if (!container) return;

    try {
        // Prefer relative path so it works regardless of deployment root.
        const candidates = ["./data/projects.json", "data/projects.json", "/data/projects.json"];
        let res = null;

        for (const url of candidates) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    res = response;
                    break;
                }
            } catch (_) {
                // Try next candidate path.
            }
        }

        if (!res) throw new Error("Failed to load projects.json from any known path.");

        const data = await res.json();
        console.log("Loaded projects:", data);

        container.innerHTML = "";

        // Group projects by category
        const grouped = {};
        data.forEach(project => {
            const category = project.category || "Other";
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(project);
        });

        // Create sections for each category
        Object.keys(grouped).forEach(category => {
            const section = document.createElement("section");
            section.classList.add("projects-section");
            
            const heading = document.createElement("h2");
            heading.textContent = category;
            section.appendChild(heading);
            
            const cardsContainer = document.createElement("div");
            cardsContainer.classList.add("projects-cards");
            
            grouped[category].forEach(project => {
                const card = document.createElement("div");
                card.classList.add("project-card");

                const technologies = Array.isArray(project.technologies)
                    ? project.technologies.join(", ")
                    : "N/A";

                card.innerHTML = `
                    <h3>${project.title}</h3>
                    <p>${project.description}</p>
                    <p><strong>Technologies:</strong> ${technologies}</p>
                    <p><strong>Status:</strong> ${project.status}</p>
                    ${project.image ? `<img src="${project.image}" class="project-image" />` : ""}
                `;

                cardsContainer.appendChild(card);
            });
            
            section.appendChild(cardsContainer);
            container.appendChild(section);
        });
        
    } catch (err) {
        container.innerHTML = "<p class='error'>Could not load projects data.</p>";
        console.error("Error loading projects:", err);
    }
}

// Load when page is ready
document.addEventListener('DOMContentLoaded', loadProjects);
