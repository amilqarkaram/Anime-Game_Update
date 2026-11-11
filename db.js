// The one place that knows how to reach MongoDB. The game, the scoreboard and
// the scraper all import their models from here, so they always read and write
// the same database (whatever MONGODB_URI points to).
const mongoose = require("mongoose");
const { MONGODB_URI } = require("./config");

const titleSchema = new mongoose.Schema({
  name: String,
  type: String,
  id: String,
  imgSrc: String,
  plotSummary: String,
  // numbers, so "at least 1000 votes" compares as numbers rather than text
  // (as text, "999" and "none" both sort after "1000"); null when ANN has none
  nbVotes: Number,
  weightedScore: Number,
  bayesianScore: Number,
  genres: [String],
  releaseDates: [String],
});

const scoreSchema = new mongoose.Schema({
  username: String,
  score: String,
});

const Anime = mongoose.model("anime", titleSchema, "animes");
const Manga = mongoose.model("manga", titleSchema, "mangas");
const Score = mongoose.model("score", scoreSchema, "scores");

// True if the database still has titles saved by the old scraper, where the
// vote counts are text. Those need `npm run migrate` before difficulty works.
async function needsMigration() {
  for (const Model of [Anime, Manga]) {
    if (await Model.exists({ nbVotes: { $type: "string" } })) return true;
  }
  return false;
}

function connect(uri = MONGODB_URI) {
  return mongoose.connect(uri);
}

function disconnect() {
  return mongoose.disconnect();
}

module.exports = { mongoose, connect, disconnect, needsMigration, Anime, Manga, Score };
