var genres = [];
var difficulty = "normal";
var years = [];
for (var i = 0; i < 28; ++i) {
  document.querySelectorAll("button")[i].addEventListener("click", function() {
// the button was clicked was to submit the username
    if (this.value === "username") {
      let input = document.querySelector("input");
      this.classList.add("hide");

      input.classList.add("hide");
      var para = document.createElement("P"); // Create a <p> element
      para.innerHTML = "Welcome " + input.value + "!"; // Insert text
      document.querySelector(".inputField").appendChild(para); // Append <p> to <div> with id="myDIV"
      // making use of AJAX techniques to send a post request to server without refreshing the page
      $.post("/", {
        button: this.value,
        input: input.value
      }, function(data, status) {

      });
    }
    // if instead a genre was clicked
    else if (this.name === "genres") {
      // check if the genres was already clicked and toggle class accordingly
      if (this.classList.contains("clicked")) {
        this.classList.remove("clicked");
        var index = genres.indexOf(this.value);
        // remove this genre from the genre array
        genres.splice(index, 1);
      } else {
        this.classList.add("clicked");
        //add the genre to the genre array
        genres.push(this.value);
      }

    }
    //if the button was a difficulty indicator
    else if (this.value === "difficulty") {
      // in this case, only one of the genres can be picked
      let clicked = document.querySelector(".clicked.difficulty");
      if (clicked !== null && clicked !== this) {
        clicked.classList.remove("clicked");
        this.classList.add("clicked");
        difficulty = this.innerHTML;
      } else if (this.classList.contains("clicked")) {
        this.classList.remove("clicked");
        // re-initialize difficulty to original value
        difficulty = "Normal";
      } else {
        this.classList.add("clicked");
        difficulty = this.innerHTML;
      }

    } else if (this.value === "years") {
      yearString = this.name.substring(0, 4);
      alert("yearString: " + yearString);
      if (this.classList.contains("clicked")) {
        this.classList.remove("clicked");
        var index = years.indexOf(yearString);
        years.splice(index, 1);
      } else {
        this.classList.add("clicked");
        years.push(yearString);
      }
    } else if (this.value === "play") {
      //Using AJAX techniques to send a post request with all of the information needed to generate a quiz
      $.post("/", {
        button: "ajax-info",
        genres: genres,
        difficulty: difficulty,
        years: years
      }, function(data, status) {});
      //after the information is sent then another post request is sent
      //by creating a button and the sumbiting a form, thereby sending a post request
      var input = document.createElement("input");
      input.name = "button";
      input.value = "play";
      input.classList.add("hide");
      document.querySelector(".inputField").appendChild(input);
      document.querySelector("form").submit();
    }
  });
};

// if(sessionStorage.getItem("usernameField")){
//   document.querySelector(".btn-sm").classList.add("hide");
//   var inputBox = document.querySelector("input");
//   inputBox.classList.add("hide");
//   var para = document.createElement("P");                 // Create a <p> element
//   para.innerHTML = "Welcome " + sessionStorage.getItem("usernameField") + "!";                // Insert text
//   document.querySelector(".inputField").appendChild(para);
// };
