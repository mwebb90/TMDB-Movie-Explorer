const WATCHLIST_KEY = "tmdb-watchlist";
const IMAGE_URL = "https://image.tmdb.org/t/p/w500";
const API_URL = "https://tmdb-movie-api-220914907216.us-east1.run.app";
const watchlistGrid = document.getElementById("watchlist-grid");
const emptyMessage = document.getElementById("watchlist-empty");
function getWatchlist() {
  try {
    const saved = JSON.parse(localStorage.getItem(WATCHLIST_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}
function removeFromWatchlist(movieId) {
  const updated = getWatchlist().filter(
    movie => movie.id !== movieId
  );
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated));
  renderWatchlist();
}
async function getMovieDetails(movieId) {
  const url = new URL(API_URL);
  url.searchParams.set("endpoint", `movie/${movieId}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Could not load movie details.");
  }
  return response.json();
}
function createMovieTicket(movie) {
  const ticket = document.createElement("article");
  ticket.className = "watchlist-ticket";
  const poster = document.createElement("img");
  poster.className = "watchlist-ticket-poster";
  poster.src = movie.poster_path
    ? IMAGE_URL + movie.poster_path
    : "";
  poster.alt = `${movie.title || "Movie"} poster`;
  const info = document.createElement("div");
  info.className = "watchlist-ticket-info";
  const title = document.createElement("h3");
  title.textContent = movie.title || "Untitled Movie";
  const meta = document.createElement("div");
  meta.className = "watchlist-ticket-meta";
  const year = movie.release_date
    ? movie.release_date.substring(0, 4)
    : "Unknown year";
  const runtime = movie.runtime
    ? `${movie.runtime} min`
    : "Runtime unavailable";
  meta.textContent = `${year}  ●  ${runtime}`;
  const rating = document.createElement("div");
  rating.className = "watchlist-ticket-rating";
  const star = document.createElement("span");
  star.className = "star";
  star.textContent = "★";
  const score = document.createElement("span");
  score.textContent = ` ${(movie.vote_average || 0).toFixed(1)}`;
  rating.append(star, score);
  const genres = document.createElement("div");
  genres.className = "watchlist-ticket-genres";
  const genreNames = Array.isArray(movie.genres)
    ? movie.genres.map(genre => genre.name)
    : [];
  genreNames.forEach(name => {
    const genre = document.createElement("span");
    genre.className = "watchlist-genre";
    genre.textContent = name;
    genres.appendChild(genre);
  });
  const detailsLink = document.createElement("a");
  detailsLink.className = "watchlist-view-details";
  detailsLink.href = `discover.html?movie=${movie.id}`;
  detailsLink.textContent = "View Details";
  const removeButton = document.createElement("button");
  removeButton.className = "watchlist-remove";
  removeButton.textContent = "×";
  removeButton.setAttribute(
    "aria-label",
    `Remove ${movie.title || "movie"} from watchlist`
  );
  removeButton.addEventListener("click", () => {
    removeFromWatchlist(movie.id);
  });
  info.append(title, meta, rating, genres, detailsLink);
  ticket.append(poster, info, removeButton);
  return ticket;
}
async function renderWatchlist() {
  const movies = getWatchlist();
  watchlistGrid.replaceChildren();
  if (movies.length === 0) {
    emptyMessage.hidden = false;
    return;
  }
  emptyMessage.hidden = true;
  for (const savedMovie of movies) {
    let movie = savedMovie;
    try {
      movie = await getMovieDetails(savedMovie.id);
    } catch (error) {
      console.error("Could not refresh movie:", error);
    }
    if (!getWatchlist().some(item => item.id === savedMovie.id)) {
      continue;
    }
    watchlistGrid.appendChild(createMovieTicket(movie));
  }
}
renderWatchlist();
