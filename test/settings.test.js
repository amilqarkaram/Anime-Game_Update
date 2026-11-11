const test = require("node:test");
const assert = require("node:assert");
const { parseSettings } = require("../lib/settings");

const valid = { genres: ["action", "comedy"], types: "anime", decades: ["2010", "1990"], difficulty: "Expert", username: "  amilqar  " };

test("accepts a complete form and normalises it", () => {
  const { settings, error } = parseSettings(valid);
  assert.strictEqual(error, null);
  assert.deepStrictEqual(settings, {
    genres: ["action", "comedy"], types: ["anime"], decades: [2010, 1990], difficulty: "expert", username: "amilqar",
  });
});

test("asks for every missing choice", () => {
  assert.match(parseSettings({}).error, /at least one genre, Anime or Manga and at least one decade/);
  assert.match(parseSettings({ ...valid, types: undefined }).error, /^Please pick Anime or Manga/);
  assert.match(parseSettings({ ...valid, decades: [] }).error, /at least one decade/);
});

test("drops unknown and excluded values", () => {
  const { settings } = parseSettings({ ...valid, genres: ["action", "erotica", "hacking"], types: ["anime", "movies"], decades: ["1850", "2020"] });
  assert.deepStrictEqual(settings.genres, ["action"]);
  assert.deepStrictEqual(settings.types, ["anime"]);
  assert.deepStrictEqual(settings.decades, [2020]);
});

test("difficulty is case-insensitive and defaults to normal", () => {
  for (const [input, expected] of [["NORMAL", "normal"], ["master", "master"], ["god", "normal"], [undefined, "normal"]]) {
    assert.strictEqual(parseSettings({ ...valid, difficulty: input }).settings.difficulty, expected);
  }
});

test("username is trimmed, capped and defaults to Anonymous", () => {
  assert.strictEqual(parseSettings({ ...valid, username: "   " }).settings.username, "Anonymous");
  assert.strictEqual(parseSettings({ ...valid, username: "x".repeat(50) }).settings.username.length, 20);
});
