// Fills the database with titles from the AnimeNewsNetwork encyclopedia API.
//
//   npm run scrape                     resume after the highest id already saved
//   npm run scrape -- --from 1 --to 5000
//
// ANN allows one request per second per IP and up to 50 ids per request, so
// this asks for 50 ids at a time, at most once a second. It stops after a long
// run of ids that do not exist (the end of the encyclopedia), retries network
// errors, and can be stopped with Ctrl+C and restarted at any time: titles are
// saved by id, so nothing is duplicated.
const db = require("../db");
const { parseTitles } = require("../lib/ann");

const API_URL = "https://cdn.animenewsnetwork.com/encyclopedia/api.xml?title=";
const DEFAULTS = {
  batch: 50,        // ids per request (ANN's maximum)
  interval: 1100,   // ms between requests (ANN's limit is 1 per second)
  stopAfter: 1000,  // stop after this many ids in a row with no title
  retries: 4,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, "").replace(/-(\w)/g, (_, c) => c.toUpperCase());
    const value = Number(argv[i + 1]);
    if (!Number.isInteger(value) || value < 0) throw new Error(`--${argv[i].replace(/^--/, "")} needs a whole number`);
    opts[key] = value;
  }
  return opts;
}

async function fetchXml(ids, { fetchImpl = fetch, retries = DEFAULTS.retries, wait = sleep } = {}) {
  const url = API_URL + ids.join("/");
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetchImpl(url, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (attempt >= retries) throw new Error(`Giving up on ids ${ids[0]}-${ids[ids.length - 1]}: ${err.message}`);
      const delay = 2000 * 2 ** attempt;
      console.warn(`  ${err.message}; retrying in ${delay / 1000}s`);
      await wait(delay);
    }
  }
}

async function highestSavedId() {
  let highest = 0;
  for (const Model of [db.Anime, db.Manga]) {
    const top = await Model.findOne({ id: { $type: "number" } }).sort({ id: -1 }).lean();
    if (top && top.id > highest) highest = top.id;
  }
  return highest;
}

async function save(titles) {
  for (const [kind, Model] of [["anime", db.Anime], ["manga", db.Manga]]) {
    const ops = titles.filter((t) => t.kind === kind).map((t) => ({
      updateOne: { filter: { id: t.doc.id }, update: { $set: t.doc }, upsert: true },
    }));
    if (ops.length) await Model.bulkWrite(ops);
  }
}

async function scrape(options = {}) {
  const opts = { ...DEFAULTS, ...options };
  const wait = opts.sleep || sleep;
  try {
    await Promise.all([db.Anime.createIndexes(), db.Manga.createIndexes()]);
  } catch (err) {
    throw new Error("This database has titles saved by the old scraper. Run `npm run migrate` first.\n" + err.message);
  }
  let id = opts.from ?? (await highestSavedId()) + 1;
  let emptyRun = 0;
  let saved = 0;
  console.log(`Scraping from id ${id}${opts.to ? ` to ${opts.to}` : ""}...`);
  while (opts.to === undefined || id <= opts.to) {
    const started = Date.now();
    const last = opts.to === undefined ? id + opts.batch - 1 : Math.min(id + opts.batch - 1, opts.to);
    const ids = Array.from({ length: last - id + 1 }, (_, k) => id + k);
    const titles = await parseTitles(await fetchXml(ids, { fetchImpl: opts.fetch, retries: opts.retries, wait }));
    await save(titles);
    saved += titles.length;
    // ids in a row, up to the end of this batch, without a title
    const found = titles.map((t) => t.doc.id);
    emptyRun = found.length ? last - Math.max(...found) : emptyRun + ids.length;
    console.log(`ids ${id}-${last}: ${titles.length} saved (${saved} total)`);
    id = last + 1;
    if (opts.to === undefined && emptyRun >= opts.stopAfter) {
      console.log(`No titles in the last ${emptyRun} ids; assuming this is the end.`);
      break;
    }
    await wait(Math.max(0, opts.interval - (Date.now() - started)));
  }
  return { saved, nextId: id };
}

module.exports = { scrape, fetchXml, parseArgs };

if (require.main === module) {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
  db.connect()
    .then(() => scrape(options))
    .catch((err) => { console.error(err.message); process.exitCode = 1; })
    .finally(() => db.disconnect());
}
