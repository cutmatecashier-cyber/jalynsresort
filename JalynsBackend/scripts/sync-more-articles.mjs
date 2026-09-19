import fs from "node:fs";

const store = JSON.parse(fs.readFileSync("data/news.json", "utf8"));
const U = (n) => `/uploads/news/${n}`;

const more = {
  "vegan-vegetarian-dining-options-available-at-jalyns-resort-restaurant": {
    body: `At Jalyn's Resort we are always striving to provide our guests with the best possible experience, and as such we are delighted to accommodate our vegetarian and vegan guests' dietary needs.

While our vegetarian and vegan dining options may not yet be extensive, we are more than happy to receive menu suggestions and our staff will do everything they can to ensure your dining experience at Jalyn's Resort is pleasant and memorable.

We were delighted to receive this review on happycow.net from one of our vegetarian guests! HappyCow is a website designed to help users find and review restaurants for vegans and vegetarians.

## At Jalyn's Restaurant

- Vegan Chow Mein
- Vegan Pizza
- Menu suggestions welcome
- Staff happy to accommodate dietary needs`,
    gallery: [
      U("vegan-vegetarian-dining-options-available-at-jalyns-resort-restaurant-puerto-gal.jpg"),
      U("detail-restaurant.jpg"),
      U("puerto-galera-classic-club-jalyns-resort-restaurant.jpg"),
      U("jalyns-restaurant-puerto-galera-daily-special-menus.jpg"),
      U("detail-pool.jpg"),
      U("detail-main-building.jpg"),
    ],
    packages: [
      {
        title: "Vegan and Vegetarian Dining",
        price: "Ask restaurant for today's options",
        image: U("detail-restaurant.jpg"),
        amenities: [
          "Vegan Chow Mein",
          "Vegan Pizza",
          "Dietary requests welcome",
          "Resort restaurant setting",
        ],
      },
    ],
  },
  "sabang-oktoberfest-2023": {
    body: `If you are going to be in Puerto Galera this October, be sure to check out the Sabang Oktoberfest!

It's the first event of its kind here in Puerto Galera, and is sure to be lots of fun!

Expect to experience traditional Bavarian food, beer, music, dancing, as well as many other fun events and activities.

The Oktoberfest will be taking place between the **5th and 8th of October 2023**, so be sure to mark your calendar! We will keep you posted as more details become available.`,
    gallery: [
      U("sabang-oktoberfest-2023-puerto-galera.jpg"),
      U("detail-restaurant.jpg"),
      U("detail-pool.jpg"),
      U("detail-boat.jpg"),
      U("puerto-galera-independence-day-festival-1.jpg"),
      U("detail-main-building.jpg"),
    ],
    packages: [
      {
        title: "Stay for Sabang Oktoberfest",
        price: "Ask for festival-season rates",
        image: U("sabang-oktoberfest-2023-puerto-galera.jpg"),
        amenities: [
          "Close to Sabang beach strip",
          "Restaurant on site",
          "Pools and dive centre",
          "Solar / battery power",
        ],
      },
    ],
  },
  "scuba-diving-with-a-huge-school-of-jacks-at-canyons-dive-site": {
    body: `"Canyons" is Puerto Galera's signature exhilarating drift dive, not for novice divers. Drop in at Hole-in-the-Wall, and let the current take you. After a small drift, three canyons are situated at 24,27 and 30m, that protect you from the current.

Here you can kneel down, and watch the shoals of Snapper, Giant Trevallies, Sweetlips, Barracuda, Emperor fish play in the current. Sea snakes are commonly found here, along with an assortment of Nudibranch. A must-do dive for experienced divers looking for a thrilling dive!

Jalyn's Resort Dive Center offers PADI Scuba Diving courses for all levels of divers from beginners upwards! Visit the [Scuba Diving page](/scuba) for more information.`,
    gallery: [
      U("scuba-diving-with-a-huge-school-of-jacks-at-canyons-dive-site.jpg"),
      U("hawksbill-turtle-puerto-galera.jpg"),
      U("detail-boat.jpg"),
      U("detail-rooms-dive.jpg"),
      U("detail-pool.jpg"),
      U("jalyns-resort-puerto-galera-boat-trips.jpg"),
    ],
    packages: [
      {
        title: "Dive Canyons and more",
        price: "Fun dive rates on Scuba page",
        image: U("scuba-diving-with-a-huge-school-of-jacks-at-canyons-dive-site.jpg"),
        amenities: [
          "Signature Puerto Galera sites",
          "Experienced local guides",
          "Own dive boats",
          "Up to 3 dives daily",
        ],
      },
    ],
  },
  "padi-advanced-open-water-students-review": {
    body: `Jalyn's Resort Scuba Diving Center offers everything from daily fun dives and exciting night dives, to trips to the amazing Verde Island. You can also become a PADI accredited scuba diver with our range of courses, including Discover Scuba Diving, Open Water, and Advanced Open Water.

If you've never dived before, the Discover Scuba course will have you diving in the open water in just a few short hours!

We've got all the experience, equipment, and local knowledge needed to make your Puerto Galera diving experience truly unforgettable. And competitive prices too!

Visit our [Scuba Diving page](/scuba) for all the details!`,
    gallery: [
      U("padi-advanced-open-water-students-puerto-galera.jpg"),
      U("padi-advanced-open-water-scuba-course-puerto-galera.jpg"),
      U("detail-pool.jpg"),
      U("detail-boat.jpg"),
      U("detail-rooms-dive.jpg"),
      U("hawksbill-turtle-puerto-galera.jpg"),
    ],
    packages: [
      {
        title: "PADI courses at Jalyn's",
        price: "See Scuba Diving page for rates",
        image: U("padi-advanced-open-water-students-puerto-galera.jpg"),
        amenities: [
          "Discover Scuba",
          "Open Water",
          "Advanced Open Water",
          "Fun dives and night dives",
        ],
      },
    ],
  },
};

let n = 0;
for (const p of store.posts) {
  if (more[p.id]) {
    Object.assign(p, more[p.id]);
    n += 1;
  }
}
fs.writeFileSync("data/news.json", JSON.stringify(store, null, 2) + "\n");
console.log("patched", n, "more posts");
