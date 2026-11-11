const https = require("https");//used to send get response to external servers
const xml2js = require("xml2js");//ANN servers send back xml, this npm package is to convert xml into a javascript object
const util = require("util");
module.exports = {



getData: function(){
  let data = {};
  const numAnswers = 4;
  data.imageSrc = "";
  data.answerNames = [];
  data.answerIds = [];
  data.correctAnswerId = "";
  data.correctAnswerName = "";
//data is sent in pieces, so we create an array to catch all the data chunks
var chunks = [];
// the following are url after the endpoint to add to get certain data from the ANN(i.e reports)
//reports: reports.xml?id=155&type=anime&nlist=all
//intricate data for individual anime(based on individual id's): api.xml?title=4658
https.get("https://cdn.animenewsnetwork.com/encyclopedia/reports.xml?id=155&type=anime&nlist=all", function(response){
  //status code
  console.log(response.statusCode);
  // method of the response object that allows reception of data "chunks"
  response.on("data", function (chunk) {
    //callback function(like a pointer in C++). we are defining the function that they created as an argument for the on method of the response object
  chunks.push(chunk);
  //chunks contains all the data
});
response.on("end", function () {
  // a buffer object is created by concatenating all the seperate elements in chunks
  var body = Buffer.concat(chunks);
  // change the buffer(data in the form of hexadecimal) into a string
  const xml = body.toString();

  xml2js.parseString(xml, function (err, result) {//this method of the xml2js package converts an xml string to a javascript object
    var items,randomIndex,randomId;
    //takes from the parsed js object. find four random anime and their id's from the endpoint we acessed(reports endpoint). Adds these to answerNames and answerIds arrays respectively.
    for(var i = 0; i < numAnswers;++i){
      items = result.report.item;
      randomIndex = Math.floor(items.length * Math.random());
      randomId = result.report.item[randomIndex].id[0];
      randomName = result.report.item[randomIndex].name[0];
      data.answerIds.push(randomId);
      data.answerNames.push(randomName);
    }
    // the zero index was arbitrarily chosen for the anime that will be presented
    data.correctAnswerId = data.answerIds[0];
    data.correctAnswerName = data.answerNames[0];
    console.log("Correct Name: " + data.answerNames[0]);
    // using this id we can gain acess to more specific info about it, like the image or plot summary
    https.get("https://cdn.animenewsnetwork.com/encyclopedia/api.xml?title="+ data.correctAnswerId, function(response){
      var chunks = [];
      response.on("data", function (chunk) {
      chunks.push(chunk);
    });
    response.on("end", function () {
      var body = Buffer.concat(chunks);
      const xml = body.toString();

      xml2js.parseString(xml, function (err, result) {
        data.imageSrc = result.ann.anime[0].info[0].$.src;
        //console.log(plot)
        console.log(util.inspect(result, false, null)); // Output: Hello world!
        console.log(data.imageSrc);
      });
    });
    });
  //  console.log(util.inspect(randomId, false, null)); // Output: Hello world!
  });
});
});
return data;
}




}
