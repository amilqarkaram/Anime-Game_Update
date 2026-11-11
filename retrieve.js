const util = require("util");
const { Anime, Manga } = require(__dirname + "/db.js");
const { buildQuestions } = require(__dirname + "/lib/quiz.js");
const { MIN_VOTES } = require(__dirname + "/lib/settings.js");
const { filterByDecades } = require(__dirname + "/lib/titles.js");
// the algorithm for difficulty is based on number of votes. This is under the
// assumption that the most votes the more known and thus the easier

function find(difficulty, dataVar, genres,i,type,years){
  const query = {genres: genres[i]};
  const min = MIN_VOTES[difficulty];
  if(min > 0){
    query.nbVotes = {$gte: min};
  }
  console.log("find function runs ");
  const Model = type === "anime" ? Anime : Manga;
  // filters through all titles based on genre and number of votes
  return Model.find(query).then(function(data){
    console.log("length of filteredData: " + data.length);
    return dataVar.concat(data);
  });
}
module.exports = {

// Builds up to numQ questions of numAns titles each (fewer if not enough
// titles match); the first title of every question is the right answer. As an async function, any database error is
// passed back to the caller (and on to the error page) instead of escaping as
// an unhandled rejection that crashes the server.
createAnswers: async function(difficulty, numAns, type, genres, numQ, years){
  console.log("retrieving " + type);
  let filteredData = [];
  for(let i = 0; i < genres.length; ++i){
    filteredData = await find(difficulty, filteredData, genres, i, type, years);
  }
  filteredData = filterByDecades(filteredData, years);
  return buildQuestions(filteredData, numQ, numAns)
    .map((ans) => ({ answer1: ans[0], answer2: ans[1], answer3: ans[2], answer4: ans[3] }));
}
};
