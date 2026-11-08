"use strict";
const CLOUD_API = "https://tmdb-movie-api-220914907216.us-east1.run.app";
const POSTER_BASE = "https://image.tmdb.org/t/p/w500";
const movieGrid = document.getElementById("movie-grid");
const movieStatus = document.getElementById("movie-status");
async function loadNowShowing() {
  movieStatus.textContent = "Loading movies...";
  movieGrid.replaceChildren();
  try {
    const url = new URL(CLOUD_API);
    url.searchParams.set("endpoint", "movie/now_playing");
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Movie request failed (${response.status})`);
    }
    const data = await response.json();
    if (!Array.isArray(data.results) || data.results.length === 0) {
      movieStatus.textContent = "No movies are available right now.";
      return;
    }
    movieStatus.textContent = "";
    data.results.slice(0, 20).forEach(movie => {
      const card = document.createElement("article");
      card.className = "movie-card";
      const poster = document.createElement("img");
      poster.className = "movie-poster";
      poster.alt = `${movie.title} movie poster`;
      poster.loading = "lazy";
      poster.src = movie.poster_path
        ? `${POSTER_BASE}${movie.poster_path}`
        : "data:image/svg+xml," +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450"><rect width="100%" height="100%" fill="#30242a"/><text x="50%" y="50%" fill="white" font-size="22" text-anchor="middle">No Poster</text></svg>'
          );
      const title = document.createElement("h2");
      title.textContent = movie.title;
      const rating = document.createElement("div");
      rating.className = "movie-rating";
      const star = document.createElement("span");
      star.className = "star";
      star.textContent = "★ ";
      const score = document.createElement("span");
      score.textContent = Number.isFinite(movie.vote_average)
        ? movie.vote_average.toFixed(1)
        : "N/A";
      rating.append(star, score);
      const details = document.createElement("a");
      details.className = "details-button";
      details.textContent = "View Details";
      details.href = `https://www.themoviedb.org/movie/${movie.id}`;
      details.target = "_blank";
      details.rel = "noopener noreferrer";
      card.append(poster, title, rating, details);
      movieGrid.appendChild(card);
    });
  } catch (error) {
    console.error("Unable to load movies:", error);
    movieStatus.textContent =
      "Unable to load movies. Please try again later.";
  }
}
loadNowShowing();
