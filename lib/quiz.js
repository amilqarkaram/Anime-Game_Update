// Turns a pool of matching titles into multiple-choice questions.

// Fisher-Yates shuffle; returns a new array. `random` can be swapped in tests.
function shuffle(items, random = Math.random) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Builds up to numQuestions questions of numAnswers titles each, with the
// right answer first. Only the right answers have to be different from each
// other; wrong choices are drawn from the rest of the pool and may come back in
// later questions. So a pool needs just numAnswers titles to make a question,
// instead of numQuestions * numAnswers (40) as before, and when it holds
// fewer titles than requested questions the quiz is simply shorter.
// Only titles passing canBeAnswer (something to show) are used as right
// answers; any title in the pool can be a wrong choice.
// Returns [] when the pool is too small for even one question.
function buildQuestions(pool, numQuestions, numAnswers = 4, random = Math.random, canBeAnswer = () => true) {
  if (pool.length < numAnswers) return [];
  const candidates = pool.filter(canBeAnswer);
  const correctAnswers = shuffle(candidates, random).slice(0, Math.min(numQuestions, candidates.length));
  return correctAnswers.map((correct) => {
    const others = shuffle(pool.filter((t) => t !== correct), random).slice(0, numAnswers - 1);
    return [correct, ...others];
  });
}

module.exports = { shuffle, buildQuestions };
