/**
 * Find YouTube embeds on live WP news posts and write videoUrl into news.json.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataFile = path.join(root, "data", "news.json");
const LIVE = "https://jalynsresort.com";
const UA = { "User-Agent": "JalynsResortContentSync/1.0 (+local-dev)" };

function extractYoutubeId(html) {
  const patterns = [
    /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/i,
    /youtu\.be\/([A-Za-z0-9_-]{6,})/i,
    /youtube\.com\/watch\?v=([A-Za-z0-9_-]{6,})/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

const store = JSON.parse(fs.readFileSync(dataFile, "utf8"));

for (const post of store.posts) {
  try {
    const res = await fetch(`${LIVE}/${post.id}/`, { headers: UA, redirect: "follow" });
    if (!res.ok) {
      console.log(`SKIP ${post.id} HTTP ${res.status}`);
      continue;
    }
    const id = extractYoutubeId(await res.text());
    if (id) {
      post.videoUrl = `https://www.youtube.com/embed/${id}`;
      console.log(`VIDEO ${post.id} → ${id}`);
    } else {
      delete post.videoUrl;
      console.log(`none  ${post.id}`);
    }
  } catch (err) {
    console.log(`ERR   ${post.id} ${err instanceof Error ? err.message : err}`);
  }
}

fs.writeFileSync(dataFile, JSON.stringify(store, null, 2) + "\n");
console.log("Wrote", dataFile);
