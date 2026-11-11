const test = require("node:test");
const assert = require("node:assert");
const { earliestYear, filterByDecades, uniqueTitles, canBeQuestion } = require("../lib/titles");

const titles = [
  { name: "A", releaseDates: ["2015-01-01"] },
  { name: "B", releaseDates: ["1995-01-01"] },
  { name: "C", releaseDates: ["1990-01-01", "2010-01-01", "2000-01-01"] },
  { name: "D", releaseDates: ["none"] },
  { name: "E", releaseDates: ["2023-04-06 to 2023-09-28"] },
  { name: "F" },
];
const names = (list) => list.map((t) => t.name);

test("earliestYear finds the smallest year in any order", () => {
  assert.strictEqual(earliestYear(["1990-01-01", "2010-01-01", "2000-01-01"]), 1990);
  assert.strictEqual(earliestYear(["2003-09-09", "1999-04-06 to 1999-09-28"]), 1999);
  assert.strictEqual(earliestYear(["none", ""]), null);
  assert.strictEqual(earliestYear(undefined), null);
});

test("several decades keep titles from each of them, in any order", () => {
  assert.deepStrictEqual(names(filterByDecades(titles, [2010, 1990])), ["A", "B", "C"]);
  assert.deepStrictEqual(names(filterByDecades(titles, [1990, 2010])), ["A", "B", "C"]);
  assert.deepStrictEqual(names(filterByDecades(titles, [2000])), []);
  assert.deepStrictEqual(names(filterByDecades(titles, [2020])), ["E"]);
});

test("uniqueTitles drops repeated ids and names", () => {
  const list = [{ id: 1, name: "X" }, { id: 1, name: "X" }, { id: 2, name: " x " }, { id: 3, name: "Y" }];
  assert.deepStrictEqual(uniqueTitles(list).map((t) => t.id), [1, 3]);
});

test("a title needs a real picture or a summary to be asked about", () => {
  assert.strictEqual(canBeQuestion({ imgSrc: "https://x/y.jpg", plotSummary: "" }), true);
  assert.strictEqual(canBeQuestion({ imgSrc: "none", plotSummary: "A story." }), true);
  assert.strictEqual(canBeQuestion({ imgSrc: "none", plotSummary: "  " }), false);
  assert.strictEqual(canBeQuestion({}), false);
});
