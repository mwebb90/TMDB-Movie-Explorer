const API_URL = "https://tmdb-movie-api-220914907216.us-east1.run.app";
const IMAGE_URL = "https://image.tmdb.org/t/p/w500";
const WATCHLIST_KEY = "tmdb-watchlist";
const movieGrid = document.getElementById("discover-movie-grid");
const statusText = document.getElementById("discover-status");
const searchForm = document.getElementById("movie-search-form");
const searchInput = document.getElementById("movie-search");
const genreFilter = document.getElementById("genre-filter");
const yearFilter = document.getElementById("year-filter");
const sortFilter = document.getElementById("sort-filter");
const pagination = document.getElementById("discover-pagination");
const detailsSection = document.getElementById("discover-details");
const detailsContent = document.getElementById("discover-details-content");
const resultsSection = document.querySelector(".discover-results");
let currentPage = 1;
let currentMovies = [];
async function getMovies(endpoint, params = {}) {
  const url = new URL(API_URL);
  url.searchParams.set("endpoint", endpoint);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value != null) {
      url.searchParams.set(key, String(value));
    }
  });
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Unable to load movies.");
  }
  return response.json();
}
function getWatchlist() {
  try {
    return JSON.parse(localStorage.getItem(WATCHLIST_KEY)) || [];
  } catch {
    return [];
  }
}
function isSaved(id) {
  return getWatchlist().some(movie => movie.id === id);
}
function toggleWatchlist(movie) {
  let list = getWatchlist();
  if (isSaved(movie.id)) {
    list = list.filter(item => item.id !== movie.id);
  } else {
    list.push(movie);
  }
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
  renderMovies(currentMovies);
}
function createMovieCard(movie) {
  const card = document.createElement("article");
  card.className = "discover-movie-card";
  const poster = document.createElement("img");
  poster.src = movie.poster_path
    ? IMAGE_URL + movie.poster_path
    : "";
  poster.alt = movie.title || "Movie poster";
  const title = document.createElement("h3");
  title.textContent = movie.title || "Untitled Movie";
  const rating = document.createElement("div");
  rating.className = "rating";
  rating.textContent = `⭐ ${(movie.vote_average || 0).toFixed(1)}`;
  const actions = document.createElement("div");
  actions.className = "discover-card-actions";
  const detailsButton = document.createElement("button");
  detailsButton.className = "details-button";
  detailsButton.textContent = "View Details";
  detailsButton.addEventListener("click", () => showDetails(movie.id));
  const heartButton = document.createElement("button");
  heartButton.className = "heart-button";
  heartButton.textContent = isSaved(movie.id) ? "♥" : "♡";
  heartButton.classList.toggle("saved", isSaved(movie.id));
  heartButton.setAttribute("aria-label", "Toggle watchlist");
  heartButton.addEventListener("click", () => toggleWatchlist(movie));
  actions.append(detailsButton, heartButton);
  card.append(poster, title, rating, actions);
  return card;
}
function renderMovies(movies) {
  currentMovies = movies;
  movieGrid.replaceChildren();
  if (!movies.length) {
    statusText.textContent = "No movies found.";
    return;
  }
  statusText.textContent = "";
  movies.forEach(movie => {
    movieGrid.appendChild(createMovieCard(movie));
  });
}
async function loadMovies(page = 1) {
  currentPage = page;
  statusText.textContent = "Loading movies...";
  detailsSection.hidden = true;
  resultsSection.hidden = false;
  const query = searchInput.value.trim();
  try {
    const endpoint = query ? "search/movie" : "discover/movie";
    const params = { page };
    if (query) {
      params.query = query;
    } else {
      if (genreFilter.value) params.with_genres = genreFilter.value;
    }
    const data = await getMovies(endpoint, params);
    let movies = data.results || [];
    if (yearFilter.value) {
      movies = movies.filter(movie =>
        (movie.release_date || "").startsWith(yearFilter.value)
      );
    }
    if (sortFilter.value === "vote_average.desc") {
      movies.sort((a, b) => b.vote_average - a.vote_average);
    } else if (sortFilter.value === "release_date.desc") {
      movies.sort((a, b) =>
        (b.release_date || "").localeCompare(a.release_date || "")
      );
    } else if (sortFilter.value === "title.asc") {
      movies.sort((a, b) => a.title.localeCompare(b.title));
    }
    renderMovies(movies);
    pagination.replaceChildren();
    if (page > 1) {
      const previous = document.createElement("button");
      previous.textContent = "Previous";
      previous.onclick = () => loadMovies(page - 1);
      pagination.appendChild(previous);
    }
    if (page < Math.min(data.total_pages || 1, 500)) {
      const next = document.createElement("button");
      next.textContent = "Next";
      next.onclick = () => loadMovies(page + 1);
      pagination.appendChild(next);
    }
  } catch (error) {
    statusText.textContent = error.message;
  }
}
async function loadGenres() {
  try {
    const data = await getMovies("genre/movie/list");
    (data.genres || []).forEach(genre => {
      const option = document.createElement("option");
      option.value = genre.id;
      option.textContent = genre.name;
      genreFilter.appendChild(option);
    });
  } catch (error) {
    console.error("Unable to load genres:", error);
  }
}
function loadYears() {
  const currentYear = new Date().getFullYear();
  for (let year = currentYear; year >= 1950; year--) {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearFilter.appendChild(option);
  }
}
async function showDetails(id) {
  try {
    statusText.textContent = "Loading details...";
    const movie = await getMovies(`movie/${id}`);
    resultsSection.hidden = true;
    detailsSection.hidden = false;
    detailsContent.replaceChildren();
    const poster = document.createElement("img");
    poster.src = movie.poster_path
      ? IMAGE_URL + movie.poster_path
      : "";
    poster.alt = movie.title || "Movie poster";
    poster.style.maxWidth = "300px";
    const title = document.createElement("h2");
    title.textContent = movie.title;
    const rating = document.createElement("p");
    rating.textContent = `⭐ ${(movie.vote_average || 0).toFixed(1)}/10`;
    const overview = document.createElement("p");
    overview.textContent = movie.overview || "No description available.";
    const watchButton = document.createElement("button");
    watchButton.textContent = isSaved(movie.id)
      ? "♥ Remove from Watchlist"
      : "♡ Add to Watchlist";
    watchButton.onclick = () => {
      toggleWatchlist(movie);
      watchButton.textContent = isSaved(movie.id)
        ? "♥ Remove from Watchlist"
        : "♡ Add to Watchlist";
    };
    detailsContent.append(poster, title, rating, overview, watchButton);
    detailsSection.scrollIntoView({ behavior: "smooth" });
  } catch (error) {
    resultsSection.hidden = false;
    statusText.textContent = error.message;
  }
}
document.getElementById("back-to-results").onclick = () => {
  detailsSection.hidden = true;
  resultsSection.hidden = false;
};
searchForm.addEventListener("submit", event => {
  event.preventDefault();
  loadMovies(1);
});
genreFilter.addEventListener("change", () => loadMovies(1));
yearFilter.addEventListener("change", () => loadMovies(1));
sortFilter.addEventListener("change", () => loadMovies(1));
loadGenres();
loadYears();
loadMovies();
