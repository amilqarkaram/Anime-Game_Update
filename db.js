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
  nbVotes: String,
  weightedScore: String,
  bayesianScore: String,
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

function connect(uri = MONGODB_URI) {
  return mongoose.connect(uri);
}

function disconnect() {
  return mongoose.disconnect();
}

module.exports = { mongoose, connect, disconnect, Anime, Manga, Score };
