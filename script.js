"use strict";
// TMDB API CONFIGURATION
const TMDB_API_KEY = "PASTE_YOUR_TMDB_API_KEY_HERE";
const API = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p/w500";
const $ = id => document.getElementById(id);
let genres = [];
let currentQuery = "";
let discoverPage = 1;
let discoverTotal = 1;
let lastResults = "#discover";
let requestNumber = 0;
let watchlist = {};
try {
  watchlist = JSON.parse(
    localStorage.getItem("movie-watchlist") || "{}"
  );
} catch {
  watchlist = {};
}
// SECURITY: ESCAPE TEXT
function safe(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char])
  );
}
// TMDB API REQUESTS
async function tmdb(path, params = {}) {
  if (TMDB_API_KEY === "PASTE_YOUR_TMDB_API_KEY_HERE") {
    throw new Error("Add your TMDB API key to load movies.");
  }
  const url = new URL(API + path);
  Object.entries({
    ...params,
    api_key: TMDB_API_KEY
  }).forEach(([key, value]) => {
    if (value !== "" && value != null) {
      url.searchParams.set(key, value);
    }
  });
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      "Movie request failed: " + response.status
    );
  }
  return response.json();
}
// MOVIE POSTERS
function poster(movie) {
  if (movie.poster_path) {
    return `
      <img
        class="poster"
        src="${IMG}${safe(movie.poster_path)}"
        alt="Poster for ${safe(movie.title)}"
        loading="lazy"
      >
    `;
  }
  return `
    <div class="poster placeholder">
      ${safe(movie.title)}
    </div>
  `;
}
// MOVIE CARDS
function movieCard(movie) {
  return `
    <article class="movie-card">
      ${poster(movie)}
      <h3>${safe(movie.title)}</h3>
      <div class="rating">
        ★ ${Number(movie.vote_average || 0).toFixed(1)}
      </div>
      <button data-details="${movie.id}">
        View Details
      </button>
    </article>
  `;
}
function renderCards(id, movies) {
  $(id).innerHTML = movies.map(movieCard).join("");
}
// PAGE NAVIGATION
function navigate() {
  const page = location.hash.slice(1) || "home";
  const target =
    $(page) && $(page).classList.contains("page")
      ? page
      : "home";
  document.querySelectorAll(".page").forEach(element => {
    element.classList.toggle(
      "active",
      element.id === target
    );
  });
  window.scrollTo(0, 0);
  if (target === "watchlist") {
    renderWatchlist();
  }
}
window.addEventListener("hashchange", navigate);
// NOW SHOWING
async function loadNowShowing() {
  $("now-status").textContent = "Loading movies...";
  try {
    const data = await tmdb(
      "/movie/now_playing",
      { page: 1 }
    );
    renderCards(
      "now-grid",
      data.results.slice(0, 8)
    );
    $("now-status").textContent = "";
  } catch (error) {
    $("now-status").textContent = error.message;
  }
}
// MOVIE GENRES
async function loadGenres() {
  try {
    const data = await tmdb("/genre/movie/list");
    genres = data.genres;
    $("genre-filter").innerHTML =
      '<option value="">All Genres</option>' +
      genres.map(genre => `
        <option value="${genre.id}">
          ${safe(genre.name)}
        </option>
      `).join("");
  } catch (error) {
    console.warn(error.message);
  }
}
// RELEASE YEARS
function fillYears() {
  const currentYear = new Date().getFullYear();
  for (let year = currentYear; year >= 1950; year--) {
    $("year-filter").add(
      new Option(year, year)
    );
  }
}
// DISCOVER AND SEARCH
async function loadDiscover() {
  const request = ++requestNumber;
  $("discover-status").textContent =
    "Searching movies...";
  $("discover-grid").innerHTML = "";
  const genre = $("genre-filter").value;
  const year = $("year-filter").value;
  const sort = $("sort-filter").value;
  try {
    let path;
    let params;
    if (currentQuery) {
      path = "/search/movie";
      params = {
        query: currentQuery,
        page: discoverPage
      };
    } else {
      path = "/discover/movie";
      params = {
        page: discoverPage,
        sort_by: sort
      };
      if (genre) {
        params.with_genres = genre;
      }
      if (year) {
        params.primary_release_year = year;
      }
    }
    const data = await tmdb(path, params);
    if (request !== requestNumber) {
      return;
    }
    let movies = data.results || [];
    if (currentQuery) {
      if (genre) {
        movies = movies.filter(movie =>
          movie.genre_ids?.includes(Number(genre))
        );
      }
      if (year) {
        movies = movies.filter(movie =>
          movie.release_date?.startsWith(year)
        );
      }
      if (sort === "vote_average.desc") {
        movies.sort(
          (a, b) => b.vote_average - a.vote_average
        );
      }
      if (sort === "primary_release_date.desc") {
        movies.sort(
          (a, b) =>
            (b.release_date || "").localeCompare(
              a.release_date || ""
            )
        );
      }
      if (sort === "primary_release_date.asc") {
        movies.sort(
          (a, b) =>
            (a.release_date || "").localeCompare(
              b.release_date || ""
            )
        );
      }
    }
    renderCards("discover-grid", movies);
    discoverTotal = Math.min(
      data.total_pages || 1,
      500
    );
    $("discover-status").textContent =
      movies.length
        ? ""
        : "No matching movies found on this page.";
    $("page-number").textContent =
      `Page ${discoverPage} of ${discoverTotal}`;
    $("prev-page").disabled =
      discoverPage <= 1;
    $("next-page").disabled =
      discoverPage >= discoverTotal;
  } catch (error) {
    if (request !== requestNumber) {
      return;
    }
    $("discover-status").textContent =
      error.message;
    $("page-number").textContent = "";
  }
}
$("search-form").addEventListener(
  "submit",
  event => {
    event.preventDefault();
    currentQuery =
      $("search-input").value.trim();
    discoverPage = 1;
    loadDiscover();
  }
);
[
  "genre-filter",
  "year-filter",
  "sort-filter"
].forEach(id => {
  $(id).addEventListener("change", () => {
    discoverPage = 1;
    loadDiscover();
  });
});
$("prev-page").onclick = () => {
  if (discoverPage > 1) {
    discoverPage--;
    loadDiscover();
  }
};
$("next-page").onclick = () => {
  if (discoverPage < discoverTotal) {
    discoverPage++;
    loadDiscover();
  }
};
// MOVIE DETAILS
async function showDetails(id) {
  lastResults =
    location.hash === "#details"
      ? lastResults
      : (location.hash || "#discover");
  location.hash = "details";
  $("detail-content").innerHTML =
    '<p class="status">Loading movie details...</p>';
  try {
    const movie = await tmdb(
      "/movie/" + id,
      { append_to_response: "credits,release_dates" }
    );
    const director =
      movie.credits?.crew?.find(
        person => person.job === "Director"
      )?.name || "Not available";
    const cast =
      movie.credits?.cast
        ?.slice(0, 5)
        .map(person => person.name)
        .join(", ") || "Not available";
    const saved = !!watchlist[movie.id];
    const date =
      movie.release_date || "Unknown";
    const chips =
      (movie.genres || []).map(genre => `
        <span class="chip">
          ${safe(genre.name)}
        </span>
      `).join("");
    const certification =
      movie.release_dates?.results
        ?.find(result =>
          result.iso_3166_1 === "US"
        )
        ?.release_dates
        ?.find(result =>
          result.certification
        )
        ?.certification || "Not rated";
    $("detail-content").innerHTML = `
      <div class="detail-panel">
        <div>
          ${poster(movie)}
        </div>
        <div>
          <h1>${safe(movie.title)}</h1>
          <p class="gold">
            ★ ${Number(movie.vote_average || 0).toFixed(1)}/10
            &nbsp; | &nbsp;
            ${safe(date.slice(0, 4))}
            &nbsp; | &nbsp;
            ${movie.runtime || "?"} min
          </p>
          <div class="chips">${chips}</div>
          <p>
            ${safe(movie.overview ||
              "No description available.")}
          </p>
          <p>
            <strong>Starring:</strong>
            ${safe(cast)}
          </p>
          <button id="save-detail">
            ${saved
              ? "Remove from Watchlist"
              : "Add to Watchlist"}
          </button>
          <button id="back-detail">
            Back to Results
          </button>
        </div>
      </div>
      <div class="info-strip">
        <div>
          <strong>Director</strong>
          ${safe(director)}
        </div>
        <div>
          <strong>Release Date</strong>
          ${safe(date)}
        </div>
        <div>
          <strong>Rating</strong>
          ${safe(certification)}
        </div>
        <div>
          <strong>Language</strong>
          ${safe(
            movie.original_language?.toUpperCase()
          )}
        </div>
      </div>
    `;
    $("save-detail").onclick = () => {
      if (watchlist[movie.id]) {
        delete watchlist[movie.id];
      } else {
        watchlist[movie.id] = movie;
      }
      saveWatchlist();
      $("save-detail").textContent =
        watchlist[movie.id]
          ? "Remove from Watchlist"
          : "Add to Watchlist";
    };
    $("back-detail").onclick = () => {
      location.hash = lastResults;
    };
  } catch (error) {
    $("detail-content").textContent =
      error.message;
  }
}
// WATCHLIST
function saveWatchlist() {
  try {
    localStorage.setItem(
      "movie-watchlist",
      JSON.stringify(watchlist)
    );
  } catch (error) {
    alert(
      "Unable to save watchlist in this browser."
    );
  }
  $("watch-count").textContent =
    `(${Object.keys(watchlist).length})`;
  renderWatchlist();
}
function renderWatchlist() {
  const movies = Object.values(watchlist);
  $("empty-watchlist").hidden =
    movies.length > 0;
  $("watchlist-grid").innerHTML =
    movies.map(movie => `
      <article class="watch-card">
        <div>
          ${poster(movie)}
        </div>
        <div>
          <h3>${safe(movie.title)}</h3>
          <p>
            ${safe(
              movie.release_date?.slice(0, 4) ||
              "Unknown"
            )}
          </p>
          <p class="rating">
            ★ ${Number(
              movie.vote_average || 0
            ).toFixed(1)}
          </p>
          <button data-details="${movie.id}">
            View Details
          </button>
        </div>
        <button
          class="remove"
          data-remove="${movie.id}"
          aria-label="Remove movie"
        >
          ×
        </button>
      </article>
    `).join("");
}
document.addEventListener(
  "click",
  event => {
    const detail =
      event.target.closest("[data-details]");
    const remove =
      event.target.closest("[data-remove]");
    if (detail) {
      showDetails(detail.dataset.details);
    }
    if (remove) {
      delete watchlist[remove.dataset.remove];
      saveWatchlist();
    }
  }
);
// MOVIE MATCHMAKER QUIZ
const questions = [
  {
    text:
      "What kind of movie are you in the mood for?",
    options: [
      ["Something Funny", 35],
      ["Something Magical", 14],
      ["Something Romantic", 10749],
      ["Something Thrilling", 53]
    ]
  },
  {
    text:
      "What kind of adventure sounds best?",
    options: [
      ["An Action-Packed Adventure", 28],
      ["A Journey Into Space", 878],
      ["A Mysterious Story", 9648],
      ["A Heartwarming Story", 18]
    ]
  },
  {
    text:
      "Who would you like to watch with?",
    options: [
      ["The Whole Family", 10751],
      ["My Friends", 35],
      ["Someone Special", 10749],
      ["Just Myself", 18]
    ]
  },
  {
    text:
      "How should the movie make you feel?",
    options: [
      ["Excited", 12],
      ["Inspired", 18],
      ["Scared", 27],
      ["Happy", 35]
    ]
  }
];
let questionIndex = 0;
let answers = [];
function showQuizPart(part) {
  [
    "quiz-start",
    "quiz-questions",
    "quiz-results"
  ].forEach(id => {
    $(id).hidden = id !== part;
  });
}
function renderQuestion() {
  const question = questions[questionIndex];
  $("question-count").textContent =
    `Question ${questionIndex + 1} of ${questions.length}`;
  $("progress-label").textContent =
    `${Math.round(
      questionIndex / questions.length * 100
    )}% complete`;
  $("progress-fill").style.width =
    `${questionIndex / questions.length * 100}%`;
  $("question-text").textContent =
    question.text;
  $("answer-options").innerHTML =
    question.options.map((option, index) => `
      <button
        class="answer ${
          answers[questionIndex] === index
            ? "selected"
            : ""
        }"
        data-answer="${index}"
      >
        ${safe(option[0])}
      </button>
    `).join("");
  $("quiz-back").disabled =
    questionIndex === 0;
  $("quiz-next").disabled =
    answers[questionIndex] === undefined;
  $("quiz-next").textContent =
    questionIndex === questions.length - 1
      ? "See My Matches"
      : "Next";
}
$("start-quiz").onclick = () => {
  questionIndex = 0;
  answers = [];
  showQuizPart("quiz-questions");
  renderQuestion();
};
$("answer-options").addEventListener(
  "click",
  event => {
    const button =
      event.target.closest("[data-answer]");
    if (!button) {
      return;
    }
    answers[questionIndex] =
      Number(button.dataset.answer);
    renderQuestion();
  }
);
$("quiz-back").onclick = () => {
  if (questionIndex > 0) {
    questionIndex--;
    renderQuestion();
  }
};
$("quiz-next").onclick = () => {
  if (
    answers[questionIndex] === undefined
  ) {
    return;
  }
  if (
    questionIndex < questions.length - 1
  ) {
    questionIndex++;
    renderQuestion();
  } else {
    showQuizResults();
  }
};
async function showQuizResults() {
  showQuizPart("quiz-results");
  $("quiz-result-status").textContent =
    "Finding your perfect movie matches...";
  const scores = {};
  questions.forEach(
    (question, index) => {
      const genre =
        question.options[
          answers[index]
        ]?.[1];
      if (genre) {
        scores[genre] =
          (scores[genre] || 0) + 1;
      }
    }
  );
  const chosenGenres =
    Object.keys(scores)
      .sort(
        (a, b) =>
          scores[b] - scores[a]
      )
      .slice(0, 2);
  try {
    const data = await tmdb(
      "/discover/movie",
      {
        with_genres:
          chosenGenres.join("|"),
        sort_by:
          "vote_average.desc",
        "vote_count.gte": 100,
        page: 1
      }
    );
    renderCards(
      "quiz-result-grid",
      data.results.slice(0, 8)
    );
    $("quiz-result-status").textContent =
      data.results.length
        ? "Here are your movie matches!"
        : "No matches found.";
  } catch (error) {
    $("quiz-result-status").textContent =
      error.message;
  }
}
$("quiz-restart").onclick = () => {
  questionIndex = 0;
  answers = [];
  showQuizPart("quiz-start");
};
// INITIALIZE WEBSITE
fillYears();
saveWatchlist();
navigate();
loadNowShowing();
loadGenres();
loadDiscover();
