const mongoose = require("mongoose");
const util = require("util");
//// FOR SOME REASON THE "NONE" genres is not being filtered out, that is the current problem, when filtering the data
//for the years, "none is not being counted as an unqualified year"
//deal with duplicates. The API had duplicates in the system some have releaseDates and some don't. Get rid of all the duplicates without release dates
//and in general
//problem: i use the earliest date root to match with one from the database. However, if sombody picked 2010 and 1990
mongoose.connect("mongodb://localhost:27017/animeDB", {useNewUrlParser: true, useUnifiedTopology: true});
const animeDocSchema = {
  name: String,
  type: String,
  id: String,
  imgSrc: String,
  plotSummary: String,
  nbVotes: String,
  weightedScore: String,
  bayesianScore: String,
  genres: [String],
  releaseDates:[String]
};
// Creted two models from the defined schema
const Anime = mongoose.model('anime',animeDocSchema,'animes');
const Manga = mongoose.model('manga',animeDocSchema,'mangas');
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
  return new Promise(function(resolve, reject){
    if(type === "anime"){
      // if(genres[i] === "erotica") need to filter out erotica
      // filters through all anime based on genres and number of votes
    Anime.find({genres: genres[i],nbVotes:{$gte:min}}, function(err, data){
      //var filteredData = [];
      if(err){console.log("There was an error: " + err);}
      else{
        dataVar = dataVar.concat(data);
        console.log("length of filteredData: " + data.length);
        // console.log(util.inspect(data, false, null));
        resolve(dataVar);
        };
      });
    }
    else if(type === "manga"){
      Manga.find({genres: genres[i],nbVotes:{$gte: min}}, function(err, data){
        //var filteredData = [];
        if(err){console.log("There was an error: " + err);}
        else{
          dataVar = dataVar.concat(data);
          console.log("length of filteredData: " + data.length);
          resolve(dataVar);
          };
        });
    }
        });
}
module.exports = {

createAnswers: function(difficulty,numAns,type,genres,numQ,years){
return new Promise(function(resolve, reject){
//console.log("function ran");
var j = 0;
var filteredData = [];
if(type === "anime"){
  console.log("retrieving anime");
        async function main(){
          for(let i = 0; i < genres.length;++i){
          filteredData = await find(difficulty,filteredData,genres,i,type,years);
          }
          removeUnqualifiedYears(years,filteredData).then(() => {console.log("done filtering")});//console.log(util.inspect(filteredData, false, null));});
          let answers = {};
          let questions = [];
          let ans = [];
          // create 10 random questions with 4 random answerName
          //where questions is an array containing 4 answers contained in an object
          for(let i  = 0; i < numQ; ++i){
              for(let j = 0; j < numAns; ++j){
                randNum = Math.floor(Math.random() * filteredData.length);
                console.log("filtetered Data length: " + filteredData.length);
                ans.push(filteredData[randNum]);
                console.log(filteredData[randNum].releaseDates);

                filteredData.splice(randNum,1);
              };
              answers = {
                answer1: ans[0],
                answer2: ans[1],
                answer3: ans[2],
                answer4: ans[3]
              };
              ans = [];
              questions.push(answers);
          };
            //console.log(questions);
            resolve(questions);
          //console.log(filteredData);
          //console.log(filteredData);
        }
          main();

}
else if(type === "manga"){
  console.log("retrieving manga");
  async function main(){
    for(let i = 0; i < genres.length;++i){
    filteredData = await find(difficulty,filteredData,genres,i,type,years);
    //console.log(filteredData);
    }
      removeUnqualifiedYears(years,filteredData).then(() => {console.log("done filtering")});
    let answers = {};
    let questions = [];
    let ans = [];
    for(let i  = 0; i < numQ; ++i){
        for(let j = 0; j < numAns; ++j){
          randNum = Math.floor(Math.random() * filteredData.length);
          ans.push(filteredData[randNum]);
          filteredData.splice(randNum,1);
        };
        answers = {
          answer1: ans[0],
          answer2: ans[1],
          answer3: ans[2],
          answer4: ans[3]
        };
        ans = [];
        questions.push(answers);
    };
      //console.log(questions);
      resolve(questions);
    //console.log(filteredData);
    //console.log(filteredData);
  }
    main();
}
//console.log("genres length: " + genres.length + ", j is: " + j);
});
}
};


//   let vals = [];
//   let randAns = [];
//   let tempAns = [...data.answerNames];
//   let temp = 4;
//   for(var i = 0; i < numAnswers;++i){
//   let rand = Math.floor(temp * Math.random());
//   randAns.push(tempAns[rand]);
//   if(tempAns[rand] === data.correctAnswerName){
//     vals.push("correct");
//   }
//   else{
//     vals.push("incorrect");
//   }
//   tempAns.splice(rand,1);
//   --temp;
// }
