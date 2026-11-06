const TMDB_API_KEY = "49cb96f4";

const API_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

const grid = document.getElementById("movie-grid");
const statusBox = document.getElementById("status");

let currentSection = "popular";
let currentPage = 1;
let currentQuery = "";
let totalPages = 1;

function getFavorites() {
    try {
        return JSON.parse(
            localStorage.getItem("cinelist_favorites")
        ) || [];
    } catch {
        return [];
    }
}

function saveFavorites(items) {
    localStorage.setItem(
        "cinelist_favorites",
        JSON.stringify(items)
    );

    updateFavoriteCount();
}

function updateFavoriteCount() {
    document.getElementById("favorite-count").textContent =
        getFavorites().length;
}

function getPoster(path) {
    return path ? IMAGE_BASE + path : "";
}

async function apiRequest(path, params = {}) {
    if (
        !TMDB_API_KEY ||
        TMDB_API_KEY === "MASUKKAN_API_KEY_TMDB_DI_SINI"
    ) {
        throw new Error("API Key belum dimasukkan!");
    }

    const url = new URL(API_BASE + path);

    url.search = new URLSearchParams({
        api_key: TMDB_API_KEY,
        language: "id-ID",
        ...params
    });

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Gagal mengambil data film!");
    }

    return await response.json();
}

function setSectionInfo() {
    const info = {
        popular: [
            "HANDPICKED BY THE CROWD",
            "Film Popular",
            "Film yang sedang banyak diminati."
        ],

        latest: [
            "FRESH FROM THE CINEMA",
            "Film Terbaru",
            "Film yang sedang tayang di bioskop."
        ],

        favorites: [
            "YOUR PERSONAL COLLECTION",
            "Favorit Saya",
            "Kumpulan film yang kamu simpan."
        ]
    };

    const selected = info[currentSection];

    document.getElementById("section-kicker").textContent =
        selected[0];

    document.getElementById("section-title").textContent =
        selected[1];

    document.getElementById("section-subtitle").textContent =
        selected[2];
}

function renderMovies(movies) {
    grid.innerHTML = "";
    statusBox.textContent = "";

    if (movies.length === 0) {
        grid.innerHTML = `
            <p>Belum ada film ditemukan.</p>
        `;
        return;
    }

    const favorites = getFavorites();

    movies.forEach(movie => {
        const saved = favorites.some(
            item => item.id === movie.id
        );

        const card = document.createElement("div");

        card.className = "movie-card";

        card.innerHTML = `
            <div class="poster-wrap">

                <img
                    src="${getPoster(movie.poster_path)}"
                    alt="${movie.title}"
                    loading="lazy"
                >

                <span class="rating">
                    ★ ${Number(movie.vote_average || 0).toFixed(1)}
                </span>

                <button
                    class="favorite-btn ${saved ? "saved" : ""}"
                    data-favorite="${movie.id}"
                >
                    ${saved ? "♥" : "♡"}
                </button>

            </div>

            <div class="movie-info">
                <h3 class="movie-title">
                    ${movie.title || movie.original_title}
                </h3>

                <div class="movie-meta">
                    <span>
                        ${(movie.release_date || "").slice(0, 4)}
                    </span>
                    <span>Film</span>
                </div>
            </div>
        `;

        card.addEventListener("click", event => {
            if (!event.target.closest(".favorite-btn")) {
                openMovieDetails(movie.id);
            }
        });

        card.querySelector(".favorite-btn")
            .addEventListener("click", event => {
                event.stopPropagation();
                toggleFavorite(movie);
            });

        grid.appendChild(card);
    });
}

function toggleFavorite(movie) {
    let favorites = getFavorites();

    const exists = favorites.some(
        item => item.id === movie.id
    );

    if (exists) {
        favorites = favorites.filter(
            item => item.id !== movie.id
        );
    } else {
        favorites.push(movie);
    }

    saveFavorites(favorites);

    if (currentSection === "favorites") {
        loadFavorites();
    } else {
        renderMovies(window.currentMovies || []);
    }
}

async function loadMovies() {
    statusBox.textContent = "Memuat film...";
    grid.innerHTML = "";

    document.getElementById("pagination").style.display =
        currentQuery ? "none" : "flex";

    try {
        let endpoint;

        if (currentQuery) {
            endpoint = "/search/movie";
        } else if (currentSection === "latest") {
            endpoint = "/movie/now_playing";
        } else {
            endpoint = "/movie/popular";
        }

        const params = currentQuery
            ? {
                query: currentQuery,
                page: currentPage,
                include_adult: "false"
            }
            : {
                page: currentPage
            };

        const data = await apiRequest(endpoint, params);

        totalPages = Math.min(data.total_pages || 1, 500);

        window.currentMovies = data.results || [];

        renderMovies(window.currentMovies);

        updatePagination();

    } catch (error) {
        statusBox.textContent = error.message;
    }
}

function loadFavorites() {
    currentQuery = "";

    setSectionInfo();

    document.getElementById("pagination").style.display =
        "none";

    renderMovies(getFavorites());
}

function updatePagination() {
    document.getElementById("page-label").textContent =
        `Halaman ${currentPage} dari ${totalPages}`;

    document.getElementById("prev-page").disabled =
        currentPage <= 1;

    document.getElementById("next-page").disabled =
        currentPage >= totalPages;
}

async function openMovieDetails(id) {
    const backdrop = document.getElementById("modal-backdrop");

    backdrop.classList.add("show");

    const content = document.getElementById("modal-content");

    content.innerHTML = "Memuat detail film...";

    try {
        const movie = await apiRequest(`/movie/${id}`);

        const saved = getFavorites().some(
            item => item.id === movie.id
        );

        content.innerHTML = `
            <div class="detail-layout">

                <img
                    class="detail-poster"
                    src="${getPoster(movie.poster_path)}"
                    alt="${movie.title}"
                >

                <div class="detail-copy">

                    <h2>${movie.title}</h2>

                    <p class="detail-meta">
                        ★ ${Number(movie.vote_average || 0).toFixed(1)}
                        • ${(movie.release_date || "").slice(0, 4)}
                        • ${movie.runtime || "-"} menit
                    </p>

                    <p class="detail-overview">
                        ${movie.overview || "Sinopsis belum tersedia."}
                    </p>

                    <button id="modal-favorite" class="primary-btn">
                        ${saved ? "♥ Hapus dari Favorit" : "♡ Tambah ke Favorit"}
                    </button>

                </div>
            </div>
        `;

        document.getElementById("modal-favorite")
            .addEventListener("click", () => {
                toggleFavorite(movie);
                openMovieDetails(id);
            });

    } catch (error) {
        content.textContent = error.message;
    }
}

function closeModal() {
    document.getElementById("modal-backdrop")
        .classList.remove("show");
}

document.querySelectorAll(".nav-btn").forEach(button => {
    button.addEventListener("click", () => {

        document.querySelectorAll(".nav-btn")
            .forEach(item => item.classList.remove("active"));

        button.classList.add("active");

        currentSection = button.dataset.section;
        currentPage = 1;
        currentQuery = "";

        setSectionInfo();

        if (currentSection === "favorites") {
            loadFavorites();
        } else {
            loadMovies();
        }
    });
});

document.getElementById("search-form")
    .addEventListener("submit", event => {

        event.preventDefault();

        const query = document.getElementById("search-input")
            .value.trim();

        if (!query) return;

        currentQuery = query;
        currentPage = 1;

        document.getElementById("section-title").textContent =
            "Hasil Pencarian";

        document.getElementById("section-subtitle").textContent =
            `Hasil untuk "${query}"`;

        loadMovies();
    });

document.getElementById("prev-page")
    .addEventListener("click", () => {
        if (currentPage > 1) {
            currentPage--;
            loadMovies();
        }
    });

document.getElementById("next-page")
    .addEventListener("click", () => {
        if (currentPage < totalPages) {
            currentPage++;
            loadMovies();
        }
    });

document.getElementById("refresh-btn")
    .addEventListener("click", () => {
        if (currentSection === "favorites" && !currentQuery) {
            loadFavorites();
        } else {
            loadMovies();
        }
    });

document.getElementById("explore-btn")
    .addEventListener("click", () => {
        document.getElementById("movie-section")
            .scrollIntoView({ behavior: "smooth" });
    });

document.getElementById("modal-close")
    .addEventListener("click", closeModal);

document.getElementById("modal-backdrop")
    .addEventListener("click", event => {
        if (event.target.id === "modal-backdrop") {
            closeModal();
        }
    });

document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeModal();
});

updateFavoriteCount();
setSectionInfo();
loadMovies();