const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { parseTitles } = require("../lib/ann");

test("parses anime and manga from a batched response and skips warnings", async () => {
  const xml = fs.readFileSync(path.join(__dirname, "fixtures", "ann-batch.xml"), "utf8");
  const titles = await parseTitles(xml);
  assert.deepStrictEqual(titles.map((t) => [t.kind, t.doc.id]), [["anime", 1], ["manga", 4]]);
  const anime = titles[0].doc;
  assert.strictEqual(anime.name, "Angel Links");
  assert.strictEqual(anime.imgSrc, "https://cdn.animenewsnetwork.com/thumbnails/fit200x200/encyc/A1-28.jpg");
  assert.deepStrictEqual(anime.genres, ["action", "science fiction"]);
  assert.deepStrictEqual(anime.releaseDates, ["1999-04-06 to 1999-09-28", "2001-04-06"]);
  assert.strictEqual(anime.nbVotes, 1153);
  assert.strictEqual(anime.bayesianScore, 5.75);
  const manga = titles[1].doc;
  assert.strictEqual(manga.imgSrc, null);
  assert.strictEqual(manga.nbVotes, null);
});

test("a response with only warnings gives no titles", async () => {
  assert.deepStrictEqual(await parseTitles("<ann><warning>no result for title=99999</warning></ann>"), []);
});
