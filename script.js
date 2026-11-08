"use strict";

// Add your own TMDB v3 API key here. Do not commit private credentials to a public repository.
// A browser-only GitHub Pages project exposes any key placed in this file.
const TMDB_API_KEY = "";
const API_BASE = "https://tmdb-movie-api-220914907216.us-east1.run.app";
const POSTER_BASE = "https://image.tmdb.org/t/p/w500";
const WATCHLIST_KEY = "tmdb-movie-explorer-watchlist";
let previousPage = "now-showing";
let watchlist = loadWatchlist();

function loadWatchlist() {
  try {
    const saved = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch { return []; }
}
function saveWatchlist() {
  try { localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist)); }
  catch { console.warn("Watchlist could not be saved in this browser."); }
  updateWatchCount();
}
function updateWatchCount() {
  document.getElementById("watch-count").textContent = `(${watchlist.length})`;
}
async function api(endpoint, params = {}) {
  const url = new URL(API_BASE);
  url.searchParams.set("endpoint", endpoint);
  url.searchParams.set("language", "en-US");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Movie request failed (${response.status}).`);
  }
  return response.json();
}
function setStatus(id, message) { document.getElementById(id).textContent = message; }
function showPage(id) {
  if (!document.getElementById(id)?.classList.contains("page")) id = "home";
  document.querySelectorAll(".page").forEach(page => page.classList.toggle("active", page.id === id));
  document.querySelectorAll("nav a").forEach(link => {
    if (link.getAttribute("href") === `#${id}`) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  if (id === "watchlist") renderWatchlist();
  if (id === "now-showing" && !document.getElementById("movie-grid").children.length) loadPopular();
  window.scrollTo({top: 0, behavior: "smooth"});
}
function navigate() { showPage(location.hash.replace("#", "") || "home"); }
function makePoster(movie) {
  if (movie.poster_path) {
    const img = document.createElement("img");
    img.className = "movie-poster";
    img.src = POSTER_BASE + movie.poster_path;
    img.alt = `Poster for ${movie.title || "movie"}`;
    img.loading = "lazy";
    return img;
  }
  const fallback = document.createElement("div");
  fallback.className = "poster-fallback";
  fallback.textContent = "🎬 Poster Unavailable";
  return fallback;
}
function renderMovies(movies, targetId) {
  const container = document.getElementById(targetId);
  container.replaceChildren();
  if (!movies.length) {
    const message = document.createElement("p");
    message.textContent = "No movies found. Try a different search.";
    container.append(message);
    return;
  }
  movies.forEach(movie => {
    const card = document.createElement("article");
    card.className = "movie-card";
    const posterButton = document.createElement("button");
    posterButton.type = "button";
    posterButton.className = "poster-button";
    posterButton.setAttribute("aria-label", `View details for ${movie.title}`);
    posterButton.append(makePoster(movie));
    posterButton.addEventListener("click", () => showDetails(movie.id));
    const info = document.createElement("div");
    info.className = "movie-info";
    const title = document.createElement("h3");
    title.textContent = movie.title || "Untitled Movie";
    const meta = document.createElement("p");
    meta.textContent = `${(movie.release_date || "").slice(0, 4) || "Year unknown"} · ⭐ ${typeof movie.vote_average === "number" ? movie.vote_average.toFixed(1) : "N/A"}`;
    const details = document.createElement("button");
    details.type = "button";
    details.textContent = "View Details";
    details.addEventListener("click", () => showDetails(movie.id));
    const save = document.createElement("button");
    save.type = "button";
    save.className = "secondary-button";
    save.textContent = watchlist.some(item => item.id === movie.id) ? "♥ Remove from Watchlist" : "♡ Add to Watchlist";
    save.addEventListener("click", () => {
      toggleWatchlist(movie);
      save.textContent = watchlist.some(item => item.id === movie.id) ? "♥ Remove from Watchlist" : "♡ Add to Watchlist";
      if (targetId === "watchlist-grid") renderWatchlist();
    });
    info.append(title, meta, details, save);
    card.append(posterButton, info);
    container.append(card);
  });
}
function toggleWatchlist(movie) {
  const index = watchlist.findIndex(item => item.id === movie.id);
  if (index >= 0) watchlist.splice(index, 1);
  else watchlist.push({id: movie.id, title: movie.title, poster_path: movie.poster_path, release_date: movie.release_date, vote_average: movie.vote_average});
  saveWatchlist();
}
function renderWatchlist() {
  setStatus("watchlist-status", watchlist.length ? `${watchlist.length} saved movie(s)` : "Your watchlist is empty. Add movies to see them here!");
  renderMovies(watchlist, "watchlist-grid");
}
async function loadPopular() {
  setStatus("movies-status", "Loading popular movies...");
  try {
    const data = await api("/movie/popular");
    renderMovies(data.results || [], "movie-grid");
    setStatus("movies-status", "Popular movies");
  } catch (error) { setStatus("movies-status", error.message); }
}
async function searchMovies(event) {
  event.preventDefault();
  const query = document.getElementById("search-input").value.trim();
  if (!query) return;
  setStatus("movies-status", `Searching for “${query}”...`);
  document.getElementById("movie-grid").replaceChildren();
  try {
    const data = await api("/search/movie", {query, include_adult: false});
    renderMovies(data.results || [], "movie-grid");
    setStatus("movies-status", `Results for “${query}”`);
  } catch (error) { setStatus("movies-status", error.message); }
}
async function loadGenres() {
  try {
    const data = await api("/genre/movie/list");
    const select = document.getElementById("genre-select");
    (data.genres || []).forEach(genre => {
      const option = document.createElement("option");
      option.value = genre.id;
      option.textContent = genre.name;
      select.append(option);
    });
  } catch (error) { setStatus("discover-status", error.message); }
}
async function discoverGenre(genreId, targetId, statusId) {
  if (!genreId) { setStatus(statusId, "Please choose a genre first."); return; }
  setStatus(statusId, "Finding your movies...");
  document.getElementById(targetId).replaceChildren();
  try {
    const data = await api("/discover/movie", {with_genres: genreId, sort_by: "popularity.desc", include_adult: false});
    renderMovies(data.results || [], targetId);
    setStatus(statusId, `${(data.results || []).length} movie suggestions`);
  } catch (error) { setStatus(statusId, error.message); }
}
async function showDetails(id) {
  previousPage = document.querySelector(".page.active")?.id || "now-showing";
  location.hash = "details";
  const container = document.getElementById("details-content");
  container.textContent = "Loading movie details...";
  try {
    const movie = await api(`/movie/${encodeURIComponent(id)}`);
    const panel = document.createElement("article");
    panel.className = "detail-panel";
    const poster = makePoster(movie);
    const body = document.createElement("div");
    const title = document.createElement("h1");
    title.textContent = movie.title;
    const meta = document.createElement("p");
    meta.textContent = `${movie.release_date || "Release date unknown"} · ⭐ ${movie.vote_average?.toFixed(1) || "N/A"} · ${movie.runtime || "?"} minutes`;
    const genres = document.createElement("p");
    genres.textContent = (movie.genres || []).map(item => item.name).join(" · ");
    const overview = document.createElement("p");
    overview.textContent = movie.overview || "No description available.";
    const save = document.createElement("button");
    save.textContent = watchlist.some(item => item.id === movie.id) ? "♥ Remove from Watchlist" : "♡ Add to Watchlist";
    save.addEventListener("click", () => {
      toggleWatchlist(movie);
      save.textContent = watchlist.some(item => item.id === movie.id) ? "♥ Remove from Watchlist" : "♡ Add to Watchlist";
    });
    const tmdbLink = document.createElement("p");
    const link = document.createElement("a");
    link.href = `https://www.themoviedb.org/movie/${movie.id}`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "View on TMDB ↗";
    tmdbLink.append(link);
    body.append(title, meta, genres, overview, save, tmdbLink);
    panel.append(poster, body);
    container.replaceChildren(panel);
  } catch (error) { container.textContent = error.message; }
}
window.addEventListener("hashchange", navigate);
document.getElementById("search-form").addEventListener("submit", searchMovies);
document.getElementById("popular-button").addEventListener("click", loadPopular);
document.getElementById("discover-button").addEventListener("click", () => discoverGenre(document.getElementById("genre-select").value, "discover-grid", "discover-status"));
document.querySelectorAll("[data-genre]").forEach(button => button.addEventListener("click", () => discoverGenre(button.dataset.genre, "quiz-grid", "quiz-status")));
document.getElementById("back-button").addEventListener("click", () => { location.hash = previousPage; });
updateWatchCount();
navigate();
loadGenres();
