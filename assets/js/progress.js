console.log("progress.js loaded");

async function loadProgress() {
    const container = document.getElementById("progress-container");

    try {
        // Use absolute path from site root for better compatibility
        const res = await fetch("/data/progress.json");
        
        if (!res.ok) {
            throw new Error(`Failed to load: ${res.status}`);
        }
        
        const data = await res.json();
        console.log("Loaded data:", data);

        container.innerHTML = "";

        // Group progress by month/year
        const grouped = {};
        data.forEach(item => {
            const date = new Date(item.date.split('-').reverse().join('-'));
            const monthYear = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
            
            if (!grouped[monthYear]) {
                grouped[monthYear] = [];
            }
            grouped[monthYear].push(item);
        });

        // Create accordion sections for each month
        Object.keys(grouped).reverse().forEach(monthYear => {
            const section = document.createElement("div");
            section.classList.add("month-section");
            
            const header = document.createElement("div");
            header.classList.add("month-header");
            header.innerHTML = `<span class="month-title">${monthYear}</span><span class="toggle-icon">▼</span>`;
            
            const itemsContainer = document.createElement("div");
            itemsContainer.classList.add("month-items");
            itemsContainer.style.display = "block";
            
            grouped[monthYear].forEach(item => {
                const card = document.createElement("div");
                card.classList.add("card");

                card.innerHTML = `
                    <div class="date">${item.date}</div>
                    <h2>${item.title}</h2>
                    <p>${item.description}</p>
                    ${item.image ? `<img src="${item.image}" class="progress-image" />` : ""}
                `;

                itemsContainer.appendChild(card);
            });
            
            header.addEventListener('click', () => {
                const isVisible = itemsContainer.style.display !== "none";
                itemsContainer.style.display = isVisible ? "none" : "block";
                header.classList.toggle("expanded");
            });
            
            section.appendChild(header);
            section.appendChild(itemsContainer);
            container.appendChild(section);
        });
        
    } catch (err) {
        container.innerHTML = "<p class='error'>Could not load progress data.</p>";
        console.error("Error loading progress:", err);
    }
}

// Load when page is ready
document.addEventListener('DOMContentLoaded', loadProgress);