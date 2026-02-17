console.log("projects.js loaded");

async function loadProjects() {
    const container = document.getElementById("projects-container");

    try {
        // Load projects data
        const res = await fetch("../../data/projects.json");
        
        if (!res.ok) {
            throw new Error(`Failed to load: ${res.status}`);
        }
        
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

                const technologies = project.technologies.join(", ");

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
