/**
 * Captures the ZenTrip mission console as an animated GIF for the README.
 *
 * Flow: drives the real /trip/new wizard in headless Chrome against the dev
 * server, records screenshots while the REAL multi-agent generation runs
 * (requires GROQ_API_KEY in .env.local), then encodes frames with gifenc.
 *
 * Usage:
 *   1. npm run dev            (in another terminal)
 *   2. node scripts/capture-console.mjs
 *   2b. node scripts/capture-console.mjs --encode-only   (re-encode existing frames)
 *
 * Output: docs/console-demo.gif + frames in .capture-tmp/ (git-ignored)
 */

import { mkdir, rm, readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import gifenc from 'gifenc';
import { PNG } from 'pngjs';

const { GIFEncoder, quantize, applyPalette } = gifenc;

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const TMP_DIR = path.join(ROOT, '.capture-tmp');
const OUT_DIR = path.join(ROOT, 'docs');
const OUT_FILE = path.join(OUT_DIR, 'console-demo.gif');

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.CHROME_PATH,
].filter(Boolean);

const DEV_URL = process.env.CAPTURE_URL || 'http://localhost:3000';
const VIEWPORT = { width: 1280, height: 800, deviceScaleFactor: 1.5 };
const PRE_GEN_DELAY_MS = 600;
const GEN_CAPTURE_BUDGET_MS = 165_000; // stay under the orchestrator's 150s cap + margin
const POST_GEN_FRAMES = 10;
const FRAME_INTERVAL_MS = 500;
const GIF_MAX_WIDTH = 960;
const GIF_FPS = 4; // 250ms per frame
const DEDUPE_THRESHOLD = 0.002; // keep frame if >0.2% of sampled pixels changed noticeably
const PIXEL_DIFF_CUTOFF = 8; // per-channel delta that counts as a real change

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitUntilReady(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.status < 500) return;
    } catch { /* server not up yet */ }
    await sleep(1000);
  }
  throw new Error(`Dev server at ${url} did not become ready in ${timeoutMs / 1000}s`);
}

async function typeInto(page, selector, text) {
  await page.waitForSelector(selector, { timeout: 30_000 });
  await page.click(selector, { clickCount: 3 });
  await page.type(selector, text, { delay: 12 });
}

/** Click the first button whose trimmed innerText matches exactly. */
async function clickExactText(page, text) {
  const ok = await page.evaluate((t) => {
    const el = [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === t);
    if (!el) return false;
    el.click();
    return true;
  }, text);
  if (!ok) throw new Error(`Button with exact text "${text}" not found`);
}

/** Set a React-controlled date input via the native value setter. */
async function setDateInput(page, index, value) {
  await page.waitForSelector('input[type="date"]', { timeout: 30_000 });
  await page.evaluate((idx, val) => {
    const el = document.querySelectorAll('input[type="date"]')[idx];
    if (!el) throw new Error(`date input #${idx} not found`);
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(el, val);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, index, value);
}

function dateStr(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

async function main() {
  const chromePath = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!chromePath) throw new Error('Chrome not found. Set CHROME_PATH to your chrome.exe.');

  await waitUntilReady(DEV_URL);
  console.log(`✔ dev server ready at ${DEV_URL}`);

  await rm(TMP_DIR, { recursive: true, force: true });
  await mkdir(TMP_DIR, { recursive: true });
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'shell',
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--force-prefers-reduced-motion'],
    defaultViewport: VIEWPORT,
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60_000);
  page.setDefaultTimeout(30_000);

  let frameCount = 0;
  let capturing = false;
  let stopCapture = false;

  const captureLoop = (async () => {
    while (!stopCapture) {
      if (!capturing) { await sleep(50); continue; }
      try {
        const buf = await page.screenshot({ type: 'png' });
        await writeFile(path.join(TMP_DIR, `frame-${String(frameCount).padStart(5, '0')}.png`), buf);
        frameCount++;
      } catch { /* page navigating; skip frame */ }
      await sleep(FRAME_INTERVAL_MS);
    }
  })();

  try {
    const nextButton = () => clickExactText(page, 'CONTINUE ▸');

    // ── Step 0: destination ──────────────────────────────────────────────────────
    await page.goto(`${DEV_URL}/trip/new`, { waitUntil: 'networkidle0' });
    await sleep(1500);
    capturing = true;

    await typeInto(page, 'textarea', 'Plan a 5-day trip to Kerala for 2 friends — beaches, backwaters, low crowds, vegetarian food');
    await sleep(PRE_GEN_DELAY_MS);

    await nextButton();
    await sleep(900);

    // ── Step 1: dates ────────────────────────────────────────────────────────
    await setDateInput(page, 0, dateStr(21));
    await sleep(300);
    await setDateInput(page, 1, dateStr(26));
    await sleep(600);

    await nextButton();
    await sleep(900);

    // ── Step 2: budget + travelers ──────────────────────────────────────────
    await clickExactText(page, 'MODERATE · ₹50,000');
    await sleep(400);
    await clickExactText(page, '4');
    await sleep(600);

    await nextButton();
    await sleep(900);

    // ── Step 3: mission profile ─────────────────────────────────────────────
    await clickExactText(page, 'RELAXED'); // first DOM match = mission type grid
    await sleep(250);
    await clickExactText(page, 'BALANCED');
    await sleep(250);
    await clickExactText(page, 'BEACH & SUN');
    await sleep(250);
    await clickExactText(page, 'VEGETARIAN');
    await sleep(600);

    await nextButton();
    await sleep(900);

    // ── Step 4: crew (informational) → Step 5: review ───────────────────────
    await nextButton();
    await sleep(900);

    await sleep(1200); // let the review summary render fully
    await clickExactText(page, 'DISPATCH TO AGENTS ▸');

    // ── MissionControl: capture the real generation ─────────────────────────
    console.log('✔ dispatched — capturing live agent telemetry...');
    const genStart = Date.now();
    let planLocked = false;

    while (Date.now() - genStart < GEN_CAPTURE_BUDGET_MS) {
      const body = await page.evaluate(() => document.body.innerText);
      if (body.includes('PLAN LOCKED')) { planLocked = true; break; }
      if (body.includes('timed out') || body.includes('MISSION ABORTED')) {
        console.warn('⚠ generation reported a failure — keeping frames captured so far');
        break;
      }
      await sleep(500);
    }

    if (planLocked) {
      await sleep(4000); // hold on the locked plan + first trip-page frames
      console.log('✔ plan locked');
    } else {
      console.warn('⚠ PLAN LOCKED not observed within capture budget');
    }

    // ── Post-lock outro frames ───────────────────────────────────────────────
    for (let i = 0; i < POST_GEN_FRAMES && !stopCapture; i++) {
      await sleep(FRAME_INTERVAL_MS);
    }
  } finally {
    stopCapture = true;
    await captureLoop;
    await browser.close();
  }

  console.log(`✔ captured ${frameCount} frames — encoding GIF...`);
  await encodeGif();
}

/** Encode captured PNG frames into docs/console-demo.gif, dropping near-duplicates. */
async function encodeGif() {
  const files = (await readdir(TMP_DIR)).filter((f) => f.endsWith('.png')).sort();
  if (files.length === 0) throw new Error('No frames captured — aborting.');

  const gif = GIFEncoder();
  const delayMs = Math.round(1000 / GIF_FPS);

  let prevSample = null;
  let kept = 0;
  let dropped = 0;
  let framesSinceKeep = 1; // each kept frame holds for its real elapsed time (capped)

  for (const file of files) {
    const png = PNG.sync.read(await readFile(path.join(TMP_DIR, file)));

    // Downscale to GIF_MAX_WIDTH keeping aspect ratio
    const scale = Math.min(1, GIF_MAX_WIDTH / png.width);
    const w = Math.round(png.width * scale);
    const h = Math.round(png.height * scale);

    const resized = new PNG({ width: w, height: h });
    for (let y = 0; y < h; y++) {
      const srcY = Math.min(png.height - 1, Math.floor(y / scale));
      for (let x = 0; x < w; x++) {
        const srcX = Math.min(png.width - 1, Math.floor(x / scale));
        const srcIdx = (png.width * srcY + srcX) << 2;
        const dstIdx = (w * y + x) << 2;
        resized.data[dstIdx] = png.data[srcIdx];
        resized.data[dstIdx + 1] = png.data[srcIdx + 1];
        resized.data[dstIdx + 2] = png.data[srcIdx + 2];
        resized.data[dstIdx + 3] = png.data[srcIdx + 3];
      }
    }

    // Sample a sparse pixel grid for cheap frame-diffing
    const sample = [];
    for (let y = 0; y < h; y += 6) {
      for (let x = 0; x < w; x += 6) {
        const i = (w * y + x) << 2;
        sample.push(resized.data[i], resized.data[i + 1], resized.data[i + 2]);
      }
    }

    if (prevSample) {
      let changed = 0;
      for (let i = 0; i < sample.length; i += 3) {
        const d = Math.max(
          Math.abs(sample[i] - prevSample[i]),
          Math.abs(sample[i + 1] - prevSample[i + 1]),
          Math.abs(sample[i + 2] - prevSample[i + 2])
        );
        if (d > PIXEL_DIFF_CUTOFF) changed++;
      }
      const changedFraction = changed / (sample.length / 3);
      if (changedFraction < DEDUPE_THRESHOLD) { dropped++; framesSinceKeep++; continue; }
    }
    prevSample = sample;

    const palette = quantize(resized.data, 256, { format: 'rgba4444' });
    const index = applyPalette(resized.data, palette, 'rgba4444');
    // Hold each keyframe for the wall-clock time it represents (1s cap)
    const holdDelay = Math.min(delayMs * framesSinceKeep, 1000);
    gif.writeFrame(index, w, h, { palette, delay: holdDelay });
    kept++;
    framesSinceKeep = 1;
  }

  gif.finish();
  await writeFile(OUT_FILE, Buffer.from(gif.bytes()));

  const { size } = await readFile(OUT_FILE).then((b) => ({ size: b.length }));
  console.log(`✔ wrote docs/console-demo.gif (${(size / 1024 / 1024).toFixed(2)} MB, ${kept} frames kept / ${dropped} dupes dropped @ ${GIF_FPS} fps)`);
}

// ── Entry ─────────────────────────────────────────────────────────────────────
if (process.argv.includes('--encode-only')) {
  encodeGif().catch((err) => { console.error('✖ encode failed:', err.message); process.exit(1); });
} else {
  main().catch((err) => {
    console.error('✖ capture failed:', err.message);
    process.exit(1);
  });
}
// (entry point above is the only one)
