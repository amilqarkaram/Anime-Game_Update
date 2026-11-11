const express = require("express");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const config = require(__dirname + "/config.js");
const db = require(__dirname + "/db.js");
const retrieve = require(__dirname + "/retrieve.js");
const saveScore = require(__dirname + "/save-score.js");

const numAnswers = 4; // four choices per question

// Everything that belongs to one player lives in their session (one per
// browser), not in global variables shared by every visitor of the server.
function newGame() {
  return {
    types: [],
    genres: [],
    years: [],
    difficulty: "Normal",
    username: "",
    questions: null,
    numQuestions: 10,
    questionNumber: 0,
    completedQuestions: [],
    score: 0,
  };
}

function createApp(options = {}) {
  const app = express();
  app.use(express.static(__dirname + "/public")); // css and browser-side js
  app.use(express.urlencoded({ extended: true })); // read form posts
  app.set("view engine", "ejs");
  app.set("views", __dirname + "/views");
  app.use(session({
    secret: config.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    // sessions are kept in MongoDB so they survive a server restart;
    // tests pass their own in-memory store instead
    store: options.sessionStore || MongoStore.create({ mongoUrl: config.MONGODB_URI }),
    cookie: { httpOnly: true, sameSite: "lax" },
  }));

  app.get("/", function (req, res) {
    res.render("index");
  });

  // The Play button submits the whole settings form in one request, so the
  // server always has the player's choices before the first question is built.
  app.post("/start", function (req, res) {
    const game = newGame();
    game.username = req.body.username;
    game.types = toArray(req.body.types);
    game.genres = toArray(req.body.genres);
    game.difficulty = req.body.difficulty;
    game.years = toArray(req.body.decades);
    game.questionNumber = 1;
    req.session.game = game;
    res.redirect("/game");
  });

  app.get("/game", async function (req, res) {
    const game = req.session.game;
    if (!game || game.questionNumber === 0) {
      return res.redirect("/");
    }
    console.log("Question Number: " + game.questionNumber);

    if (!game.completedQuestions.includes(game.questionNumber) && game.questionNumber <= game.numQuestions) {
      // right after "play" is clicked, all questions and answers are created
      if (game.questionNumber === 1 && !game.questions) {
        const onlyGenres = game.genres;
        let questions = [];
        // if the user chose both anime and manga, 5 questions come from each
        const wantsAnime = game.types.includes("anime");
        const wantsManga = game.types.includes("manga");
        if (wantsAnime && wantsManga) {
          game.numQuestions = 10;
          questions = await retrieve.createAnswers(game.difficulty, numAnswers, "anime", onlyGenres, 5, game.years);
          questions.push(...await retrieve.createAnswers(game.difficulty, numAnswers, "manga", onlyGenres, 5, game.years));
        } else if (wantsAnime) {
          questions = await retrieve.createAnswers(game.difficulty, numAnswers, "anime", onlyGenres, 10, game.years);
        } else if (wantsManga) {
          questions = await retrieve.createAnswers(game.difficulty, numAnswers, "manga", onlyGenres, 10, game.years);
        }
        // only the fields the page needs are kept in the session
        game.questions = questions.map((q) => ({
          answer1: pick(q.answer1), answer2: pick(q.answer2),
          answer3: pick(q.answer3), answer4: pick(q.answer4),
        }));
      }

      const root = game.questions[game.questionNumber - 1];
      game.completedQuestions.push(game.questionNumber);
      // the first answer is always the correct one, so shuffle the choices
      const tempAns = [root.answer1.name, root.answer2.name, root.answer3.name, root.answer4.name];
      const randAns = [];
      const vals = [];
      for (let i = 0; i < numAnswers; ++i) {
        const rand = Math.floor(tempAns.length * Math.random());
        randAns.push(tempAns[rand]);
        vals.push(tempAns[rand] === root.answer1.name ? "correct" : "incorrect");
        tempAns.splice(rand, 1);
      }
      return res.render("game", {
        imageSrc: root.answer1.imgSrc, src: root.answer1.plotSummary,
        answer1: randAns[0], answer2: randAns[1], answer3: randAns[2], answer4: randAns[3],
        val1: vals[0], val2: vals[1], val3: vals[2], val4: vals[3],
      });
    }

    // otherwise the quiz is over: save the score and show the scoreboard
    await saveScore.addInfo(game.username, game.score);
    const arr = await saveScore.getInfo();
    res.render("score", { scoreboard: arr, username: game.username, score: game.score, numQuestions: game.numQuestions });
  });

  app.post("/game", function (req, res) {
    const game = req.session.game;
    if (!game) {
      return res.redirect("/");
    }
    if (req.body.button === "correct") {
      ++game.score;
    }
    ++game.questionNumber;
    // wait 1 second before redirecting, so the player can see if they were right or wrong
    req.session.save(() => setTimeout(() => res.redirect("/game"), 1000));
  });

  return app;
}

// a form field sent once arrives as a string, sent several times as an array
function toArray(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function pick(title) {
  return { name: title.name, imgSrc: title.imgSrc, plotSummary: title.plotSummary };
}

module.exports = { createApp };

// start the server when this file is run directly (node app.js)
if (require.main === module) {
  db.connect().then(() => {
    createApp().listen(config.PORT, () => console.log("listening on port " + config.PORT));
  });
}
