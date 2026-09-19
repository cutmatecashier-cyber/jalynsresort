/**
 * Fix in-article Scuba Diving links to match nav: /scuba-diving
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dataFile = path.join(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  "data",
  "news.json",
);

const store = JSON.parse(fs.readFileSync(dataFile, "utf8"));
let changed = 0;

for (const post of store.posts) {
  let body = String(post.body || "");
  const before = body;

  // Wrong short path → nav route
  body = body.replace(/\]\(\/scuba\)/gi, "](/scuba-diving)");
  body = body.replace(/\]\(\/scuba\/?\)/gi, "](/scuba-diving)");

  // Live WP scuba page → in-app
  body = body.replace(
    /\]\(https?:\/\/(?:www\.)?jalynsresort\.com\/scuba-diving\/?\)/gi,
    "](/scuba-diving)",
  );
  body = body.replace(
    /https?:\/\/(?:www\.)?jalynsresort\.com\/scuba-diving\/?/gi,
    (url, offset) => {
      // Don't rewrite if already inside a markdown link we fixed
      const prev = body.slice(Math.max(0, offset - 2), offset);
      if (prev.endsWith("](")) return "/scuba-diving";
      return "/scuba-diving";
    },
  );

  // Plain "Scuba Diving page" without a link → make it a nav link
  body = body.replace(
    /(?<!\[)Scuba Diving page(?!\])/g,
    "[Scuba Diving page](/scuba-diving)",
  );

  if (body !== before) {
    post.body = body;
    changed++;
    console.log("fixed", post.id);
  }
}

fs.writeFileSync(dataFile, JSON.stringify(store, null, 2) + "\n");
console.log(`Updated ${changed} posts`);
