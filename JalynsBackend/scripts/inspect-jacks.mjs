import fs from "node:fs";

const url =
  "https://jalynsresort.com/scuba-diving-with-a-huge-school-of-jacks-at-canyons-dive-site/";
const html = await (
  await fetch(url, { headers: { "User-Agent": "JalynsResortContentSync/1.0" } })
).text();
fs.writeFileSync(new URL("./tmp-jacks.html", import.meta.url), html);

const picks = {
  youtube: [...html.matchAll(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([A-Za-z0-9_-]{6,})/gi)].map(
    (m) => m[0],
  ),
  iframes: [...html.matchAll(/<iframe[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]),
  fb: [...html.matchAll(/facebook\.com\/[^"'\s]+/gi)].map((m) => m[0]).slice(0, 15),
  videoTags: (html.match(/<video[\s\S]*?<\/video>/gi) || []).length,
  wpMp4: [...html.matchAll(/wp-content\/uploads\/[^"'\\\s]+\.(?:mp4|webm|mov)/gi)].map((m) => m[0]),
  embeds: [...html.matchAll(/wp-block-embed[^\"]*|wp-video|jetpack|fb-video|data-href=["']([^"']+)["']/gi)]
    .slice(0, 20)
    .map((m) => m[0]),
};

console.log(JSON.stringify(picks, null, 2));

// article chunk around media
const art = html.match(/<article[\s\S]*?<\/article>/i)?.[0] || "";
const mediaBits = art.match(/<(iframe|video|figure|div)[^>]*(youtube|video|embed|facebook)[^>]*>[\s\S]{0,400}/gi);
console.log("mediaBits", mediaBits?.slice(0, 8));
