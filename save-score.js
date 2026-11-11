// Saving and reading the scoreboard.
const { Score } = require(__dirname + "/db.js");

module.exports = {
  // returns the saved document (a promise)
  addInfo: function (username, score, total) {
    return Score.create({ username, score, total });
  },

  // the best scores first; ties go to whoever got there first
  getInfo: function (limit = 10) {
    return Score.find().sort({ score: -1, createdAt: 1 }).limit(limit).lean();
  },
};
