// Reads the settings form and checks it before any database work is done.
// Unknown values are dropped, and anything required that is missing produces a
// message for the player instead of a hung page or a server crash.

const GENRES = [
  "action", "comedy", "adventure", "drama",
  "slice of life", "erotica", "fantasy", "magic",
  "supernatural", "horror", "mystery", "psychological",
  "romance", "science fiction", "thriller", "tournament",
];
const TYPES = ["anime", "manga"];
const DIFFICULTIES = ["Normal", "Expert", "Master"];
const DECADES = ["2010", "2000", "1990", "1980", "1970"];
const MAX_USERNAME = 20;

// a form field sent once arrives as a string, sent several times as an array
function toArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function allowed(values, options) {
  return [...new Set(toArray(values).map(String).filter((v) => options.includes(v)))];
}

function joinList(items) {
  if (items.length <= 1) return items.join("");
  return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
}

function parseSettings(body = {}) {
  const settings = {
    genres: allowed(body.genres, GENRES),
    types: allowed(body.types, TYPES),
    difficulty: DIFFICULTIES.includes(body.difficulty) ? body.difficulty : "Normal",
    decades: allowed(body.decades, DECADES),
    username: String(toArray(body.username)[0] || "").trim().slice(0, MAX_USERNAME) || "Anonymous",
  };
  const missing = [];
  if (settings.genres.length === 0) missing.push("at least one genre");
  if (settings.types.length === 0) missing.push("Anime or Manga");
  if (settings.decades.length === 0) missing.push("at least one decade");
  if (missing.length) {
    return { settings, error: "Please pick " + joinList(missing) + " before you play." };
  }
  return { settings, error: null };
}

module.exports = { parseSettings, toArray, GENRES, TYPES, DIFFICULTIES, DECADES, MAX_USERNAME };
