const { Anime, Manga } = require(__dirname + "/db.js");
const { buildQuestions } = require(__dirname + "/lib/quiz.js");
const { MIN_VOTES, EXCLUDED_GENRES } = require(__dirname + "/lib/settings.js");
const { filterByDecades, uniqueTitles, canBeQuestion, hasName } = require(__dirname + "/lib/titles.js");

// All titles of one type that have any of the chosen genres (and none of the
// excluded ones) and enough votes
// for the difficulty (more votes = better known = easier).
// One query with $in returns each title once, even when it has several of the
// chosen genres; before, one query per genre was concatenated, so a title
// tagged "action" and "comedy" was in the pool twice and could show up twice
// among the choices of a question.
function findTitles(type, genres, difficulty) {
  const query = { genres: { $in: genres, $nin: EXCLUDED_GENRES } };
  const min = MIN_VOTES[difficulty];
  if (min > 0) {
    query.nbVotes = { $gte: min };
  }
  const Model = type === "anime" ? Anime : Manga;
  return Model.find(query).lean();
}

module.exports = {
  findTitles,

  // Builds up to numQ questions of numAns titles each (fewer if not enough
  // titles match); the first title of every question is the right answer.
  // As an async function, any database error is passed back to the caller
  // (and on to the error page) instead of crashing the server.
  createAnswers: async function (difficulty, numAns, type, genres, numQ, years) {
    let pool = await findTitles(type, genres, difficulty);
    pool = uniqueTitles(filterByDecades(pool.filter(hasName), years));
    return buildQuestions(pool, numQ, numAns, Math.random, canBeQuestion)
      .map((ans) => ({ answer1: ans[0], answer2: ans[1], answer3: ans[2], answer4: ans[3] }));
  },
};
