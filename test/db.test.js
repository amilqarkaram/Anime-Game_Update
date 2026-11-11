// Tests that need a real MongoDB. They run only when TEST_MONGODB_URI is set,
// e.g. TEST_MONGODB_URI=mongodb://127.0.0.1:27017/animeGameTest npm test
// The database named there is wiped, so never point it at real data.
const test = require("node:test");
const assert = require("node:assert");

const uri = process.env.TEST_MONGODB_URI;

test("database", { skip: !uri && "set TEST_MONGODB_URI to run" }, async (t) => {
  const db = require("../db");
  const { migrate } = require("../scripts/migrate");
  const { scrape } = require("../scripts/scrape");
  const retrieve = require("../retrieve");
  const saveScore = require("../save-score");
  await db.connect(uri);
  await db.mongoose.connection.dropDatabase();
  t.after(async () => { await db.mongoose.connection.dropDatabase(); await db.disconnect(); });
  const quiet = (fn) => async (...args) => {
    const log = console.log, warn = console.warn;
    console.log = console.warn = () => {};
    try { return await fn(...args); } finally { console.log = log; console.warn = warn; }
  };

  await t.test("migrate converts old text data and removes duplicate ids", quiet(async () => {
    await db.Anime.collection.insertMany([
      { id: "5", name: "Old", nbVotes: "1200", weightedScore: "7.1", bayesianScore: "none", releaseDates: ["2001-01-01"] },
      { id: "5", name: "Old again", nbVotes: "1200", releaseDates: ["2001-01-01", "2002-01-01"] },
      { id: "20", name: "Unrated", nbVotes: "none", releaseDates: ["none"] },
    ]);
    await db.Score.collection.insertMany([{ username: "a", score: "9" }, { username: "b", score: "10" }]);
    assert.strictEqual(await db.needsMigration(), true);
    await migrate();
    await migrate(); // safe to run twice
    assert.strictEqual(await db.needsMigration(), false);
    const docs = await db.Anime.find().sort({ id: 1 }).lean();
    assert.deepStrictEqual(docs.map((d) => [d.id, d.name, d.nbVotes]), [[5, "Old again", 1200], [20, "Unrated", null]]);
    assert.deepStrictEqual((await saveScore.getInfo()).map((s) => [s.username, s.score, s.total]), [["b", 10, 10], ["a", 9, 10]]);
    await db.mongoose.connection.dropDatabase();
  }));

  await t.test("scrape batches, retries, resumes and never duplicates", quiet(async () => {
    const requests = [];
    let failures = 0;
    const fakeFetch = async (url) => {
      const ids = url.split("=")[1].split("/").map(Number);
      requests.push(ids);
      if (ids.includes(57) && failures++ < 2) throw new Error("ECONNRESET");
      const body = ids.map((id) => {
        if (id > 120) return `<warning>no result for title=${id}</warning>`;
        const kind = id % 2 ? "anime" : "manga";
        return `<${kind} id="${id}" name="T${id}"><info type="Genres">Action</info><ratings nb_votes="${id * 10}" weighted_score="7" bayesian_score="7"/></${kind}>`;
      }).join("");
      return { ok: true, status: 200, text: async () => `<ann>${body}</ann>` };
    };
    const opts = { fetch: fakeFetch, sleep: async () => {}, stopAfter: 200 };
    assert.deepStrictEqual(await scrape({ ...opts, to: 60 }), { saved: 60, nextId: 61 });
    assert.ok(requests.every((ids) => ids.length <= 50));
    assert.strictEqual(failures, 3); // two failed attempts, then success
    const resumed = await scrape(opts);
    assert.strictEqual(resumed.saved, 60);
    assert.strictEqual(requests.filter((ids) => ids[0] === 61).length, 1);
    await scrape({ ...opts, from: 1, to: 120 });
    assert.strictEqual(await db.Anime.countDocuments() + await db.Manga.countDocuments(), 120);
    const one = await db.Anime.findOne({ id: 1 }).lean();
    assert.deepStrictEqual([one.nbVotes, one.genres], [10, ["action"]]);
    await db.mongoose.connection.dropDatabase();
  }));

  await t.test("retrieve filters by genre, votes, decade and excluded genres", async () => {
    const base = { imgSrc: "https://x/y.jpg", plotSummary: "" };
    await db.Anime.insertMany([
      ...Array.from({ length: 6 }, (_, i) => ({ ...base, id: i + 1, name: `Popular ${i}`, nbVotes: 5000, genres: ["action", "comedy"], releaseDates: ["2012-01-01"] })),
      { ...base, id: 50, name: "Obscure", nbVotes: 20, genres: ["action"], releaseDates: ["2012-01-01"] },
      { ...base, id: 51, name: "Unrated", nbVotes: null, genres: ["action"], releaseDates: ["2012-01-01"] },
      { ...base, id: 52, name: "Nineties", nbVotes: 5000, genres: ["action"], releaseDates: ["1995-01-01"] },
      { ...base, id: 53, name: "Adult", nbVotes: 5000, genres: ["action", "erotica"], releaseDates: ["2012-01-01"] },
    ]);
    const names = async (difficulty) => (await retrieve.findTitles("anime", ["action", "comedy"], difficulty)).map((x) => x.name).sort();
    assert.strictEqual((await names("normal")).length, 7); // six popular (once each) + Nineties
    assert.ok(!(await names("normal")).includes("Obscure"));
    assert.ok((await names("master")).includes("Unrated"));
    assert.ok(!(await names("master")).includes("Adult"));
    const questions = await retrieve.createAnswers("normal", 4, "anime", ["action"], 10, [2010]);
    assert.strictEqual(questions.length, 6);
    for (const q of questions) assert.ok(q.answer1.name.startsWith("Popular"));
  });
});
