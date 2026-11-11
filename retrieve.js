const util = require("util");
//// FOR SOME REASON THE "NONE" genres is not being filtered out, that is the current problem, when filtering the data
//for the years, "none is not being counted as an unqualified year"
//deal with duplicates. The API had duplicates in the system some have releaseDates and some don't. Get rid of all the duplicates without release dates
//and in general
//problem: i use the earliest date root to match with one from the database. However, if sombody picked 2010 and 1990
const { Anime, Manga } = require(__dirname + "/db.js");
// this function will remove any years not specified
function removeUnqualifiedYears(years,data){
return new Promise((resolve, reject) => {
  console.log("data: " + data.length);
  let removeElement = [];
for(var l = 0; l < data.length;++l){
if(data[l].releaseDates[0] === "none"){
  console.log(data[l].name);
  removeElement.push(l);
  continue;
}
// doesn't work if releaseDates is undefined
if(data[l].releaseDates[0] === undefined){
  console.log("release dates undefined: " + data[l]);
}
// for each release date of the releasedates array, find the earliest release date root(i.e 200, or 199)
let earliestDateRoot = data[l].releaseDates[0].substring(0,3);
for(var j = 1; j < data[l].releaseDates.length; ++j){
  releaseYearRoot = data[l].releaseDates[j].substring(0,3);

  let previousReleaseYearRoot = data[l].releaseDates[j - 1].substring(0,3);
  if(Number(releaseYearRoot) < Number(previousReleaseYearRoot)){
    earliestDateRoot = releaseYearRoot;
  }
}
// if that root is equal to one of the roots specified then that anime or manga is a match
// otherwise, add to an array called removeElemts
for(var m = 0; m < years.length; ++m){

if(earliestDateRoot === years[m].substring(0,3)){

  break;
}
else{
  removeElement.push(l);
  continue;
}
}

}
console.log("removeElement array " + removeElement);
  // go through each element of the remove element array and remove that element from the data array
  for(let b = removeElement.length - 1; b >= 0; --b){
    data.splice(removeElement[b],1);
  };
  resolve(data);
});

}
// the algorithm for difficulty is based on number of votes. This is under the
// assumption that the most votes the more known and thus the easier

function find(difficulty, dataVar, genres,i,type,years){
  var min = undefined;
  if(difficulty === "Normal"){
    min = 1000;
  }
  else if(difficulty === "Expert"){
    min = 500;
  }
  else if(difficulty === "Master"){
    min = 0;
  }
  console.log("find function runs ");
  const Model = type === "anime" ? Anime : Manga;
  // filters through all titles based on genre and number of votes
  return Model.find({genres: genres[i], nbVotes: {$gte: min}}).then(function(data){
    console.log("length of filteredData: " + data.length);
    return dataVar.concat(data);
  });
}
module.exports = {

// Builds numQ questions of numAns titles each; the first title of every
// question is the right answer. As an async function, any database error is
// passed back to the caller (and on to the error page) instead of escaping as
// an unhandled rejection that crashes the server.
createAnswers: async function(difficulty, numAns, type, genres, numQ, years){
  console.log("retrieving " + type);
  let filteredData = [];
  for(let i = 0; i < genres.length; ++i){
    filteredData = await find(difficulty, filteredData, genres, i, type, years);
  }
  await removeUnqualifiedYears(years, filteredData);
  // create numQ random questions with numAns random answers each
  const questions = [];
  for(let i = 0; i < numQ; ++i){
    const ans = [];
    for(let j = 0; j < numAns; ++j){
      const randNum = Math.floor(Math.random() * filteredData.length);
      ans.push(filteredData[randNum]);
      filteredData.splice(randNum, 1);
    }
    questions.push({ answer1: ans[0], answer2: ans[1], answer3: ans[2], answer4: ans[3] });
  }
  return questions;
}
};
