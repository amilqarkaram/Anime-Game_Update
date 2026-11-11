// All settings that differ between machines (and anything secret) come from
// environment variables, which can be put in a .env file next to this one.
// .env is listed in .gitignore, so credentials never end up in the repository.
require("dotenv").config({ quiet: true });

module.exports = {
  // 127.0.0.1 rather than "localhost": on Node 17+ "localhost" can resolve to
  // the IPv6 address ::1, which a default MongoDB install does not listen on.
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/animeDB",
  PORT: Number(process.env.PORT) || 3000,
};
