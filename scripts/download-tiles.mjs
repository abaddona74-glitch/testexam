/**
 * Map tile download script
 * Downloads Esri World Street Map tiles for Uzbekistan region
 * Saves to public/tiles/{z}/{x}/{y}.png
 *
 * Usage: node scripts/download-tiles.mjs
 *
 * ⚠️ This is a ONE-TIME setup step. Run it locally after pulling the code.
 *    Tiles are committed to git so they work on Vercel too.
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TILES_DIR = path.resolve(__dirname, '..', 'public', 'tiles');

// Uzbekistan approximate bounding box
const BBOX = {
  minLat: 37.1,
  maxLat: 45.6,
  minLon: 55.9,
  maxLon: 73.1,
};

// Zoom levels to download (5=country overview, 9=city level)
const MIN_ZOOM = 5;
const MAX_ZOOM = 9;

// Tile source URL
const TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';

// Concurrency & retry
const CONCURRENCY = 4;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// Stats
let totalTiles = 0;
let downloadedTiles = 0;
let skippedTiles = 0;
let failedTiles = 0;

function latLngToTile(lat, lng, zoom) {
  const n = Math.pow(2, zoom);
  const x = Math.floor((lng + 180) / 360 * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n);
  return { x, y };
}

function getTilesForBBox(zoom) {
  const nw = latLngToTile(BBOX.maxLat, BBOX.minLon, zoom);
  const se = latLngToTile(BBOX.minLat, BBOX.maxLon, zoom);
  const minX = Math.min(nw.x, se.x);
  const maxX = Math.max(nw.x, se.x);
  const minY = Math.min(nw.y, se.y);
  const maxY = Math.max(nw.y, se.y);
  const tiles = [];
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      tiles.push({ z: zoom, x, y });
    }
  }
  return tiles;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function downloadTile(z, x, y, attempt = 1) {
  return new Promise((resolve) => {
    const url = TILE_URL.replace('{z}', z).replace('{x}', x).replace('{y}', y);
    const dir = path.join(TILES_DIR, String(z), String(x));
    const filePath = path.join(dir, `${y}.png`);

    if (fs.existsSync(filePath)) {
      skippedTiles++;
      resolve(true);
      return;
    }

    fs.mkdirSync(dir, { recursive: true });

    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      },
      timeout: 15000,
    }, (res) => {
      // Rate limited — retry
      if (res.statusCode === 429) {
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAY_MS * attempt;
          console.log(`\n  ⏳ ${z}/${x}/${y} → 429, retry ${attempt}/${MAX_RETRIES} in ${delay}ms`);
          setTimeout(() => {
            downloadTile(z, x, y, attempt + 1).then(resolve);
          }, delay);
        } else {
          failedTiles++;
          console.error(`\n  ✗ ${z}/${x}/${y} → Rate limited after ${MAX_RETRIES} retries`);
          resolve(false);
        }
        return;
      }

      if (res.statusCode !== 200) {
        failedTiles++;
        console.error(`\n  ✗ ${z}/${x}/${y} → HTTP ${res.statusCode}`);
        resolve(false);
        return;
      }

      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        try {
          fs.writeFileSync(filePath, Buffer.concat(chunks));
          downloadedTiles++;
          process.stdout.write('.');
          if (downloadedTiles % 100 === 0) {
            process.stdout.write(` ${downloadedTiles}/${totalTiles}`);
          }
          resolve(true);
        } catch (err) {
          failedTiles++;
          console.error(`\n  ✗ ${z}/${x}/${y} → ${err.message}`);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt;
        console.log(`\n  ⏳ ${z}/${x}/${y} → ${err.code}, retry ${attempt}/${MAX_RETRIES} in ${delay}ms`);
        setTimeout(() => {
          downloadTile(z, x, y, attempt + 1).then(resolve);
        }, delay);
      } else {
        failedTiles++;
        console.error(`\n  ✗ ${z}/${x}/${y} → ${err.message}`);
        resolve(false);
      }
    });

    req.end();
  });
}

function getDirSize(dir) {
  let size = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        size += getDirSize(fullPath);
      } else if (entry.isFile()) {
        size += fs.statSync(fullPath).size;
      }
    }
  } catch {}
  return size / (1024 * 1024);
}

// ─── Main ────────────────────────────────────────────

async function main() {
  console.log('🗺️  Map Tile Downloader');
  console.log('━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Region:     Uzbekistan`);
  console.log(`   BBox:       ${BBOX.minLat}°N, ${BBOX.minLon}°E → ${BBOX.maxLat}°N, ${BBOX.maxLon}°E`);
  console.log(`   Zoom:       ${MIN_ZOOM} → ${MAX_ZOOM}`);
  console.log(`   Source:     Esri World Street Map`);
  console.log(`   Concurrency: ${CONCURRENCY}`);
  console.log(`   Retries:    ${MAX_RETRIES}`);
  console.log(`   Save to:    ${TILES_DIR}`);

  const allTiles = [];
  for (let z = MIN_ZOOM; z <= MAX_ZOOM; z++) {
    allTiles.push(...getTilesForBBox(z));
  }

  totalTiles = allTiles.length;
  const estimatedMb = (totalTiles * 0.025).toFixed(0);
  console.log(`   Tiles:      ${totalTiles} (~${estimatedMb} MB)\n`);

  const startTime = Date.now();

  const queue = [...allTiles];
  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push((async () => {
      while (queue.length > 0) {
        const tile = queue.shift();
        await downloadTile(tile.z, tile.x, tile.y);
      }
    })());
  }

  await Promise.all(workers);

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  const diskMb = getDirSize(TILES_DIR).toFixed(1);

  console.log(`\n\n✅ Complete! (${elapsed} min)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Downloaded: ${downloadedTiles}`);
  console.log(`   Skipped:    ${skippedTiles}`);
  console.log(`   Failed:     ${failedTiles}`);
  console.log(`   Disk:       ${diskMb} MB`);
  console.log(`   Location:   ${TILES_DIR}\n`);

  if (failedTiles > 0) {
    console.log('⚠️  Some tiles failed. Run the script again to retry.');
  }
}

main().catch(console.error);
