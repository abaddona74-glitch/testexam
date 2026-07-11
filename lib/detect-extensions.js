/**
 * AdBlocker / Browser Extension Detection Library — ENHANCED v3
 * 
 * 5 xil usulni PARALLEL ishlatadi:
 * 1. DOM Bait (3 xil element) — uBlock, AdBlock Plus, AdGuard
 * 2. Script Bait (2 xil URL) — barcha adblockerlar
 * 3. Image/Tracking Pixel Bait — tracking bloklovchilar (ENG ISHONCHLI)
 * 4. Brave Browser Detection — navigator.brave.isBrave()
 * 5. Iframe Bait — iframe orqali reklama bloklash
 * 
 * Barcha usullar parallel ishlaydi (Promise.all), 
 * natija ~2-3 soniya ichida qaytadi.
 * 
 * NOT: checkInternet() olib tashlandi — CSP tufayli fetch() bloklanardi.
 * Image bait CSP-dan o'tadi va uBlock tomonidan bloklanadi — eng ishonchli usul.
 */

'use client';

// ═══════════════════════════════════════════════════════════════
// KONSTANTALAR
// ═══════════════════════════════════════════════════════════════

const BAIT_CLASSES = [
  'ad', 'ads', 'adbox', 'advertisement', 'banner',
  'ad-placeholder', 'adsbygoogle', 'sponsored-content',
  'ad-container', 'ad-slot', 'ad_unit', 'ad-banner',
  'google_ads', 'dfp-ad', 'sponsored', 'ad-text',
  'ad-sense', 'advertisement-box', 'banner-ad',
  'ad-placement', 'ad-wrapper', 'ad-label',
  'adblock-test', 'ad_box', 'ad-frame', 'sponsor',
  'commercial', 'promotion', 'promo-ad', 'ad-300x250',
  'ad-728x90', 'leaderboard', 'skyscraper', 'halfpage',
];

const BAIT_IDS = [
  'ad-banner', 'ad-container', 'banner-ad', 'ad-slot-1',
  'google_ads_iframe', 'dfp-ad', 'ad-block-test',
  'ad_content', 'ad_placeholder', 'banner_ads',
  'ad-wrapper', 'ads-wrapper', 'ad-div', 'ad-unit',
  'ad-holder', 'ad-box', 'advert', 'sponsored-links',
];

const BAIT_SCRIPTS = [
  '/adsbygoogle.js',
  '/pagead/ads.js',
];

const BAIT_PIXELS = [
  '/ads/banner-ad.svg',
  '/pagead/ad-pixel.svg',
];

// ═══════════════════════════════════════════════════════════════
// YORDAMCHI FUNKSIYALAR
// ═══════════════════════════════════════════════════════════════

function createBait(variant = 0) {
  const el = document.createElement('div');
  const patterns = [
    () => {
      const classes = [];
      for (let i = 0; i < 5; i++)
        classes.push(BAIT_CLASSES[Math.floor(Math.random() * BAIT_CLASSES.length)]);
      el.className = classes.join(' ');
      el.id = BAIT_IDS[Math.floor(Math.random() * BAIT_IDS.length)];
      el.setAttribute('data-ad-format', 'auto');
      el.setAttribute('data-full-width-responsive', 'true');
    },
    () => {
      el.className = 'adsbygoogle';
      el.id = 'ad-slot-' + Math.floor(Math.random() * 9999);
      el.setAttribute('data-ad-client', 'ca-pub-' + Math.floor(Math.random() * 9999999999));
      el.setAttribute('data-ad-slot', String(Math.floor(Math.random() * 9999999999)));
    },
    () => {
      el.className = 'google_ads ad-slot banner';
      el.id = 'dfp-ad-' + Math.floor(Math.random() * 1000);
      el.setAttribute('data-dfp-ad-unit', '/1234567/ad_unit_' + Math.floor(Math.random() * 100));
    },
    () => {
      el.className = 'sponsored ad-container amzn-ads';
      el.id = 'amzn-ad-' + Math.floor(Math.random() * 100);
      el.setAttribute('data-sponsored', 'true');
    },
  ];

  patterns[Math.min(variant, patterns.length - 1)]();

  // MUHIM: !important ishlatilmaydi!
  // Agar !important bo'lsa, uBlock stylesheet orqali display:none!important 
  // qo'sha olmaydi — chunki inline !important > stylesheet !important
  el.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 1px;
    height: 1px;
    pointer-events: none;
    overflow: hidden;
    z-index: -1;
    opacity: 0.5;
  `;

  const inner = document.createElement('div');
  inner.className = 'adsbox';
  inner.innerHTML = '&nbsp;';
  el.appendChild(inner);
  return el;
}

function isBaitBlocked(el) {
  if (!el || !el.parentNode) return false;
  // AdBlocker display:none!important qiladi → offsetHeight 0 bo'ladi
  const style = window.getComputedStyle(el);
  return (
    el.offsetHeight === 0 ||
    el.offsetWidth === 0 ||
    style.display === 'none' ||
    style.visibility === 'hidden'
  );
}

function safeRemove(el) {
  try { if (el && el.parentNode) el.parentNode.removeChild(el); } catch {}
}

// ═══════════════════════════════════════════════════════════════
// DETEKSIYA USULLARI (har biri alohida Promise)
// ═══════════════════════════════════════════════════════════════

/**
 * USUL 1: DOM Bait — 3 xil element bilan
 */
function detectDomBait() {
  return new Promise((resolve) => {
    try {
      let completed = 0;
      const total = 3;
      let blocked = false;
      const baits = [];

      const done = () => {
        completed++;
        if (completed >= total) {
          baits.forEach(safeRemove);
          resolve(blocked);
        }
      };

      for (let i = 0; i < total; i++) {
        const b = createBait(i);
        baits.push(b);
        document.body.appendChild(b);
        requestAnimationFrame(() => {
          if (isBaitBlocked(b)) blocked = true;
          done();
        });
      }
    } catch { resolve(false); }
  });
}

/**
 * USUL 2: Script Bait — 2 xil URL
 */
function detectScriptBait() {
  return new Promise((resolve) => {
    try {
      let completed = 0;
      const total = 2;
      let blocked = false;
      const scripts = [];

      // 2.5 sekunddan keyin timeout
      const timeout = setTimeout(() => {
        scripts.forEach(safeRemove);
        resolve(false);
      }, 1500);

      const done = (isBlocked) => {
        if (isBlocked) blocked = true;
        completed++;
        if (completed >= total || blocked) {
          clearTimeout(timeout);
          scripts.forEach(safeRemove);
          resolve(blocked);
        }
      };

      for (let i = 0; i < total; i++) {
        const s = document.createElement('script');
        s.async = true;
        s.src = `${BAIT_SCRIPTS[i]}?v=${Date.now()}-${i}`;
        s.onload = () => done(false);
        s.onerror = () => done(true);
        scripts.push(s);
        document.head.appendChild(s);
      }
    } catch { resolve(false); }
  });
}

/**
 * USUL 3: Image Bait — tracking pixel
 */
function detectImageBait() {
  return new Promise((resolve) => {
    let completed = 0;
    const total = Math.min(BAIT_PIXELS.length, 2);
    let blocked = false;

    const done = (isBlocked) => {
      if (isBlocked) blocked = true;
      completed++;
      if (completed >= total) resolve(blocked);
    };

    BAIT_PIXELS.slice(0, total).forEach(url => {
      try {
        const img = new Image();
        let settled = false;
        const settle = (b) => {
          if (settled) return;
          settled = true;
          done(b);
        };
        img.onload = () => settle(false);
        img.onerror = () => settle(true);
        img.src = `${url}?v=${Date.now()}`;
        setTimeout(() => settle(false), 1500);
      } catch { done(false); }
    });

    if (total === 0) resolve(false);
  });
}

/**
 * USUL 4: Brave Browser Detection
 */
async function detectBrave() {
  try {
    if (typeof navigator !== 'undefined' && navigator.brave && typeof navigator.brave.isBrave === 'function') {
      return await navigator.brave.isBrave();
    }
  } catch {}
  return false;
}

/**
 * USUL 5: Iframe Bait
 */
function detectIframeBait() {
  return new Promise((resolve) => {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;';
      iframe.src = BAIT_IFRAMES[0];

      let settled = false;
      const settle = (blocked) => {
        if (settled) return;
        settled = true;
        safeRemove(iframe);
        resolve(blocked);
      };

      iframe.onload = () => settle(false);
      iframe.onerror = () => settle(true);
      document.body.appendChild(iframe);
      setTimeout(() => settle(false), 3000);
    } catch { resolve(false); }
  });
}

// ═══════════════════════════════════════════════════════════════
// ASOSIY DETEKSIYA — BARCHA USULLAR PARALLEL
// ═══════════════════════════════════════════════════════════════

/**
 * AdBlocker/Extension deteksiyasi — 5 usul parallel
 * 
 * @returns {Promise<{
 *   detected: boolean,
 *   method: string,
 *   details: { dom, script, image, brave, iframe, isBraveWithShields, isBraveOnly, detectionTime }
 * }>}
 */
export async function detectAdBlocker() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { detected: false, method: 'ssr', details: {} };
  }

  const startTime = Date.now();

  // Barcha usullarni + internet tekshiruvini parallel ishga tushiramiz
  const [dom, script, image, brave] = await Promise.all([
    detectDomBait(),
    detectScriptBait(),
    detectImageBait(),
    detectBrave(),
  ]);

  const results = { dom, script, image, brave };
  const detectionTime = Date.now() - startTime;

  // ─── VOTING SYSTEM ───
  // Image bait: CSP-safe (<img> CSP dan o'tadi), uBlock ERR_BLOCKED_BY_CLIENT bilan bloklaydi → ENG ISHONCHLI
  // DOM bait: localhostda cosmetic filtrlar ishlamaydi, productionda ishlaydi
  // Script bait: CSP bloklaydi (onerror dog'm false positive) → detection uchun ishlatilmaydi!
  // Iframe bait: CSP bloklaydi → detection uchun ishlatilmaydi!
  
  const isBraveWithShields = brave && (image || script || dom);
  const isBraveOnly = brave && !image && !script && !dom;

  let detected = false;
  let method = 'none';

  // Script va Iframe CSP tomonidan bloklanadi (false positive) — ishlatilmaydi
  // Faqat: Image (CSP-safe), DOM (production), Brave ishlatiladi
  
  if (image || script) {
    // Image bait CSP dan o'tadi, uBlock aniq bloklaydi → eng ishonchli
    detected = true;
    method = image ? 'local-image-bait' : 'local-script-bait';
  } else if (dom) {
    // DOM bait ishladi → adblocker bor (productionda)
    detected = true;
    method = 'dom-bait';
  } else if (isBraveWithShields) {
    // Brave Shields yoqilgan
    detected = true;
    method = 'brave-shields-active';
  }

  if (!detected && brave) method = 'brave-browser';

  return {
    detected,
    method,
    details: {
      ...results,
      isBraveWithShields,
      isBraveOnly,
      detectionTime,
    },
  };
}

/**
 * Tez tekshirish (DOM bait + Brave, ~200ms)
 */
export async function quickDetectAdBlocker() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { detected: false, method: 'ssr', details: {} };
  }

  const [dom, brave] = await Promise.all([
    detectDomBait(),
    detectBrave(),
  ]);

  // Brave Shields yoqilgan bo'lsa, bloklaymiz
  if (brave && dom) {
    return { detected: true, method: 'brave-shields-active', details: { dom, brave } };
  }

  return {
    detected: dom,
    method: dom ? 'quick-dom' : 'none',
    details: { dom, brave },
  };
}

/**
 * Bloklash kerakmi?
 * Brave brauzer faqat (Shields o'chirilgan) bo'lsa bloklamaymiz
 */
export function shouldBlock(result) {
  if (!result?.detected) return false;
  // Brave brauzer, lekin Shields o'chirilgan — bloklamaymiz
  if (result.details?.isBraveOnly) return false;
  return true;
}

export default { detectAdBlocker, quickDetectAdBlocker, shouldBlock };
