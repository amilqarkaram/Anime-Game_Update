const test = require("node:test");
const assert = require("node:assert");
const { startApp, client, fakeQuiz } = require("./helpers");

const FORM = "genres=action&genres=comedy&types=anime&difficulty=Normal&decades=2010&username=amilqar";
const questionNumber = (html) => Number(html.match(/name="question" value="(\d+)"/)[1]);
const buttons = (html) => html.match(/<button[^>]*name="choice"[^>]*>[^<]*<\/button>/g);

// answers every remaining question with the given choice; returns how many were right
async function playThrough(c, choice = 0) {
  let right = 0;
  for (;;) {
    const page = await c.get("/game");
    if (page.status !== 200) return right;
    const r = (await c.post("/game", { question: questionNumber(page.text), choice }, { json: true })).json();
    if (r.correct) right++;
  }
}

test("the settings page offers the choices", async (t) => {
  const app = await startApp(); t.after(app.close);
  const html = (await client(app.base).get("/")).text;
  assert.match(html, /<form action="\/start" method="post">/);
  assert.match(html, /value="action"/);
  assert.doesNotMatch(html, /erotica/);
  assert.doesNotMatch(html, /alert\(/);
});

test("a missing choice shows a message and keeps what was ticked", async (t) => {
  const app = await startApp(); t.after(app.close);
  const r = await client(app.base).post("/start", "genres=action&types=anime");
  assert.strictEqual(r.status, 400);
  assert.match(r.text, /Please pick at least one decade/);
  assert.match(r.text, /value="action" checked/);
  assert.strictEqual(app.quiz.calls.length, 0);
});

test("too few matching titles sends the player back with advice", async (t) => {
  const app = await startApp({ quiz: fakeQuiz({ anime: 3, manga: 50 }) }); t.after(app.close);
  const r = await client(app.base).post("/start", FORM);
  assert.strictEqual(r.status, 400);
  assert.match(r.text, /Not enough anime match/);
});

test("a full game: 10 questions, settings passed through, score saved once", async (t) => {
  const app = await startApp(); t.after(app.close);
  const c = client(app.base);
  const start = await c.post("/start", FORM);
  assert.strictEqual(start.status, 302);
  assert.strictEqual(start.location, "/game");
  assert.deepStrictEqual(app.quiz.calls[0], { difficulty: "normal", type: "anime", genres: ["action", "comedy"], numQ: 10, decades: [2010] });

  const right = await playThrough(c);
  const board = await c.get("/score");
  assert.strictEqual(board.status, 200);
  assert.match(board.text, new RegExp(`you scored ${right} / 10`));
  await c.get("/score"); // reloading the scoreboard
  assert.strictEqual(app.scores.rows.length, 1);
  assert.deepStrictEqual([app.scores.rows[0].username, app.scores.rows[0].score, app.scores.rows[0].total], ["amilqar", right, 10]);
});

test("anime and manga together give five questions of each", async (t) => {
  const app = await startApp(); t.after(app.close);
  await client(app.base).post("/start", FORM + "&types=manga");
  assert.deepStrictEqual(app.quiz.calls.map((x) => [x.type, x.numQ]), [["anime", 5], ["manga", 5]]);
});

test("two players at once do not affect each other", async (t) => {
  const app = await startApp(); t.after(app.close);
  const a = client(app.base), b = client(app.base);
  await a.post("/start", FORM.replace("amilqar", "alice"));
  await b.post("/start", FORM.replace("amilqar", "bob"));
  // alice answers two questions; bob should still be on his first
  for (let i = 0; i < 2; i++) await a.post("/game", { question: i, choice: 0 }, { json: true });
  assert.strictEqual(questionNumber((await a.get("/game")).text), 2);
  assert.strictEqual(questionNumber((await b.get("/game")).text), 0);
});

test("reloading a question shows the same question", async (t) => {
  const app = await startApp(); t.after(app.close);
  const c = client(app.base);
  await c.post("/start", FORM);
  const first = await c.get("/game"), again = await c.get("/game");
  assert.deepStrictEqual(buttons(again.text), buttons(first.text));
  assert.strictEqual(questionNumber(again.text), 0);
});

test("the page does not reveal the answer and old answers cannot be resent", async (t) => {
  const app = await startApp(); t.after(app.close);
  const c = client(app.base);
  await c.post("/start", FORM);
  const page = await c.get("/game");
  assert.doesNotMatch(page.text, /correct/);
  assert.deepStrictEqual(page.text.match(/name="choice" value="(\d)"/g).length, 4);

  const first = (await c.post("/game", { question: 0, choice: 0 }, { json: true })).json();
  assert.strictEqual(typeof first.correct, "boolean");
  assert.ok(first.answer >= 0 && first.answer < 4);
  // the same answer again (double click / back button) is ignored
  const repeat = (await c.post("/game", { question: 0, choice: first.answer }, { json: true })).json();
  assert.strictEqual(repeat.correct, null);
  assert.strictEqual(questionNumber((await c.get("/game")).text), 1);
  // the old cheat of posting button=correct scores nothing
  await c.post("/game", { question: 1, button: "correct" });
  await playThrough(c, 0);
  await c.get("/score");
  assert.ok(app.scores.rows[0].score <= 9);
});

test("pages without a game go back to the start", async (t) => {
  const app = await startApp(); t.after(app.close);
  const c = client(app.base);
  for (const path of ["/game", "/score"]) assert.strictEqual((await c.get(path)).location, "/");
});

test("the scoreboard is not shown before the quiz is finished", async (t) => {
  const app = await startApp(); t.after(app.close);
  const c = client(app.base);
  await c.post("/start", FORM);
  assert.strictEqual((await c.get("/score")).location, "/game");
  assert.strictEqual(app.scores.rows.length, 0);
});

test("a database error shows an error page instead of hanging", async (t) => {
  const app = await startApp({ quiz: { createAnswers: async () => { throw new Error("db down"); } } });
  t.after(app.close);
  const original = console.error; console.error = () => {}; t.after(() => { console.error = original; });
  const r = await client(app.base).post("/start", FORM);
  assert.strictEqual(r.status, 500);
  assert.match(r.text, /Back to the start/);
});
