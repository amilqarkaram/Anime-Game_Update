const express = require("express");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const config = require(__dirname + "/config.js");
const db = require(__dirname + "/db.js");
const retrieve = require(__dirname + "/retrieve.js");
const saveScore = require(__dirname + "/save-score.js");
const settingsForm = require(__dirname + "/lib/settings.js");
const { shuffle } = require(__dirname + "/lib/quiz.js");
const { hasImage } = require(__dirname + "/lib/titles.js");

const numAnswers = 4; // four choices per question
const TOTAL_QUESTIONS = 10;

// Everything that belongs to one player lives in their session (one per
// browser), not in global variables shared by every visitor of the server.
//   questions: [{ imgSrc, plotSummary, choices: [4 names], answer: index }]
//   current:   index of the question being shown
function newGame(settings, questions) {
  return {
    username: settings.username,
    questions,
    current: 0,
    score: 0,
    scoreSaved: false,
  };
}

function createApp(options = {}) {
  const app = express();
  app.use(express.static(__dirname + "/public")); // css and browser-side js
  app.use(express.urlencoded({ extended: true })); // read form posts
  app.use(express.json()); // answers sent by the game page's script
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
    // the choices are shuffled once, here, so reloading a question shows it
    // exactly as before
    const game = newGame(settings, questions.slice(0, TOTAL_QUESTIONS).map(toQuestion));
    req.session.game = game;
    res.redirect("/game");
  });

  // Shows the current question. Reloading the page shows the same question
  // again; it no longer skips ahead or ends the quiz.
  app.get("/game", function (req, res) {
    const game = req.session.game;
    if (!game) {
      return res.redirect("/");
    }
    if (game.current >= game.questions.length) {
      return res.redirect("/score");
    }
    const q = game.questions[game.current];
    res.render("game", {
      questionIndex: game.current,
      imageSrc: q.imgSrc, src: q.plotSummary,
      choices: q.choices,
    });
  });

  // The page only says which button was clicked (0-3); whether it was right
  // is decided here. Before, every button carried value="correct" or
  // "incorrect" in the page source, so the answer could simply be read off,
  // or sent as "correct" every time.
  // The game page's script asks for JSON so it can colour the buttons before
  // moving on; a plain form post (no JavaScript) is redirected straight on.
  app.post("/game", function (req, res) {
    const wantsJson = req.is("application/json");
    const game = req.session.game;
    if (!game) {
      return wantsJson ? res.status(409).json({ next: "/" }) : res.redirect("/");
    }
    const index = Number(req.body.question);
    const q = game.questions[index];
    let correct = null;
    // Only an answer to the question currently shown counts. A double click,
    // or going back and answering an old question again, changes nothing.
    if (index === game.current && q) {
      correct = Number(req.body.choice) === q.answer;
      if (correct) {
        ++game.score;
      }
      ++game.current;
    }
    const next = game.current >= game.questions.length ? "/score" : "/game";
    if (wantsJson) {
      return res.json({ correct, answer: q ? q.answer : null, next });
    }
    res.redirect(next);
  });

  // The score is saved the first time this page is shown for a finished game;
  // reloading it shows the board again without adding another row.
  app.get("/score", async function (req, res) {
    const game = req.session.game;
    if (!game) {
      return res.redirect("/");
    }
    if (game.current < game.questions.length) {
      return res.redirect("/game");
    }
    if (!game.scoreSaved) {
      game.scoreSaved = true;
      await new Promise((resolve, reject) => req.session.save((err) => (err ? reject(err) : resolve())));
      try {
        const saved = await saveScore.addInfo(game.username, game.score, game.questions.length);
        game.scoreId = String(saved._id);
      } catch (err) {
        game.scoreSaved = false; // let a reload try again
        throw err;
      }
    }
    const scoreboard = await saveScore.getInfo(10);
    res.render("score", {
      scoreboard,
      myScoreId: game.scoreId,
      username: game.username,
      score: game.score,
      numQuestions: game.questions.length,
    });
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

// question as stored in the session: the right answer is answer1 in what
// createAnswers returns; the choices are shuffled and its new position kept
function toQuestion(q) {
  const correct = q.answer1;
  const choices = shuffle([q.answer1, q.answer2, q.answer3, q.answer4].map((t) => t.name));
  return {
    imgSrc: hasImage(correct) ? correct.imgSrc : null,
    plotSummary: correct.plotSummary,
    choices,
    answer: choices.indexOf(correct.name),
  };
}

module.exports = { createApp };

// start the server when this file is run directly (node app.js)
if (require.main === module) {
  db.connect()
    .then(async () => {
      if (await db.needsMigration()) {
        console.warn("This database was filled by the old scraper. Run `npm run migrate` once so difficulty filtering works.");
      }
      createApp().listen(config.PORT, () => console.log("listening on http://localhost:" + config.PORT));
    })
    .catch((err) => {
      console.error("Could not connect to MongoDB at " + config.MONGODB_URI.replace(/\/\/[^@]*@/, "//***@") + "\n" + err.message);
      process.exit(1);
    });
}
