const mongoose = require("mongoose");
// connecting to specific animeDB database
mongoose.connect("mongodb://localhost:27017/animeDB", {useNewUrlParser: true, useUnifiedTopology: false});
//create a schema to use to create a document
const scoreSchema = {
  username: String,
  score: String
};
//again using the schema and the model method ive create a document to save
const Score = mongoose.model("score",scoreSchema);
module.exports = {

addInfo: function(name,score){
let info = new Score({
  username: name,
  score: score
});
//save the docuement to the database
// info.save() also returnd a promise which alows my to use it in the async function
return info.save();
},
getInfo: function(){
  // a promise is returned that will return an array of the documents
return new Promise(function(resolve, reject){
  Score.find(function(err,data){
    if(err){console.log("There was an error: " + err);}
    else{
      //console.log(data);
      resolve(data);
    }
  });
  }
  );
},



};
