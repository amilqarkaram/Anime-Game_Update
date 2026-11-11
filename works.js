const mongoose = require("mongoose");
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
  genres: [String]
};
const Anime = mongoose.model('anime',animeDocSchema,'animes');
const Manga = mongoose.model('manga',animeDocSchema,'mangas');
module.exports = {

createAnswers: function(numAns,type,genres,numQ){
return new Promise(function(resolve, reject){
//console.log("function ran");
var j = 0;
var filteredData = [];
if(type === "anime"){
  for(let i = 0; i < genres.length; ++i){
    Anime.find({genres: genres[i]}, function(err, data){
      //var filteredData = [];
      if(err){console.log("There was an error: " + err);}
      else{

          filteredData = filteredData.concat(data);
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
              questions.push(answers);
          };
            //console.log(questions);
            resolve(questions);
          //console.log(filteredData);
          //console.log(filteredData);

      };

    });
  };

}
else if(type === "manga"){
  for(let i = 0; i < genres.length; ++i){
    Manga.find({genres: genres[i]}, function(err, data){
      if(err){console.log("There was an error: " + err);}
      else{
          filteredData = filteredData.concat(data);
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
              questions.push(answers);
          };
            //console.log(questions);
            resolve(questions);
      }
    });
  };
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
