import fs from "node:fs";

const store = JSON.parse(fs.readFileSync("data/news.json", "utf8"));
const post = store.posts.find(
  (p) => p.id === "studio-apartments-available-for-long-term-rental-at-jalyns-resort",
);

// Exact photos from live Studio Apartments article (not single-room / booking CTA)
const keep = [
  "/uploads/news/studio-01-pools-and-solar-1-scaled.jpg", // featured on live
  "/uploads/news/studio-07-apartment-rental-puerto-galera-1.jpg",
  "/uploads/news/studio-10-apartment-rental-puerto-galera-2.jpg",
  "/uploads/news/studio-11-apartment-rental-puerto-galera-3.jpg",
  "/uploads/news/studio-04-poolside-rooms.jpg",
  "/uploads/news/studio-03-pools-and-solar.jpg",
];

post.image = keep[0];
post.gallery = keep;
if (post.packages?.[0]) post.packages[0].image = keep[1];

fs.writeFileSync("data/news.json", JSON.stringify(store, null, 2) + "\n");
console.log("Studio gallery set to live apartment photos:");
keep.forEach((u) => console.log(" ", u));
