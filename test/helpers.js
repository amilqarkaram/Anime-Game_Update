// Shared test helpers: a cookie-keeping HTTP client and a running app with
// fake quiz and score sources, so the routes can be tested without MongoDB.
const session = require("express-session");
const { createApp } = require("../app");

function makeTitles(n, prefix = "Title") {
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1, name: `${prefix} ${i + 1}`, imgSrc: `https://example.com/${i + 1}.jpg`, plotSummary: "",
  }));
}

// builds questions the way retrieve.createAnswers returns them
function fakeQuiz(poolSizes = { anime: 50, manga: 50 }) {
  const { buildQuestions } = require("../lib/quiz");
  return {
    calls: [],
    async createAnswers(difficulty, numAns, type, genres, numQ, decades) {
      this.calls.push({ difficulty, type, genres, numQ, decades });
      return buildQuestions(makeTitles(poolSizes[type], type), numQ, numAns)
        .map((a) => ({ answer1: a[0], answer2: a[1], answer3: a[2], answer4: a[3] }));
    },
  };
}

function fakeScores() {
  const rows = [];
  return {
    rows,
    async addInfo(username, score, total) {
      const row = { _id: "id" + rows.length, username, score, total, createdAt: rows.length };
      rows.push(row);
      return row;
    },
    async getInfo(limit = 10) {
      return [...rows].sort((a, b) => b.score - a.score || a.createdAt - b.createdAt).slice(0, limit);
    },
  };
}

async function startApp(options = {}) {
  const quiz = options.quiz || fakeQuiz();
  const scores = options.scores || fakeScores();
  const app = createApp({ sessionStore: new session.MemoryStore(), quiz, scores });
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  return { quiz, scores, base, close: () => new Promise((r) => server.close(r)) };
}

function client(base) {
  let cookie = "";
  async function request(method, path, body, { json = false } = {}) {
    const headers = {};
    if (cookie) headers.cookie = cookie;
    let payload;
    if (body !== undefined) {
      headers["content-type"] = json ? "application/json" : "application/x-www-form-urlencoded";
      payload = json ? JSON.stringify(body) : new URLSearchParams(body).toString();
    }
    const res = await fetch(base + path, { method, headers, body: payload, redirect: "manual" });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) cookie = setCookie.split(";")[0];
    const text = await res.text();
    return { status: res.status, location: res.headers.get("location"), text, json: () => JSON.parse(text) };
  }
  return {
    get: (path) => request("GET", path),
    post: (path, body, opts) => request("POST", path, body, opts),
  };
}

module.exports = { startApp, client, fakeQuiz, fakeScores, makeTitles };
