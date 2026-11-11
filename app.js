const express = require("express");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const config = require(__dirname + "/config.js");
const db = require(__dirname + "/db.js");
const retrieve = require(__dirname + "/retrieve.js");
const saveScore = require(__dirname + "/save-score.js");
const settingsForm = require(__dirname + "/lib/settings.js");

const numAnswers = 4; // four choices per question
const TOTAL_QUESTIONS = 10;

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

  function renderIndex(res, form = {}, error = null) {
    res.render("index", {
      form, error,
      genres: settingsForm.GENRES,
      difficulties: settingsForm.DIFFICULTIES,
      decades: settingsForm.DECADES,
      maxUsername: settingsForm.MAX_USERNAME,
    });
  }

  app.get("/", function (req, res) {
    renderIndex(res);
  });

  // The Play button submits the whole settings form in one request, so the
  // server always has the player's choices before the first question is built.
  app.post("/start", async function (req, res) {
    const { settings, error } = settingsForm.parseSettings(req.body);
    if (error) {
      // show the form again, with their choices still ticked
      return renderIndex(res.status(400), settings, error);
    }
    // all questions are created as soon as Play is clicked; with both anime
    // and manga chosen, half of the questions come from each
    const perType = Math.ceil(TOTAL_QUESTIONS / settings.types.length);
    const questions = [];
    for (const type of settings.types) {
      const forType = await retrieve.createAnswers(settings.difficulty, numAnswers, type, settings.genres, perType, settings.decades);
      if (forType.length === 0) {
        return renderIndex(res.status(400), settings,
          "Not enough " + (type === "anime" ? "anime" : "manga") + " match these choices to make a question. " +
          "Try adding genres or decades, or pick Master to include less popular titles.");
      }
      questions.push(...forType);
    }
    const game = newGame();
    game.username = settings.username;
    game.types = settings.types;
    game.genres = settings.genres;
    game.difficulty = settings.difficulty;
    game.years = settings.decades;
    // only the fields the page needs are kept in the session
    game.questions = questions.slice(0, TOTAL_QUESTIONS).map((q) => ({
      answer1: pick(q.answer1), answer2: pick(q.answer2),
      answer3: pick(q.answer3), answer4: pick(q.answer4),
    }));
    game.numQuestions = game.questions.length;
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

  // Anything unexpected (database down, a bug) shows a page with a way back
  // instead of leaving the browser waiting on a request that never finishes.
  app.use(function (err, req, res, next) {
    console.error(err);
    if (res.headersSent) return next(err);
    res.status(500).render("error", { message: "The quiz could not be loaded. Please try again." });
  });

  return app;
}

function pick(title) {
  return { name: title.name, imgSrc: title.imgSrc, plotSummary: title.plotSummary };
}

module.exports = { createApp };

// start the server when this file is run directly (node app.js)
if (require.main === module) {
  db.connect()
    .then(() => {
      createApp().listen(config.PORT, () => console.log("listening on http://localhost:" + config.PORT));
    })
    .catch((err) => {
      console.error("Could not connect to MongoDB at " + config.MONGODB_URI.replace(/\/\/[^@]*@/, "//***@") + "\n" + err.message);
      process.exit(1);
    });
}
