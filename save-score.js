// models and the database connection live in db.js
const { Score } = require(__dirname + "/db.js");
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
return Score.find().exec();
},



};
