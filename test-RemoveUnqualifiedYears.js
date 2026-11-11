// const retrieve = require(__dirname + "/retrieve.js");
// const test = retrieve.createAnswers(4,"anime",["comedy","action"],10);
const util = require("util");
const data = [
  {
    type: "anime",
    genres: "pschological",
    releaseDates:["2006-04-20", "1995-06-7","1983-04-8"]
  },
  {
    type: "manga",
    genres: "action",
    releaseDates:["1990-04-20", "2007-06-7","2011-04-8"]
  },
  {
    type: "anime",
    genres: "tournament",
    releaseDates:["2004-04-20", "2007-06-7", "2005-04-8"]
  },
  {
    type: "manga",
    genres: "tournament",
    releaseDates:[
      '2013-10-22',
      '2016-11-29',
      '2003-09-09',
      '2003-09-09',
      '2013-10-22',
      '2006-01-10'
    ]
  }
];
const years = ["2010"];
function removeUnqualifiedYears(years,data){
return new Promise((resolve, reject) => {
  console.log("data" + data.length);
  let removeElement = [];
for(var l = 0; l < data.length;++l){
// doesn't work if releaseDates is undefined
let earliestDateRoot = data[l].releaseDates[0].substring(0,3);
for(var j = 1; j < data[l].releaseDates.length; ++j){
  releaseYearRoot = data[l].releaseDates[j].substring(0,3);
  //console.log("release root for the object" + l + "is " + releaseYearRoot);
  let previousReleaseYearRoot = data[l].releaseDates[j - 1].substring(0,3);
  if(Number(releaseYearRoot) < Number(previousReleaseYearRoot)){
    earliestDateRoot = releaseYearRoot;
  }
}
for(var m = 0; m < years.length; ++m){
  console.log("earliest Date root for the " + l + "th object is " + earliestDateRoot);
if(earliestDateRoot === years[m].substring(0,3)){
  //console.log("found a match");
  break;
}
else{
  removeElement.push(l);
  continue;
}
}
}
  console.log("removeElement array " + removeElement);
  for(let b = removeElement.length - 1; b >= 0; --b){
    data.splice(removeElement[b],1);
  };
  resolve(data);
});

}

removeUnqualifiedYears(years,data).then(() => {console.log(util.inspect(data, false, null));});
