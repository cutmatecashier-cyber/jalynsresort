/**
 * Enrich key news posts with fuller WP-style bodies + larger galleries.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataFile = path.join(root, "data", "news.json");
const store = JSON.parse(fs.readFileSync(dataFile, "utf8"));

const imgs = {
  pool: "/uploads/news/detail-pool.jpg",
  main: "/uploads/news/detail-main-building.jpg",
  dive: "/uploads/news/detail-rooms-dive.jpg",
  boat: "/uploads/news/detail-boat.jpg",
  apt: "/uploads/news/detail-apartment.jpg",
  spa: "/uploads/news/detail-spa.jpg",
  restaurant: "/uploads/news/detail-restaurant.jpg",
  kayak: "/uploads/news/detail-kayak.jpg",
  discover: "/uploads/news/discover-scuba-diving-jalyns-resort-puerto-galera.jpg",
  openWater: "/uploads/news/padi-open-water-diver-course-jalyns-resort-puerto-galera.jpg",
  advanced: "/uploads/news/padi-advanced-open-water-scuba-course-puerto-galera.jpg",
  turtle: "/uploads/news/hawksbill-turtle-puerto-galera.jpg",
  jacks: "/uploads/news/scuba-diving-with-a-huge-school-of-jacks-at-canyons-dive-site.jpg",
  solar: "/uploads/news/pools-and-solar-1.jpg",
};

/** @type {Record<string, Partial<{body:string,price:string,gallery:string[],packages:object[]}>>} */
const patch = {
  "rooms-scuba-diving-special-offer": {
    price: "₱18,000 per person",
    body: `To mark the Sabang Oktoberfest celebration Jalyn’s Resort is offering 5 days/4 nights accommodation and 10 scuba dives for the low price of ₱18,000 per person!

This offer is available from September 15th – December 23rd 2023, and again from January 15th – March 24th 2024!

Expect great service, modern and comfortable rooms and all the wonderful amenities Jalyn’s Resort has to offer! And Jalyn’s Resort has an independent Solar Power and battery system, so you’ll never have to experience the inconvenience of brownouts when staying with us.

## What’s included

- 5 days / 4 nights accommodation
- 10 scuba dives
- Modern comfortable rooms
- Solar / battery power — no brownouts
- Full resort amenities

Contact us now for inquiries or bookings!

Email: info@jalynsresort.com
Telephone (Smart): +63 947 619 7535`,
    gallery: [imgs.dive, imgs.solar, imgs.pool, imgs.boat, imgs.main, imgs.turtle],
    packages: [
      {
        title: "5D/4N Rooms + 10 Scuba Dives",
        price: "₱18,000 per person",
        image: imgs.dive,
        amenities: [
          "5 days / 4 nights accommodation",
          "10 scuba dives",
          "Modern comfortable rooms",
          "Solar / battery power — no brownouts",
          "Resort amenities included",
        ],
      },
    ],
  },
  "discover-scuba-diving-in-beautiful-puerto-galera-at-jalyns-resort-dive-center": {
    price: "₱2,400",
    body: `### The PADI Discover Scuba Diving certification is available for kids age 10 and up!

These two lucky Danish boys aged 10 and 11 recently did their PADI Discover Scuba Diving course with us and were introduced to the incredible marine life of Puerto Galera during their two dives in the ocean, and were lucky enough to see crocodile fish and a sea turtle!

If you have kids aged 10 or older and would like to introduce them to the wonderful world of Scuba Diving, Puerto Galera is the ideal place to do it. The warm, calm waters are teeming with an incredible amount and variety of sea life, and the experience will stay in their memories forever!

## About the PADI Discover Scuba Diving Course

If you’re interested in scuba diving, but unsure if you want to enroll in a scuba certification class, Discover Scuba Diving is the perfect way to test the waters. In a very short time, you’ll learn basic scuba skills and take your first breaths underwater.

- Anyone aged 10 and up with a minimum level of health and fitness can partake in the PADI DSD.
- Chronic health conditions, certain medications and/or recent surgery may require you to get written approval from a physician before diving.

### PADI eLearning

Prepare for your Discover Scuba Diving experience with PADI DSD eLearning™. Use your computer or mobile device to learn diving safety fundamentals before you get in the water.

Time commitment: 20-30 minutes

### With Your Instructor

Your PADI instructor will fit you with scuba gear and explain how to use it in the controlled environment of our swimming pool. You’ll practice basic diving skills followed by free time to play underwater before going on your first guided dive in the open water.

## Discover Scuba Diving Course cost

Php 2,400 includes equipment, 1 pool session and 1 open water dive. Certification excluded.

## Get in Touch!

Contact us if you would like to inquire about getting your own PADI Discover Scuba Diving Course at Jalyn’s Resort!`,
    gallery: [imgs.discover, imgs.pool, imgs.boat, imgs.turtle, imgs.jacks, imgs.dive],
    packages: [
      {
        title: "PADI Discover Scuba Diving",
        price: "₱2,400 — equipment, 1 pool session & 1 open water dive",
        image: imgs.discover,
        amenities: [
          "Ages 10 and up",
          "1 pool training session",
          "1 guided open water dive",
          "Equipment included",
          "Certification excluded",
          "eLearning ~20–30 minutes",
        ],
      },
    ],
  },
  "padi-open-water-diver-courses-at-jalyns-resort": {
    price: "₱18,000",
    body: `Congratulations to our most recent PADI Open Water Diver students who completed their Open Water Diver course with flying colours at Jalyn’s Resort Dive Center.

The PADI Open Water Diver course can be completed in as little as 3 days, and costs P18,000 including equipment and certification.

## About the PADI Open Water Diver Course

PADI Open Water Diver is the first scuba certification level. A highly-trained PADI Instructor will teach you how to scuba dive in a relaxed, supportive learning environment.

By the end of the course, you’ll have the skills and knowledge to dive at home or abroad and be an ambassador for the underwater world.

### Theoretical Studies

The theoretical part of the Open Water Course can either be done at your dive center, or in your own time via PADI eLearning.

- eLearning time commitment: 5–10 hours

### Practical Skills

Practice using scuba gear in a pool until you’re comfortable. PADI training includes practice “mini dives” to help you build confidence before making four dives in open water.

- Prerequisites: Able to swim; medically fit for diving
- Total time commitment: 4–7 days
- Minimum age: 10 years or older
- Depth: shallow dives (12m/40ft), maximum allowed 18m/60ft

## Course cost

₱18,000 includes equipment and certification.

Contact us if you would like to inquire about getting your own PADI Open Water Diver qualification at Jalyn’s Resort!`,
    gallery: [imgs.openWater, imgs.pool, imgs.boat, imgs.dive, imgs.turtle, imgs.main],
    packages: [
      {
        title: "PADI Open Water Diver",
        price: "₱18,000 including equipment & certification",
        image: imgs.openWater,
        amenities: [
          "First scuba certification level",
          "Equipment included",
          "PADI certification included",
          "Pool practice + 4 open water dives",
          "About 3–7 days",
          "Ages 10+",
        ],
      },
    ],
  },
  "padi-advanced-open-water-course-at-jalyns-resort-dive-center": {
    price: "₱14,500",
    body: `What better place to do your PADI Advanced Open Water Course than beautiful Puerto Galera?

## About the PADI Advanced Open Water Course

The Advanced Open Water Diver course is all about advancing your skills. You’ll practice navigation and buoyancy, try deep diving and make three specialty dives of your choosing.

Here are a few of the many options: Deep, Digital Underwater Photography, Dive Against Debris, Enriched Air Nitrox, Fish Identification, Night, Peak Performance Buoyancy, Search & Recovery, Underwater Naturalist, Underwater Navigation, and Wreck Diver.

## How to Become an Advanced Open Water Diver

### PADI eLearning

Advanced Open Water Diver eLearning includes interactive lessons on popular specialty dives. You’ll study deep and navigation diving plus three specialties of your choosing.

eLearning time commitment: 6–8 hours

### With Your Instructor

The course includes open water dives over about two days. Gain experience, build confidence and discover your diving abilities.

- Prerequisites: Open Water Diver / Junior Open Water Diver
- Total time commitment: 2 days
- Minimum age: 12 years or older
- Maximum depth: up to 30 metres / 100 feet (age dependent)

## Advanced Open Water Diver Course cost

Php 14,500 includes equipment and certification, and open water dives over two days.

## Get in Touch!

Contact us if you would like to inquire about getting your own PADI Advanced Open Water Diver qualification at Jalyn’s Resort!`,
    gallery: [imgs.advanced, imgs.jacks, imgs.turtle, imgs.boat, imgs.dive, imgs.pool],
    packages: [
      {
        title: "PADI Advanced Open Water Diver",
        price: "₱14,500 including equipment & certification",
        image: imgs.advanced,
        amenities: [
          "Deep + navigation + specialty dives",
          "Equipment included",
          "Certification included",
          "About 2 days",
          "Ages 12+",
          "Requires Open Water certification",
        ],
      },
    ],
  },
  "our-commitment-to-responsible-ecotourism-in-marine-protected-areas": {
    gallery: [imgs.turtle, imgs.jacks, imgs.boat, imgs.pool, imgs.dive, imgs.main],
  },
  "scuba-diving-with-a-huge-school-of-jacks-at-canyons-dive-site": {
    gallery: [imgs.jacks, imgs.turtle, imgs.boat, imgs.dive, imgs.pool],
  },
  "padi-advanced-open-water-students-review": {
    gallery: [imgs.advanced, imgs.openWater, imgs.pool, imgs.boat, imgs.dive],
  },
};

let n = 0;
for (const post of store.posts) {
  const extra = patch[post.id];
  if (!extra) {
    // Ensure every post has at least 3 gallery photos for detail view
    const base = [post.image, imgs.pool, imgs.main, imgs.boat].filter(Boolean);
    const seen = new Set();
    post.gallery = base.filter((u) => {
      if (seen.has(u)) return false;
      seen.add(u);
      return true;
    });
    continue;
  }
  Object.assign(post, extra);
  n += 1;
}

fs.writeFileSync(dataFile, JSON.stringify(store, null, 2) + "\n");
console.log(`Patched ${n} feature posts; all posts now have multi-photo galleries.`);
