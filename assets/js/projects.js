const PROJECTS_DATA_PATHS = ["./data/projects.json", "data/projects.json", "/data/projects.json"];
const PROJECTS_ERROR_HTML = "<p class='error'>Could not load projects data.</p>";

function normalizePath(value) {
    return String(value || "").trim().replace(/\\/g, "/");
}

function buildImageCandidates(imagePath) {
    const raw = normalizePath(imagePath);
    if (!raw) return [];

    const fileName = raw.split("/").pop();
    const list = [raw];

    if (fileName) {
        list.push(`assets/img/${fileName}`);
    }

    // Unique, URI-safe paths.
    return [...new Set(list)].map((item) => encodeURI(item));
}

function createProjectImage(imagePath, altText) {
    const candidates = buildImageCandidates(imagePath);
    if (!candidates.length) return null;

    const img = document.createElement("img");
    img.className = "project-image";
    img.alt = altText || "Project image";
    img.loading = "lazy";

    let index = 0;
    const tryNext = () => {
        if (index >= candidates.length) {
            img.remove();
            return;
        }
        img.src = candidates[index++];
    };

    img.addEventListener("error", tryNext);
    tryNext();
    return img;
}

async function loadProjects() {
    const container = document.getElementById("projects-container");
    if (!container) return;

    try {
        const res = await fetchProjectsData();
        if (!res) throw new Error("Failed to load projects.json from any known path.");

        const data = await res.json();
        container.innerHTML = "";
        renderProjectSections(container, data);
    } catch (err) {
        container.innerHTML = PROJECTS_ERROR_HTML;
        console.error("Error loading projects:", err);
    }
}

async function fetchProjectsData() {
    for (const url of PROJECTS_DATA_PATHS) {
        try {
            const response = await fetch(url);
            if (response.ok) return response;
        } catch (_) {
            // Try the next candidate path.
        }
    }
    return null;
}

function groupProjectsByCategory(projects) {
    const grouped = {};
    for (const project of projects) {
        const category = project.category || "Other";
        if (!grouped[category]) grouped[category] = [];
        grouped[category].push(project);
    }
    return grouped;
}

function createProjectCard(project) {
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
    `;

    const imageEl = createProjectImage(project.image, project.title);
    if (imageEl) card.appendChild(imageEl);

    return card;
}

function renderProjectSections(container, projects) {
    const grouped = groupProjectsByCategory(projects);

    for (const category of Object.keys(grouped)) {
        const section = document.createElement("section");
        section.classList.add("projects-section");

        const heading = document.createElement("h2");
        heading.textContent = category;
        section.appendChild(heading);

        const cardsContainer = document.createElement("div");
        cardsContainer.classList.add("projects-cards");

        for (const project of grouped[category]) {
            cardsContainer.appendChild(createProjectCard(project));
        }

        section.appendChild(cardsContainer);
        container.appendChild(section);
    }
}

// Load when page is ready
document.addEventListener('DOMContentLoaded', loadProjects);
