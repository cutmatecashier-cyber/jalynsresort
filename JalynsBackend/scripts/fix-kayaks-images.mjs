import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const outDir = "uploads/news";
const known = [
  "https://jalynsresort.com/wp-content/uploads/2020/02/kayak-rental-puerto-galera-jalyns-resort.jpg",
];

// Try a few slug variants for kayaks page media
const store = JSON.parse(fs.readFileSync("data/news.json", "utf8"));
const post = store.posts.find((p) => p.id === "kayaks-now-available-to-rent");

async function get(url, name) {
  const dest = path.join(outDir, name);
  if (!(fs.existsSync(dest) && fs.statSync(dest).size > 1500)) {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    await sharp(Buffer.from(await res.arrayBuffer()))
      .rotate()
      .resize({ width: 1400, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 78, mozjpeg: true })
      .toFile(dest);
  }
  return `/uploads/news/${name}`;
}

const html = await (
  await fetch("https://jalynsresort.com/kayaks-now-available-to-rent/", {
    headers: { "User-Agent": "Mozilla/5.0" },
  })
).text();
fs.writeFileSync("uploads/news/_kayaks-debug.html", html.slice(0, 50000));
const urls = [
  ...html.matchAll(/\/wp-content\/uploads\/[^"'\\\s>]+\.(?:jpe?g|png|webp)/gi),
].map((m) => `https://jalynsresort.com${m[0].startsWith("/") ? "" : "/"}${m[0].replace(/^https?:\/\/jalynsresort\.com/i, "")}`);
const abs = [...new Set(urls.map((u) => u.replace(/https:\/\/jalynsresort\.comhttps:\/\/jalynsresort\.com/, "https://jalynsresort.com")))];
console.log("raw matches", abs.length);
abs.forEach((u) => console.log(u));

const list = abs.length ? abs : known;
const locals = [];
for (let i = 0; i < list.length; i++) {
  const url = list[i].startsWith("http") ? list[i] : `https://jalynsresort.com${list[i]}`;
  const name = `kayaks-now-available-to-rent-${String(i + 1).padStart(2, "0")}.jpg`;
  try {
    locals.push(await get(url, name));
    console.log("ok", name);
  } catch (e) {
    console.log("fail", e.message);
  }
}
if (locals.length && post) {
  post.image = locals[0];
  post.gallery = locals;
  if (post.packages?.[0]) post.packages[0].image = locals[0];
  fs.writeFileSync("data/news.json", JSON.stringify(store, null, 2) + "\n");
  console.log("kayaks updated", locals.length);
}
