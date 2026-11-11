// The one place that knows how to reach MongoDB. The game, the scoreboard and
// the scraper all import their models from here, so they always read and write
// the same database (whatever MONGODB_URI points to).
const mongoose = require("mongoose");
const { MONGODB_URI } = require("./config");

const titleSchema = new mongoose.Schema({
  name: String,
  type: String,
  id: Number, // the ANN encyclopedia id
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

// one document per ANN id, so re-running the scraper updates instead of
// adding duplicates
titleSchema.index({ id: 1 }, { unique: true });

const scoreSchema = new mongoose.Schema({
  username: String,
  score: String,
});

const Anime = mongoose.model("anime", titleSchema, "animes");
const Manga = mongoose.model("manga", titleSchema, "mangas");
const Score = mongoose.model("score", scoreSchema, "scores");

// True if the database still has titles saved by the old scraper, where ids
// and vote counts are text. Those need `npm run migrate`.
async function needsMigration() {
  for (const Model of [Anime, Manga]) {
    if (await Model.exists({ $or: [{ nbVotes: { $type: "string" } }, { id: { $type: "string" } }] })) return true;
  }
  return false;
}

function connect(uri = MONGODB_URI) {
  // indexes are created explicitly by the scraper and the migration, so an
  // old database with duplicate ids does not trip the unique index at startup
  return mongoose.connect(uri, { autoIndex: false });
}

function disconnect() {
  return mongoose.disconnect();
}

module.exports = { mongoose, connect, disconnect, needsMigration, Anime, Manga, Score };
