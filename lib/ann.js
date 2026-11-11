// Turns AnimeNewsNetwork encyclopedia XML (api.xml) into documents for the
// database. Kept separate from the network code so it can be tested offline.
const xml2js = require("xml2js");

// <info type="Genres">action</info> parses to { _: "action", $: {...} }
function text(node) {
  if (node === undefined || node === null) return "";
  return String(typeof node === "object" ? node._ ?? "" : node).trim();
}

function number(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toTitle(root, kind) {
  const attrs = root.$ || {};
  const id = Number(attrs.id);
  if (!Number.isInteger(id)) return null;
  const infos = root.info || [];
  const ofType = (type) => infos.filter((info) => info.$ && info.$.type === type);
  const picture = ofType("Picture")[0];
  const ratings = root.ratings && root.ratings[0] && root.ratings[0].$;
  return {
    kind, // "anime" or "manga": which collection it belongs in
    doc: {
      id,
      name: attrs.name || null,
      type: kind === "anime" ? "Anime" : "Manga",
      // the Picture entry, not simply the first <info> as before
      imgSrc: (picture && picture.$.src) || null,
      plotSummary: text(ofType("Plot Summary")[0]),
      genres: ofType("Genres").map((g) => text(g).toLowerCase()).filter(Boolean),
      // "Vintage" holds the original air/publication dates; <release> entries
      // are mostly later home-video releases. Both are kept, and the quiz uses
      // the earliest year among them.
      releaseDates: [
        ...ofType("Vintage").map(text),
        ...(root.release || []).map((r) => r.$ && r.$.date),
      ].filter(Boolean),
      nbVotes: number(ratings && ratings.nb_votes),
      weightedScore: number(ratings && ratings.weighted_score),
      bayesianScore: number(ratings && ratings.bayesian_score),
    },
  };
}

// Returns [{ kind, doc }] for every title in the response (a request can ask
// for up to 50 ids at once). Ids that do not exist come back as <warning>
// entries and are simply absent from the result.
async function parseTitles(xml) {
  const result = await xml2js.parseStringPromise(xml);
  const ann = result && result.ann;
  if (!ann || typeof ann !== "object") return [];
  const titles = [];
  for (const kind of ["anime", "manga"]) {
    for (const root of ann[kind] || []) {
      const title = toTitle(root, kind);
      if (title) titles.push(title);
    }
  }
  return titles;
}

module.exports = { parseTitles };
