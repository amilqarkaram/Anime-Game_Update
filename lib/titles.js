// Helpers for deciding which titles from the database can be used in a quiz.

// The earliest year mentioned in a title's dates (e.g. "2006-04-20",
// "1999-04-06 to 1999-09-28"), or null when none of them has a year.
// The old code compared each date only with the one before it, so for dates
// 1990 / 2010 / 2000 it picked 2000.
function earliestYear(dates) {
  let earliest = null;
  for (const date of dates || []) {
    const match = String(date).match(/\b(1[89]\d\d|20\d\d)\b/);
    if (!match) continue; // "none", empty, or malformed
    const year = Number(match[1]);
    if (earliest === null || year < earliest) earliest = year;
  }
  return earliest;
}

// 1995 -> 1990
function decadeOf(year) {
  return year === null ? null : Math.floor(year / 10) * 10;
}

// Keeps the titles whose earliest year falls in one of the chosen decades.
// Titles with no usable date are left out.
function filterByDecades(titles, decades) {
  const wanted = new Set(decades.map(Number));
  return titles.filter((t) => wanted.has(decadeOf(earliestYear(t.releaseDates))));
}

module.exports = { earliestYear, decadeOf, filterByDecades };
