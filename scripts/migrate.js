// One-off upgrade for a database filled by the old version of the scraper.
// It converts fields that were stored as text into numbers, so comparisons
// like "at least 1000 votes" work. Safe to run more than once: documents that
// are already converted are left alone.
//
//   npm run migrate
const db = require("../db");

// [model, field, target type]; "none" and anything unparsable become null
const NUMBER_FIELDS = [
  [db.Anime, "id", "int"],
  [db.Manga, "id", "int"],
  [db.Anime, "nbVotes", "int"],
  [db.Anime, "weightedScore", "double"],
  [db.Anime, "bayesianScore", "double"],
  [db.Manga, "nbVotes", "int"],
  [db.Manga, "weightedScore", "double"],
  [db.Manga, "bayesianScore", "double"],
];

async function toNumbers(Model, field, to) {
  // runs inside MongoDB with an update pipeline; bypasses Mongoose casting
  const result = await Model.collection.updateMany(
    { [field]: { $type: "string" } },
    [{ $set: { [field]: { $convert: { input: "$" + field, to, onError: null, onNull: null } } } }],
  );
  console.log(`${Model.collection.collectionName}.${field}: converted ${result.modifiedCount}`);
}

// The old scraper could save the same id twice (it restarted from a guessed
// position). Keep one document per id: the one with the most dates.
async function removeDuplicates(Model) {
  const dupes = await Model.aggregate([
    { $group: { _id: "$id", docs: { $push: { _id: "$_id", n: { $size: { $ifNull: ["$releaseDates", []] } } } }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]);
  const remove = dupes.flatMap((d) => d.docs.sort((a, b) => b.n - a.n).slice(1).map((x) => x._id));
  if (remove.length) await Model.deleteMany({ _id: { $in: remove } });
  console.log(`${Model.collection.collectionName}: removed ${remove.length} duplicate ids`);
}

async function migrate() {
  for (const [Model, field, to] of NUMBER_FIELDS) {
    await toNumbers(Model, field, to);
  }
  for (const Model of [db.Anime, db.Manga]) {
    await removeDuplicates(Model);
    await Model.syncIndexes();
  }
}

module.exports = { migrate };

if (require.main === module) {
  db.connect()
    .then(migrate)
    .then(() => console.log("Migration finished."))
    .catch((err) => { console.error(err); process.exitCode = 1; })
    .finally(() => db.disconnect());
}
