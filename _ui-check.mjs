import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const outDir = "c:\\Users\\Michelle\\Desktop\\Project\\jalynsresort\\_ui-check";
const profile = mkdtempSync(join(tmpdir(), "jalyn-chrome-"));
const proc = spawn(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--remote-debugging-port=9333",
    `--user-data-dir=${profile}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

let ws;
let seq = 0;
const pending = new Map();

function send(method, params = {}) {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
  });
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    const detail = result.exceptionDetails.exception?.description || result.exceptionDetails.text;
    throw new Error(detail || "evaluate failed");
  }
  return result.result?.value;
}

async function shot(name) {
  const { data } = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  });
  writeFileSync(join(outDir, name), Buffer.from(data, "base64"));
}

try {
  await delay(700);
  const targets = await fetch("http://127.0.0.1:9333/json/list").then((r) => r.json());
  const page = targets.find((item) => item.type === "page");
  if (!page?.webSocketDebuggerUrl) throw new Error("No page target");
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve);
    ws.addEventListener("error", reject);
  });
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (!msg.id || !pending.has(msg.id)) return;
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(msg.error.message));
    else resolve(msg.result);
  });

  await send("Page.enable");
  await send("Runtime.enable");

  async function search(width, height, file) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 700,
    });
    await send("Page.navigate", { url: "http://localhost:5173/" });
    await delay(1800);
    const opened = await evaluate(`(() => {
      const buttons = [...document.querySelectorAll("button")];
      const el = buttons.find((b) => b.offsetParent && /check in/i.test(b.innerText));
      if (!el) return "missing-checkin";
      el.click();
      return "ok";
    })()`);
    await delay(400);
    const pickedIn = await evaluate(`(() => {
      const el = [...document.querySelectorAll("button")].find((b) =>
        (b.getAttribute("aria-label") || "").includes("Sep 29, 2026") && !b.disabled,
      );
      if (!el) return "missing-sep29";
      el.click();
      return "ok";
    })()`);
    await delay(400);
    const pickedOut = await evaluate(`(() => {
      const labels = [...document.querySelectorAll("[role=dialog] button")].map((b) => b.getAttribute("aria-label")).filter(Boolean);
      const el = [...document.querySelectorAll("button")].find((b) =>
        (b.getAttribute("aria-label") || "").includes("Sep 30, 2026") && !b.disabled,
      );
      if (!el) return "missing-sep30:" + labels.slice(0, 8).join("|");
      el.click();
      return "ok";
    })()`);
    await delay(300);
    const submitted = await evaluate(`(() => {
      const el = [...document.querySelectorAll("button")].find(
        (b) => b.offsetParent && /check availability/i.test(b.innerText),
      );
      if (!el) return "missing-submit";
      el.click();
      return "ok";
    })()`);
    await delay(2500);
    const status = await evaluate(`(() => {
      const heading = document.querySelector("#home-room-results h2")?.textContent || "";
      const cards = document.querySelectorAll("#home-room-results article").length;
      const alert = document.querySelector("[role=alert]")?.textContent || "";
      const dates = [...document.querySelectorAll("button")].filter((b) => b.offsetParent && /check/i.test(b.innerText)).map((b) => b.innerText.replace(/\\s+/g, " ").trim());
      return JSON.stringify({ heading, cards, alert, dates });
    })()`);
    console.log(width, opened, pickedIn, pickedOut, submitted, status);
    await shot(file.replace(".png", "-hero.png"));
    await evaluate(`document.getElementById("home-room-results")?.scrollIntoView({ block: "start" })`);
    await delay(500);
    await shot(file);
    await evaluate(`document.querySelector("#home-room-results article:last-of-type")?.scrollIntoView({ block: "end" })`);
    await delay(400);
    await shot(file.replace(".png", "-end.png"));
    if (width > 700) {
      const href = await evaluate(`(() => {
        const button = document.querySelector("#home-room-results article button");
        button?.click();
        return "clicked";
      })()`);
      await delay(1200);
      const landed = await evaluate(`location.href`);
      console.log("select", href, landed);
    }
  }

  await search(1440, 900, "desktop.png");
  await search(390, 844, "mobile.png");
} finally {
  proc.kill();
  ws?.close();
}
