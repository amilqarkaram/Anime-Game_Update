const test = require("node:test");
const assert = require("node:assert");
const { buildQuestions, shuffle } = require("../lib/quiz");

const pool = (n) => Array.from({ length: n }, (_, i) => ({ name: "t" + i, i }));

test("needs at least four titles for one question", () => {
  assert.deepStrictEqual(buildQuestions(pool(3), 10), []);
  assert.strictEqual(buildQuestions(pool(4), 10).length, 4);
});

test("a small pool gives a shorter quiz instead of failing", () => {
  assert.strictEqual(buildQuestions(pool(7), 10).length, 7);
  assert.strictEqual(buildQuestions(pool(100), 10).length, 10);
});

test("choices in a question are distinct and right answers never repeat", () => {
  for (const n of [4, 5, 12, 40]) {
    const qs = buildQuestions(pool(n), 10);
    for (const q of qs) assert.strictEqual(new Set(q).size, 4);
    assert.strictEqual(new Set(qs.map((q) => q[0])).size, qs.length);
  }
});

test("only titles passing canBeAnswer are used as right answers", () => {
  const qs = buildQuestions(pool(20), 10, 4, Math.random, (t) => t.i < 3);
  assert.strictEqual(qs.length, 3);
  for (const q of qs) assert.ok(q[0].i < 3);
});

test("shuffle keeps every item", () => {
  const items = pool(10);
  assert.deepStrictEqual(shuffle(items).map((t) => t.i).sort((a, b) => a - b), items.map((t) => t.i));
});
