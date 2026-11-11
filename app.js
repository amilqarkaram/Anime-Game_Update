const express = require("express");
const util = require("util");
const saveScore = require(__dirname + "/save-score.js");
const bodyParser = require("body-parser");
const ejs = require("ejs");//required to embedd javascript. In other words, dynamically change html by sending data from server and filling in an html template
//const annData = require(__dirname + "/ANN.js");
const retrieve = require(__dirname + "/retrieve.js");
const app = express();
const numAnswers = 4;//four choices
const port = 3000;// port number

var genres = [];
var years = [];
var questionNumber = 0;
var completedQuestions = [];
var saveQuestion = [];
var score = 0;
var username = "";
var difficulty = "normal";
app.use(express.static("public"));// allows inclusion of static files(css stylesheet). these files are not sent from our servers because the do not change.
app.use(bodyParser.urlencoded({extended:true}));//necessary to be able to retrieve user input from a form/post request.
app.set('view engine', 'ejs');//necessary to use embedded javascript(ejs)
app.get("/", function(req, res){
  // initializing values
  genres = [];
  years= ["2010"];
  questionNumber = 0;
  completedQuestions = [];
  saveQuestion = [];
  score = 0;
  username = "";
  var questions = [];
  res.render("index");
});
app.post("/", function(req, res){
  let value = req.body.button;
console.log(util.inspect(req.body, false, null));
  if(value === "ajax-info"){
    genres = req.body.genres;
    difficulty = req.body.difficulty;
    years = req.body.years;
    console.log("years: " + years);
    console.log("difficulty: " + difficulty);
  }
  else if(value === "play"){
    console.log("will redirect to game");
    ++questionNumber;
    res.redirect("/game");
  }
  else if(value === "username"){
    username = req.body.input;
    console.log("Username: " + username);
  }
});
app.get("/game",function(req,res){ // process get requests sent from the browser in order to load a webpage
  // the following goes through the answerNames array and randomly chooses one and puts it in a new array(ans) in order to randomly place them on each of the four buttons
  let numAnswers = 4;
  let numQuestions = 10;
  let type = "anime";
  let numTypes = 0;
  console.log("-----------------------------------------------------------------")
  console.log("Question Number: " + questionNumber);
  // I created an async function so that I can use the keyword await inside of interval
  // some functions that execute asynchronously can pose a problem because often
  // lines after it require the result of the previous line
  async function main(){
    // right after "play" is clicked, all questions and answers are created
    if(questionNumber === 1){
    console.log("new question");
    console.log("difficulty: " + difficulty);
    console.log("genres: " + genres);
    // if the user chose both anime and manga, 5 questions will be generated from both genres
    if(genres.includes("anime",0) && genres.includes("manga",0)){
    type = "anime";
    numQuestions = 5;
    let index = genres.indexOf(type);
    genres.splice(index,1);
    questions =  await retrieve.createAnswers(difficulty,numAnswers, type, genres, numQuestions,years);
    type = "manga";
    index = genres.indexOf(type);
    genres.splice(index,1);
    var moreQuestions =  await retrieve.createAnswers(difficulty,numAnswers, type, genres, numQuestions,years);
    questions.push(...moreQuestions);
  }
  // if only anime was chosen then 10 anime questions will be created
    else if(genres.includes("anime",0)){
      type = "anime";
      numQuestions = 10;
      let index = genres.indexOf(type);
      genres.splice(index,1);
      questions =  await retrieve.createAnswers(difficulty,numAnswers, type, genres, numQuestions,years);
    }
    //if only manga was chosen, then 10 manga questions will be generated
    else if(genres.includes("manga",0)){
      type = "manga";
      numQuestions = 10;
      let index = genres.indexOf(type);
      genres.splice(index,1);
      questions =  await retrieve.createAnswers(difficulty,numAnswers, type, genres, numQuestions,years);
    }
  }
  // after generation, we have questions which holds 10 question objects in an array
    let root = questions[questionNumber-1];
    // keeps track of the completed questions
    completedQuestions.push(questionNumber);
  // root now has access to the current question object
    var plotSummary = root.answer1.plotSummary;
    var imgSrc = root.answer1.imgSrc;
    console.log("ImageSrc: " + imgSrc);
    console.log("Plotsummary: " + plotSummary);
    console.log("releaseDates: " + root.answer1.releaseDates)
    // because the first answer is always the correct answer
    // I randomized the answer choics
    var vals = [];
    var randAns = [];
    let tempAns = [];
      tempAns.push(root.answer1.name);
      tempAns.push(root.answer2.name);
      tempAns.push(root.answer3.name);
      tempAns.push(root.answer4.name);
      let temp = 4;
      for(var i = 0; i < numAnswers;++i){
      let rand = Math.floor(temp * Math.random());
      randAns.push(tempAns[rand]);
      if(randAns[i] === root.answer1.name){
        console.log("correct answer: " + randAns[i]);
        vals.push("correct");
      }
      else{
        vals.push("incorrect");
      }
      tempAns.splice(rand,1);
      --temp;
    }
    // the vals array stores weather an answers is correct or incorrect in order
    saveQuestion = [plotSummary,randAns[0],randAns[1],randAns[2],randAns[3],vals[0],vals[1], vals[2], vals[3]];
    // I pass in a random answer for each answer, and the array of correct and incorrect using vals to be use my ejs file
    res.render("game",{imageSrc: imgSrc, src:plotSummary, answer1: randAns[0], answer2: randAns[1], answer3: randAns[2], answer4: randAns[3], val1: vals[0],val2:vals[1], val3:vals[2] ,val4: vals[3]});
  }
  console.log("completed question: " + completedQuestions.includes(questionNumber,0) );
  // if the current question is not yet completed and we are not past the las question, then run main()
  if(!completedQuestions.includes(questionNumber,0) && questionNumber <= numQuestions){
  main();
  console.log("main has run");
}
//if the current questions is completed
// else if(questionNumber <= numQuestions){
//   res.render("game",{imageSrc: imgSrc, src:saveQuestion[0], answer1: saveQuestion[1], answer2: saveQuestion[2], answer3: saveQuestion[3], answer4: saveQuestion[4], val1: saveQuestion[5],val2:saveQuestion[6], val3:saveQuestion[7] ,val4: saveQuestion[8]});
// }
// Otherwise the quiz is over
else{
console.log("END OF QUIZ__________________________");
async function manipInfo(){
  // saving score of the new user
  let doc = await saveScore.addInfo(username,score);
  let arr = await saveScore.getInfo();
  console.log(arr);
  // render scoreboard
  res.render("score",{scoreboard: arr, username:username, score: score, numQuestions: numQuestions});
};
manipInfo();
}

// gives values to the ejs variables.In practice, fills the html template created in the views folder and sends it to the browser in response to the get request
});
//this is where it used to go
app.post("/game", function(req, res){
  let submitName = req.body.button;
  console.log("submit Name: " + submitName);
  if("correct" === submitName){
    console.log("Correct!");
    ++questionNumber;
    ++score;
    //data = annData.getData();
      // waits 1 second before redirecting, so the player can see if they were right or wrong
      setTimeout(()=>{res.redirect("/game");},1000)
  }
  else{
    console.log("Wrong Answer!");
    ++questionNumber;
    // waits 1 second before redirecting, so the player can see if they were right or wrong
    setTimeout(()=>{res.redirect("/game");},1000)
  }
});
// needed for every application
app.listen(port,function(){
  console.log("listening on port 3000");
})

//future: create different difficulty levels based on the average rating of each anime
//each anime has a rating and generally the higher rated ones are popular and known
//normal mode would only include anime with a relatively high ranking(~above 7 probably)
// harder mode would include anime that are not highly ranked and thus less known

//format of information. anime object is just a really big array with all of the information, so I just have to search through the array
