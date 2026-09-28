/*!
 * I Travel For Vegan Food: core.js
 * ------------------------------------------------------------------------
 * Runs on every page of the site. It does two jobs:
 *
 *   1. Site-wide features: saved places, the vegan phrase card, price
 *      conversion, closed-restaurant badges, image captions from alt text,
 *      and the back button.
 *   2. A shared toolbox on window.VT that guide.js and destination.js use,
 *      so those scripts don't each carry their own copy of the same code.
 *
 * Load it in Webflow: Site settings > Custom code > Footer code
 *   <script defer src="https://cdn.jsdelivr.net/gh/andyfromhk/i-travel-for-vegan-food@v1.1.1/core.min.js"></script>
 *
 * Debugging: add ?vtdebug=1 to any page URL and errors are printed to the
 * browser console. Without it, the script stays silent.
 */
(() => {
  'use strict';

  // If the script is accidentally included twice, the second copy does nothing.
  if (window.VT && window.VT.version) return;

  // ======================================================================
  // 1. SETTINGS
  // Everything you might want to change lives here.
  // ======================================================================

  const CONFIG = {
    version: '1.1.1',
    siteUrl: 'https://www.itravelforveganfood.com',
    mapsKey: 'AIzaSyCUbR04ahKoF2uAcAEhAr7gkTAOkbgVUPE',
    mapId: '7ffd42eb279d407c',
    brand: {
      name: 'I Travel For Vegan Food',
      logo: 'https://cdn.prod.website-files.com/60cbefb367e06dd6b12c5204/683d12c3ba958d15096befc9_i-travel-for-vegan-food-square-logo.webp',
    },
    ratesUrl: 'https://open.er-api.com/v6/latest/USD',
    ratesMaxAgeHours: 12,
    storagePrefix: 'itfvf:',
    // Turn any feature off by setting it to false.
    features: {
      savedPlaces: true,
      phraseCard: true,
      prices: true,
      closedBadges: true,
      captions: true,
      backButton: true,
    },
    // Colours used for veg types on markers, pills and labels (from your map scripts).
    vegColors: {
      'vegan': '#5a8707',
      'vegetarian': '#6c57ac',
      'good vegan options': '#e9942d',
      'limited vegan options': '#7a1616',
      'default': '#333333',
    },
  };

  const DEBUG = /[?&]vtdebug=1/.test(location.search) || safeLocalGet('itfvf:debug') === '1';

  // ======================================================================
  // 2. SITE DATA
  // Destination slugs come from your Destinations collection. When you add a
  // new destination in Webflow, add one line here too.
  // ======================================================================

  const COUNTRIES = {
    'japan':       { name: 'Japan',       currency: 'JPY', phrases: 'ja' },
    'south-korea': { name: 'South Korea', currency: 'KRW', phrases: 'ko' },
    'thailand':    { name: 'Thailand',    currency: 'THB', phrases: 'th' },
    'taiwan':      { name: 'Taiwan',      currency: 'TWD', phrases: 'zh-TW' },
    'hong-kong':   { name: 'Hong Kong',   currency: 'HKD', phrases: 'zh-HK' },
    'singapore':   { name: 'Singapore',   currency: 'SGD', phrases: 'zh-SG' },
    'australia':   { name: 'Australia',   currency: 'AUD', phrases: null },
  };

  // slug: [display name, country slug]
  const DESTINATIONS = {
    'tokyo': ['Tokyo', 'japan'], 'kyoto': ['Kyoto', 'japan'], 'osaka': ['Osaka', 'japan'],
    'nara': ['Nara', 'japan'], 'kobe': ['Kobe', 'japan'], 'himeji': ['Himeji', 'japan'],
    'kamakura': ['Kamakura', 'japan'], 'nagoya': ['Nagoya', 'japan'],
    'fukuoka': ['Fukuoka', 'japan'], 'okinawa': ['Okinawa', 'japan'],
    'bangkok': ['Bangkok', 'thailand'], 'chiang-mai': ['Chiang Mai', 'thailand'], 'phuket': ['Phuket', 'thailand'],
    'seoul': ['Seoul', 'south-korea'],
    'taipei': ['Taipei', 'taiwan'], 'kaohsiung': ['Kaohsiung', 'taiwan'],
    'hong-kong': ['Hong Kong', 'hong-kong'],
    'singapore': ['Singapore', 'singapore'],
    'brisbane': ['Brisbane', 'australia'], 'gold-coast': ['Gold Coast', 'australia'],
    'sunshine-coast': ['Sunshine Coast', 'australia'], 'sydney': ['Sydney', 'australia'],
    'melbourne': ['Melbourne', 'australia'], 'adelaide': ['Adelaide', 'australia'],
  };

  // Phrase card text: six phrases per language. `code` is the language tag,
  // which makes browsers pick the right Chinese or Japanese glyphs.
  // `tab` is the short English label on each button.
  const PHRASES = {
    'ja': {
      label: 'Japanese', code: 'ja',
      lines: [
        { tab: "I'm vegan", text: '私はヴィーガンです。\n肉・魚・卵・乳製品・はちみつは食べられません。\nかつおだしなど、魚のだしも食べられません。', en: "I'm vegan. I can't eat meat, fish, eggs, dairy or honey. I also can't have fish stock such as bonito dashi." },
        { tab: 'Vegan menu?', text: 'ヴィーガン対応のメニューはありますか？', en: 'Do you have any vegan dishes?' },
        { tab: 'Is it vegan?', text: 'この料理はヴィーガン対応ですか？', en: 'Is this dish vegan?' },
        { tab: 'Fish stock?', text: '魚のだし（かつお・煮干しなど）は\n使っていますか？', en: 'Is fish stock (such as bonito or dried sardine) used in this?' },
        { tab: 'Make it vegan', text: '肉・魚・卵・乳製品を使わずに\n作っていただけますか？', en: 'Could you make it without meat, fish, egg and dairy?' },
        { tab: 'Egg or dairy?', text: '卵・牛乳・バターは入っていますか？', en: 'Does this contain egg, milk or butter?' },
      ],
      note: 'Dashi (fish stock) hides in miso soup, noodle broth and sauces, so it is worth asking about.',
    },
    'ko': {
      label: 'Korean', code: 'ko',
      lines: [
        { tab: "I'm vegan", text: '저는 비건입니다.\n고기, 생선, 달걀, 유제품, 꿀을 먹지 않습니다.\n멸치 육수나 젓갈도 먹지 않습니다.', en: "I'm vegan. I don't eat meat, fish, eggs, dairy or honey. I also don't eat anchovy stock or fermented seafood." },
        { tab: 'Vegan menu?', text: '비건 메뉴가 있나요?', en: 'Do you have any vegan dishes?' },
        { tab: 'Is it vegan?', text: '이 음식은 비건인가요?', en: 'Is this dish vegan?' },
        { tab: 'Fish sauce?', text: '멸치 육수, 젓갈이나 액젓이\n들어가나요?', en: 'Does it contain anchovy stock, fermented seafood or fish sauce?' },
        { tab: 'Make it vegan', text: '고기, 생선, 달걀, 유제품 없이\n만들어 주실 수 있나요?', en: 'Could you make it without meat, fish, egg and dairy?' },
        { tab: 'Kimchi?', text: '김치에 젓갈이 들어가나요?', en: 'Is the kimchi made with fermented seafood (jeotgal)?' },
      ],
      note: 'Most kimchi and many soups are made with fish sauce or anchovy stock, so ask even about vegetable dishes.',
    },
    'th': {
      label: 'Thai', code: 'th',
      lines: [
        { tab: "I'm vegan", text: 'ฉันเป็นวีแกน\nไม่ทานเนื้อสัตว์ ปลา อาหารทะเล ไข่ นม และน้ำผึ้ง', en: "I'm vegan. I don't eat meat, fish, seafood, eggs, dairy or honey." },
        { tab: 'Vegan menu?', text: 'มีอาหารวีแกนหรืออาหารเจไหม', en: 'Do you have any vegan or jay (เจ) food?' },
        { tab: 'Is it vegan?', text: 'จานนี้เป็นวีแกนไหม', en: 'Is this dish vegan?' },
        { tab: 'Fish sauce?', text: 'มีน้ำปลา กะปิ น้ำมันหอย\nหรือน้ำซุปกระดูกไหม', en: 'Does it contain fish sauce, shrimp paste, oyster sauce or bone broth?' },
        { tab: 'Make it vegan', text: 'กรุณาไม่ใส่เนื้อสัตว์ ไข่ น้ำปลา\nกะปิ และน้ำมันหอย', en: 'Please make it without meat, egg, fish sauce, shrimp paste or oyster sauce.' },
        { tab: 'Soy sauce?', text: 'ใช้ซีอิ๊วแทนน้ำปลาได้ไหม', en: 'Can you use soy sauce instead of fish sauce?' },
      ],
      note: 'Yellow flags marked เจ (jay) signal Chinese-Thai vegan food, which also leaves out garlic and onion.',
    },
    'zh-TW': {
      label: 'Mandarin (Taiwan)', code: 'zh-Hant-TW',
      lines: [
        { tab: "I'm vegan", text: '我吃全素（純素）。\n不吃肉、海鮮、蛋、奶製品和蜂蜜。', en: "I'm vegan. I don't eat meat, seafood, eggs, dairy or honey." },
        { tab: 'Vegan menu?', text: '請問有全素的餐點嗎？', en: 'Do you have any vegan dishes?' },
        { tab: 'Is it vegan?', text: '請問這道菜是全素的嗎？', en: 'Is this dish vegan?' },
        { tab: 'Egg or dairy?', text: '請問有加蛋、牛奶或奶油嗎？', en: 'Does it contain egg, milk or butter?' },
        { tab: 'Make it vegan', text: '可以不要加肉、海鮮、蛋和奶嗎？', en: 'Could you make it without meat, seafood, egg and dairy?' },
        { tab: 'Lard or stock?', text: '請問有沒有用豬油或肉類高湯？', en: 'Is it cooked with lard or meat stock?' },
      ],
      note: 'Look for 全素 (fully vegan) on menus. 蛋奶素 means eggs and dairy are included.',
    },
    'zh-HK': {
      label: 'Cantonese (Hong Kong)', code: 'zh-Hant-HK',
      lines: [
        { tab: "I'm vegan", text: '我食全素（純素）。\n唔食肉、海鮮、蛋、奶類同蜂蜜。', en: "I'm vegan. I don't eat meat, seafood, eggs, dairy or honey." },
        { tab: 'Vegan menu?', text: '請問有冇全素嘢食？', en: 'Do you have any vegan food?' },
        { tab: 'Is it vegan?', text: '請問呢個係咪全素㗎？', en: 'Is this vegan?' },
        { tab: 'Egg or dairy?', text: '有冇落蛋、牛奶或者牛油？', en: 'Is there egg, milk or butter in it?' },
        { tab: 'Make it vegan', text: '可唔可以唔落肉、海鮮、蛋同奶？', en: 'Could you leave out the meat, seafood, egg and dairy?' },
        { tab: 'Oyster sauce?', text: '有冇落蠔油、魚露或者上湯？', en: 'Does it have oyster sauce, fish sauce or meat-based stock?' },
      ],
      note: 'Many 素 (vegetarian) restaurants use egg or dairy, and stir-fries often use oyster sauce, so it is worth checking.',
    },
    'zh-SG': {
      label: 'Mandarin (Singapore)', code: 'zh-Hans-SG',
      lines: [
        { tab: "I'm vegan", text: '我吃纯素。\n不吃肉、海鲜、蛋、奶制品和蜂蜜。', en: "I'm vegan. I don't eat meat, seafood, eggs, dairy or honey." },
        { tab: 'Vegan menu?', text: '请问有纯素的食物吗？', en: 'Do you have any vegan food?' },
        { tab: 'Is it vegan?', text: '请问这个是纯素的吗？', en: 'Is this vegan?' },
        { tab: 'Egg or dairy?', text: '有没有加蛋、牛奶或牛油？', en: 'Does it have egg, milk or butter?' },
        { tab: 'Make it vegan', text: '可以不加肉、海鲜、蛋和奶吗？', en: 'Could you make it without meat, seafood, egg and dairy?' },
        { tab: 'Shrimp paste?', text: '有没有加虾酱（峇拉煎）、\n虾米或鱼露？', en: 'Does it contain shrimp paste (belacan), dried shrimp or fish sauce?' },
      ],
      note: 'English is widely spoken. Sambal chilli usually contains shrimp paste, so ask at hawker stalls.',
    },
  };

  const CURRENCY_NAMES = {
    AUD: 'Australian dollar', USD: 'US dollar', EUR: 'Euro', GBP: 'British pound', CAD: 'Canadian dollar',
    NZD: 'New Zealand dollar', SGD: 'Singapore dollar', HKD: 'Hong Kong dollar', JPY: 'Japanese yen',
    THB: 'Thai baht', KRW: 'Korean won', TWD: 'Taiwan dollar', CNY: 'Chinese yuan', INR: 'Indian rupee', CHF: 'Swiss franc',
  };

  // Used only until live rates arrive, or if the rates service is unreachable.
  // Rough values, US dollar base.
  const FALLBACK_RATES = {
    USD: 1, AUD: 1.52, EUR: 0.86, GBP: 0.74, CAD: 1.38, NZD: 1.68, SGD: 1.29, HKD: 7.8,
    JPY: 147, THB: 32.5, KRW: 1390, TWD: 30, CNY: 7.15, INR: 87, CHF: 0.8,
  };

  // Small line icons (24x24, drawn with the current text colour).
  const ICON = {
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
    speech: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    page: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></svg>',
    back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></svg>',
  };

  // ======================================================================
  // 3. SMALL HELPERS
  // ======================================================================

  function safeLocalGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  // Runs a function and, if it throws, keeps the rest of the script working.
  function guard(name, fn) {
    try { return fn(); } catch (e) { if (DEBUG) console.error('[VT] ' + name + ' failed:', e); return undefined; }
  }

  // Browser storage that never throws (private browsing can block storage).
  const storage = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(CONFIG.storagePrefix + key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(CONFIG.storagePrefix + key, JSON.stringify(value)); return true; } catch (e) { return false; }
    },
    remove(key) {
      try { localStorage.removeItem(CONFIG.storagePrefix + key); } catch (e) { /* ignore */ }
    },
  };

  // Builds an element: el('a', { href: '/x', class: 'y', text: 'Hi' }, [children])
  function el(tag, props, children) {
    const node = document.createElement(tag);
    Object.entries(props || {}).forEach(([key, value]) => {
      if (value == null || value === false) return;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key === 'html') node.innerHTML = value; // only ever used with the icons above
      else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? '' : value);
    });
    (children || []).forEach((child) => {
      if (child != null) node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  function clean(text) { return (text || '').replace(/\s+/g, ' ').trim(); }

  // True if an element is hidden by Webflow's conditional visibility.
  function isConditionallyHidden(node) { return !!(node && node.closest('.w-condition-invisible')); }

  // Areas the scripts should never touch.
  const IGNORE = 'nav, footer, .w-nav, [data-vt-ignore], .vt-ui';

  function onReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  }
  function onLoaded(fn) {
    // Runs after images and other scripts (like the Refokus rich text enhancer) have finished.
    if (document.readyState === 'complete') setTimeout(fn, 0);
    else window.addEventListener('load', () => setTimeout(fn, 50), { once: true });
  }

  function vegColor(name) {
    const key = clean(name).toLowerCase();
    return CONFIG.vegColors[key] || CONFIG.vegColors.default;
  }

  function destinationName(slug) { return (DESTINATIONS[slug] || [slug || ''])[0]; }

  // Link that opens the place's listing in Google Maps (not just a pin).
  //  1. An exact link, if there is one: a chain's store locator, or a Google
  //     Maps link taken from a guide.
  //  2. Otherwise a search for "Name, Address". Google opens the listing
  //     directly when the search matches one place, which it does for
  //     nearly every restaurant with an address.
  //  3. A Google Place ID, if one is ever stored, guarantees the right listing.
  function mapsLink(item) {
    if (item.mapsUrl) return item.mapsUrl;
    const query = [item.name, item.address || destinationName(item.destination)].filter(Boolean).join(', ');
    let url = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query);
    if (item.placeId) url += '&query_place_id=' + encodeURIComponent(item.placeId);
    return url;
  }

  // Label for that link: chains go to a list of locations, not one listing.
  function mapsLabel(item) { return item.chain ? 'Find a location' : 'Google Maps'; }

  // ======================================================================
  // 4. PAGE CONTEXT
  // Works out what kind of page this is and which destination it's about.
  // ======================================================================

  function readContext() {
    const parts = location.pathname.replace(/\/+$/, '').split('/');
    const section = parts[1] || '';
    const type = { 'articles': 'article', 'map-guides': 'map-guide', 'destinations': 'destination', 'restaurants': 'restaurant' }[section] || 'other';

    // Destination slugs, in order of reliability:
    // a) data-vt-destination attributes you add in Webflow (bound to CMS fields)
    // b) the URL itself on destination pages
    // c) an "Open ... Restaurant Map" button pointing at /destinations/...
    const slugs = [];
    document.querySelectorAll('[data-vt-destination]').forEach((node) => {
      const slug = clean(node.getAttribute('data-vt-destination')).toLowerCase();
      if (slug) slugs.push(slug);
    });
    if (type === 'destination' && parts[2]) slugs.push(parts[2]);
    if (!slugs.length) {
      document.querySelectorAll('a[href*="/destinations/"]').forEach((a) => {
        if (a.closest(IGNORE) || !/restaurant map/i.test(a.textContent)) return;
        const m = a.pathname.match(/^\/destinations\/([^/]+)/);
        if (m) slugs.push(m[1]);
      });
    }

    const destinations = [...new Set(slugs)].filter((s) => DESTINATIONS[s]);

    // If a page covers several destinations, use the country most of them are in.
    const tally = {};
    destinations.forEach((s) => { const c = DESTINATIONS[s][1]; tally[c] = (tally[c] || 0) + 1; });
    const country = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0] || null;

    return {
      type,
      slug: parts[2] || '',
      destinations,
      destination: destinations[0] || null,
      country,
      countryInfo: country ? COUNTRIES[country] : null,
    };
  }

  // ======================================================================
  // 5. GOOGLE MAPS LOADER
  // Loads the Maps script once, only when a page actually needs a map.
  // guide.js and destination.js call VT.maps.load().then(...)
  // ======================================================================

  let mapsPromise = null;
  const maps = {
    mapId: CONFIG.mapId,
    load() {
      if (window.google && window.google.maps && window.google.maps.Map) return Promise.resolve(window.google.maps);
      if (mapsPromise) return mapsPromise;
      mapsPromise = new Promise((resolve, reject) => {
        window.__vtMapsReady = () => resolve(window.google.maps);
        const params = new URLSearchParams({
          key: CONFIG.mapsKey, v: 'weekly', loading: 'async', libraries: 'marker', callback: '__vtMapsReady',
        });
        const script = el('script', { src: 'https://maps.googleapis.com/maps/api/js?' + params, async: true });
        script.onerror = () => { mapsPromise = null; reject(new Error('Google Maps could not load')); };
        document.head.appendChild(script);
      });
      return mapsPromise;
    },
  };

  // ======================================================================
  // 6. SMALL UI PIECES: toast messages and the floating dock
  // ======================================================================

  let toastTimer = null;
  function toast(message, ms) {
    let node = document.querySelector('.vt-toast');
    if (!node) {
      node = el('div', { class: 'vt-ui vt-toast', role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(node);
    }
    node.textContent = message;
    requestAnimationFrame(() => node.classList.add('vt-show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('vt-show'), ms || 2400);
  }

  // Overlay bookkeeping: only one overlay (drawer, phrase card, currency picker) at a time.
  const overlay = {
    lastFocus: null,
    wakeLock: null,
    cleanups: [],
    open(node, { scrim = false, lock = true } = {}) {
      overlay.close(true);
      overlay.lastFocus = document.activeElement;
      if (scrim) document.body.appendChild(el('div', { class: 'vt-ui vt-scrim', onclick: () => overlay.close() }));
      document.body.appendChild(node);
      if (lock) document.documentElement.classList.add('vt-locked');
    },
    close(silent) {
      document.querySelectorAll('.vt-overlay, .vt-scrim, .vt-pop').forEach((n) => n.remove());
      overlay.cleanups.splice(0).forEach((fn) => fn());
      document.documentElement.classList.remove('vt-locked');
      if (overlay.wakeLock) { overlay.wakeLock.release().catch(() => {}); overlay.wakeLock = null; }
      if (!silent && overlay.lastFocus && overlay.lastFocus.focus) {
        try { overlay.lastFocus.focus(); } catch (e) { /* element gone */ }
      }
      overlay.lastFocus = null;
    },
  };

  const dock = {
    node: null,
    build() {
      if (dock.node) return;
      dock.node = el('div', { class: 'vt-ui vt-dock' });
      document.body.appendChild(dock.node);
      dock.refresh();
    },
    // Rebuilds the buttons in the dock based on the current page and saved list.
    refresh() {
      if (!dock.node) return;
      dock.node.textContent = '';
      if (CONFIG.features.phraseCard && context.countryInfo && context.countryInfo.phrases) {
        dock.node.appendChild(el('button', {
          type: 'button', class: 'vt-fab vt-fab-phrase', html: ICON.speech + '<span>Vegan phrase card</span>',
          onclick: () => phraseCard.open(),
        }));
      }
      if (CONFIG.features.savedPlaces) {
        const count = saved.list().length;
        const pageHasSaveButtons = !!document.querySelector('[data-vt-save]');
        if (count || pageHasSaveButtons) {
          const button = el('button', {
            type: 'button', class: 'vt-fab', 'aria-label': 'Saved places (' + count + ')',
            html: ICON.heart + '<span>Saved</span>' + (count ? '<span class="vt-count">' + count + '</span>' : ''),
            onclick: () => saved.openDrawer(),
          });
          dock.node.appendChild(button);
        }
      }
      dock.node.hidden = !dock.node.children.length;
    },
  };

  // ======================================================================
  // 7. SAVED PLACES
  // Each saved item is a small record in the reader's browser storage.
  // A place looks like:
  //   { id: 'place:neon-ramen', kind: 'place', name: 'Neon Ramen',
  //     destination: 'brisbane', area: 'Everton Park', lat: -27.4, lng: 152.9,
  //     mapsUrl: '...', page: '/restaurants/neon-ramen',
  //     from: '/map-guides/...#neon-ramen', fromTitle: 'Best Vegan Ramen...' }
  // A guide looks like:
  //   { id: 'guide:/articles/vegan-chiang-mai-guide', kind: 'guide', name: '...', page: '/articles/...' }
  // ======================================================================

  const listeners = new Set();

  const saved = {
    list() {
      const items = storage.get('saved', []);
      return Array.isArray(items) ? items : [];
    },
    has(id) { return saved.list().some((x) => x.id === id); },
    placeId(slug) { return 'place:' + slug; },
    guideId(path) { return 'guide:' + (path || location.pathname).replace(/\/+$/, ''); },

    toggle(item) {
      if (!item || !item.id || !item.name) return false;
      const items = saved.list();
      const index = items.findIndex((x) => x.id === item.id);
      if (index > -1) {
        items.splice(index, 1);
        toast('Removed ' + item.name);
      } else {
        items.unshift(Object.assign({ kind: 'place' }, item, { savedAt: Date.now() }));
        toast('Saved ' + item.name);
      }
      storage.set('saved', items);
      saved.changed();
      return index === -1;
    },
    remove(id) {
      storage.set('saved', saved.list().filter((x) => x.id !== id));
      saved.changed();
    },
    clear() { storage.set('saved', []); saved.changed(); },

    // Updates a saved place with the latest details (e.g. a newly added Google
    // Maps link) without changing anything the reader did. Empty values are skipped.
    refresh(item) {
      const items = saved.list();
      const index = items.findIndex((x) => x.id === item.id);
      if (index === -1) return;
      const fresh = Object.fromEntries(Object.entries(item).filter(([, value]) => value != null));
      items[index] = Object.assign({}, items[index], fresh, { savedAt: items[index].savedAt });
      storage.set('saved', items);
    },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    // Called after every change, here or in another open tab.
    changed() {
      document.querySelectorAll('[data-vt-save]').forEach(syncSaveButton);
      dock.refresh();
      const list = document.querySelector('.vt-drawer .vt-drawer-list');
      if (list) renderDrawerList(list);
      listeners.forEach((fn) => guard('saved listener', () => fn(saved.list())));
    },

    // Creates a Save button for any place or guide. Other scripts use this.
    //   VT.saved.button(item)                 -> "Save" / "Saved" chip
    //   VT.saved.button(item, { compact: true }) -> heart-only button
    button(item, options) {
      const opts = Object.assign({ label: 'Save', savedLabel: 'Saved', compact: false }, options);
      const button = el('button', {
        type: 'button',
        class: 'vt-ui vt-save' + (opts.compact ? ' vt-save-compact' : ' vt-chip'),
        'data-vt-save': item.id,
        'data-label': opts.label,
        'data-saved-label': opts.savedLabel,
        'data-name': item.name,
        html: ICON.heart + (opts.compact ? '' : '<span></span>'),
      });
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        saved.toggle(item);
      });
      syncSaveButton(button);
      // Make sure the dock shows the Saved button once a page has save buttons.
      requestAnimationFrame(dock.refresh);
      return button;
    },

    openDrawer,
  };

  function syncSaveButton(button) {
    const on = saved.has(button.getAttribute('data-vt-save'));
    const name = button.getAttribute('data-name') || '';
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
    button.setAttribute('aria-label', on ? 'Remove ' + name + ' from saved places' : 'Save ' + name);
    const label = button.querySelector('span');
    if (label) label.textContent = on ? button.getAttribute('data-saved-label') : button.getAttribute('data-label');
  }

  function openDrawer() {
    const closeButton = el('button', { type: 'button', class: 'vt-link', text: 'Close', onclick: () => overlay.close() });
    const list = el('div', { class: 'vt-drawer-list' });
    const footer = el('div', { class: 'vt-drawer-foot' });
    if (navigator.share) footer.appendChild(el('button', { type: 'button', class: 'vt-btn', text: 'Share list', onclick: shareList }));
    footer.appendChild(el('button', { type: 'button', class: 'vt-btn vt-btn-ghost', text: 'Copy list', onclick: () => copyText(listAsText()) }));
    footer.appendChild(el('button', {
      type: 'button', class: 'vt-link vt-push', text: 'Clear all',
      onclick: () => { if (window.confirm('Remove all saved places from this device?')) saved.clear(); },
    }));
    const drawer = el('div', { class: 'vt-ui vt-overlay vt-drawer', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Saved places' }, [
      el('div', { class: 'vt-drawer-head' }, [el('div', { class: 'vt-drawer-title', text: 'Saved places' }), closeButton]),
      list,
      footer,
    ]);
    overlay.open(drawer, { scrim: true });
    renderDrawerList(list);
    closeButton.focus();
  }

  function renderDrawerList(container) {
    const items = saved.list();
    container.textContent = '';
    const footer = container.parentNode && container.parentNode.querySelector('.vt-drawer-foot');
    if (footer) footer.hidden = !items.length;

    if (!items.length) {
      container.appendChild(el('div', { class: 'vt-empty' }, [
        el('p', { class: 'vt-empty-title', text: 'Nothing saved yet' }),
        el('p', { text: 'Tap Save on any restaurant, cafe or guide and it will appear here. Your list stays on this device, so you can open it while travelling.' }),
      ]));
      return;
    }

    groupItems(items).forEach(([heading, group]) => {
      container.appendChild(el('div', { class: 'vt-group', text: heading }));
      group.forEach((item) => {
        const actions = el('div', { class: 'vt-item-actions' });
        if (item.kind === 'place') {
          actions.appendChild(el('a', { class: 'vt-chip', href: mapsLink(item), target: '_blank', rel: 'noopener', html: ICON.pin + '<span>' + mapsLabel(item) + '</span>' }));
          if (item.page) actions.appendChild(el('a', { class: 'vt-chip', href: item.page, html: ICON.page + '<span>Restaurant page</span>' }));
          if (item.from && item.from !== item.page) actions.appendChild(el('a', { class: 'vt-chip', href: item.from, html: ICON.back + '<span>In the guide</span>' }));
        }
        actions.appendChild(el('button', { type: 'button', class: 'vt-link', text: 'Remove', onclick: () => saved.remove(item.id) }));
        const meta = [item.area, item.fromTitle ? 'From: ' + item.fromTitle : ''].filter(Boolean).join(' · ');
        const status = item.kind === 'place' ? closedLabel(statusOf(slugOf(item))) : null;
        container.appendChild(el('div', { class: 'vt-item' }, [
          el('a', { class: 'vt-item-name', href: item.page || item.from || '#', text: item.name }),
          status ? el('span', { class: 'vt-closed' + (/temporar/i.test(status) ? ' vt-closed-temp' : ''), text: status }) : null,
          meta ? el('div', { class: 'vt-item-meta', text: meta }) : null,
          actions,
        ]));
      });
    });
  }

  // Guides first, then places grouped by destination.
  function groupItems(items) {
    const groups = new Map();
    const guides = items.filter((x) => x.kind === 'guide');
    if (guides.length) groups.set('Saved guides', guides);
    items.filter((x) => x.kind !== 'guide').forEach((item) => {
      const key = destinationName(item.destination) || 'Other places';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    return [...groups.entries()];
  }

  function absolute(url) { return url && url.startsWith('/') ? CONFIG.siteUrl + url : url; }

  // Plain-text version of the list, used by Copy list and Share list.
  //   BRISBANE
  //   Neon Ramen
  //   Google Maps: https://...
  //   Restaurant page: https://www.itravelforveganfood.com/restaurants/neon-ramen
  function listAsText() {
    const lines = ['My saved vegan spots', 'From ' + CONFIG.brand.name + ' (' + CONFIG.siteUrl.replace('https://www.', '') + ')'];
    groupItems(saved.list()).forEach(([heading, group]) => {
      lines.push('', heading.toUpperCase());
      group.forEach((item, i) => {
        if (i > 0) lines.push('');
        if (item.kind === 'guide') {
          lines.push(item.name, absolute(item.page));
          return;
        }
        const status = closedLabel(statusOf(slugOf(item)));
        lines.push(item.name + (status ? ' (' + status + ')' : ''));
        lines.push(mapsLabel(item) + ': ' + mapsLink(item));
        if (item.page) lines.push('Restaurant page: ' + absolute(item.page));
        else if (item.from) lines.push('In the guide: ' + absolute(item.from));
      });
    });
    return lines.join('\n');
  }

  function shareList() {
    navigator.share({ title: 'My saved vegan spots', text: listAsText() }).catch(() => { /* reader cancelled */ });
  }

  function copyText(text) {
    const done = () => toast('List copied');
    const fallback = () => {
      const area = el('textarea', { class: 'vt-offscreen' });
      area.value = text;
      document.body.appendChild(area);
      area.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('Copy failed. Select the text manually.'); }
      area.remove();
    };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  }

  // Save button on restaurant pages. It reads the attributes you add to the
  // Restaurants template (see the checklist). Without them it still works,
  // using the page URL and heading.
  function restaurantSaveButton() {
    const source = document.querySelector('[data-vt-place]');
    const h1 = document.querySelector('h1');
    const slug = clean(source && source.getAttribute('data-vt-place')) || context.slug;
    const name = clean(source && source.getAttribute('data-vt-name')) || clean(h1 && h1.textContent);
    if (!slug || !name) return;

    const attr = (attribute) => clean(source && source.getAttribute(attribute)) || null;
    const chainMarker = document.querySelector('[data-vt-chain]');
    const isChain = !!chainMarker && !isConditionallyHidden(chainMarker);
    const lat = parseFloat(attr('data-vt-lat'));
    const lng = parseFloat(attr('data-vt-lng'));

    // A permanently closed place can't be visited, so it gets no Save button.
    if (/permanent/i.test(statusOf(slug))) return;

    const item = {
      id: saved.placeId(slug),
      kind: 'place',
      name,
      destination: attr('data-vt-destination') || context.destination,
      area: attr('data-vt-area'),
      address: isChain ? null : attr('data-vt-address'),
      lat: isChain || isNaN(lat) ? null : lat,
      lng: isChain || isNaN(lng) ? null : lng,
      // Optional attributes, only if you ever add these fields in Webflow:
      // data-vt-maps (an exact Google Maps link) and data-vt-place-id.
      mapsUrl: isChain ? attr('data-vt-locator') : attr('data-vt-maps'),
      placeId: isChain ? null : attr('data-vt-place-id'),
      page: '/restaurants/' + slug,
      chain: isChain,
    };

    saved.refresh(item);
    const button = saved.button(item);
    const slot = document.querySelector('[data-vt-save-slot]');
    if (slot) slot.appendChild(button);
    else if (h1) h1.insertAdjacentElement('afterend', el('div', { class: 'vt-ui vt-row' }, [button]));
  }

  // ======================================================================
  // 8. PHRASE CARD
  // A full-screen card a traveller can turn around and show to staff.
  // ======================================================================

  const phraseCard = {
    open(languageKey) {
      const key = PHRASES[languageKey] ? languageKey
        : (context.countryInfo && context.countryInfo.phrases) || 'ja';
      const data = PHRASES[key];
      let index = 0;

      const text = el('p', { class: 'vt-sign-text', lang: data.code });
      const english = el('p', { class: 'vt-sign-en', lang: 'en' });
      const tabs = el('div', { class: 'vt-sign-tabs', role: 'tablist', 'aria-label': 'Phrases' });
      const render = () => {
        text.textContent = data.lines[index].text;
        english.textContent = data.lines[index].en;
        [...tabs.children].forEach((tab, i) => tab.setAttribute('aria-selected', i === index ? 'true' : 'false'));
      };
      data.lines.forEach((line, i) => tabs.appendChild(el('button', {
        type: 'button', class: 'vt-sign-tab', role: 'tab', text: line.tab,
        onclick: () => { index = i; render(); },
      })));

      const language = el('select', { class: 'vt-sign-lang', 'aria-label': 'Language', onchange: (e) => phraseCard.open(e.target.value) },
        Object.keys(PHRASES).map((k) => el('option', { value: k, selected: k === key, text: PHRASES[k].label })));
      const done = el('button', { type: 'button', class: 'vt-sign-done', text: 'Done', onclick: () => overlay.close() });
      const brand = el('div', { class: 'vt-sign-brand' }, [
        el('span', { class: 'vt-sign-logo' }, [el('img', { src: CONFIG.brand.logo, alt: '', width: '28', height: '28' })]),
        el('span', { class: 'vt-sign-name', text: CONFIG.brand.name }),
      ]);

      const card = el('div', { class: 'vt-ui vt-overlay vt-sign', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Vegan phrase card' }, [
        el('div', { class: 'vt-sign-top' }, [brand, done]),
        el('div', { class: 'vt-sign-controls' }, [language, el('span', { class: 'vt-sign-hint', text: 'Turn your screen toward the staff' })]),
        el('div', { class: 'vt-sign-body' }, [text, english]),
        tabs,
        el('p', { class: 'vt-sign-note', text: data.note }),
      ]);
      const previousFocus = document.querySelector('.vt-sign') ? overlay.lastFocus : document.activeElement;
      overlay.open(card);
      overlay.lastFocus = previousFocus;
      render();
      done.focus();

      // Keep the screen awake while it's being shown to someone.
      if (navigator.wakeLock) navigator.wakeLock.request('screen').then((lock) => { overlay.wakeLock = lock; }).catch(() => {});
    },
  };

  // ======================================================================
  // 9. PRICE CONVERTER
  // Finds prices like "2,750 yen" in your rich text and adds an approximate
  // conversion into the reader's own currency.
  // ======================================================================

  const SYMBOLS = { 'hk$': 'HKD', 'nt$': 'TWD', 's$': 'SGD', 'us$': 'USD', 'a$': 'AUD', 'au$': 'AUD', 'nz$': 'NZD', '¥': 'JPY', '￥': 'JPY', '₩': 'KRW', '฿': 'THB' };
  const WORDS = { 'yen': 'JPY', '円': 'JPY', 'jpy': 'JPY', 'baht': 'THB', 'thb': 'THB', 'won': 'KRW', '원': 'KRW', 'krw': 'KRW', 'hkd': 'HKD', 'twd': 'TWD', 'ntd': 'TWD', 'sgd': 'SGD', 'aud': 'AUD' };
  const DOLLAR_COUNTRIES = ['AUD', 'HKD', 'TWD', 'SGD'];

  const prices = {
    home: null,
    rates: FALLBACK_RATES,
    pills: [],

    run() {
      const local = context.countryInfo && context.countryInfo.currency;
      if (!local) return;
      prices.home = storage.get('home-currency', null) || guessHomeCurrency();
      const pattern = pricePattern(local);
      document.querySelectorAll('.w-richtext, [data-vt-prices]').forEach((root) => {
        if (!root.closest(IGNORE)) wrapPrices(root, pattern, local);
      });
      if (prices.pills.length) loadRates();
    },

    render() {
      const { home, rates } = prices;
      prices.pills.forEach((pill) => {
        const from = pill.getAttribute('data-cur');
        if (from === home || !rates[from] || !rates[home]) { pill.hidden = true; return; }
        const value = Number(pill.getAttribute('data-amt')) / rates[from] * rates[home];
        pill.hidden = false;
        pill.textContent = '≈ ' + money(value, home);
        pill.setAttribute('aria-label', 'About ' + money(value, home) + '. Change currency');
        pill.title = 'Approximate price in ' + CURRENCY_NAMES[home] + 's. Tap to change currency.';
      });
    },
  };

  function pricePattern(local) {
    const number = '(\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,2})?|\\d+(?:\\.\\d{1,2})?)';
    // Plain "$" only counts as the local currency in dollar countries.
    const symbols = 'HK\\$|NT\\$|US\\$|AU\\$|NZ\\$|A\\$|S\\$|¥|￥|₩|฿' + (DOLLAR_COUNTRIES.includes(local) ? '|\\$' : '');
    return new RegExp('(' + symbols + ')\\s?' + number + '|' + number + '\\s?(yen|円|baht|won|원|JPY|THB|KRW|HKD|TWD|NTD|SGD|AUD)(?![A-Za-z])', 'gi');
  }

  function wrapPrices(root, pattern, local) {
    const skip = 'a, button, h1, h2, h3, h4, h5, h6, script, style, select, option, textarea, ' + IGNORE;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!/\d/.test(node.nodeValue) || !node.parentElement || node.parentElement.closest(skip)) return NodeFilter.FILTER_REJECT;
        pattern.lastIndex = 0;
        return pattern.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach((node) => {
      const text = node.nodeValue;
      const fragment = document.createDocumentFragment();
      let last = 0;
      let match;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(text))) {
        const end = match.index + match[0].length;
        fragment.appendChild(document.createTextNode(text.slice(last, end)));
        const currency = match[1] ? (match[1] === '$' ? local : SYMBOLS[match[1].toLowerCase()]) : WORDS[(match[4] || '').toLowerCase()];
        const amount = parseFloat((match[2] || match[3] || '').replace(/,/g, ''));
        if (currency && amount > 0) {
          const pill = el('button', { type: 'button', class: 'vt-ui vt-price', 'data-amt': amount, 'data-cur': currency, hidden: true });
          pill.addEventListener('click', (e) => { e.preventDefault(); openCurrencyPicker(pill); });
          prices.pills.push(pill);
          fragment.appendChild(pill);
        }
        last = end;
      }
      fragment.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(fragment, node);
    });
  }

  function money(value, currency) {
    const decimals = value < 10 && currency !== 'JPY' && currency !== 'KRW' ? 2 : 0;
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
    } catch (e) { return currency + ' ' + value.toFixed(decimals); }
  }

  // Guesses the reader's currency from their time zone, then their browser language.
  function guessHomeCurrency() {
    let zone = '';
    try { zone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* ignore */ }
    if (/^Australia\//.test(zone)) return 'AUD';
    const byZone = { 'Pacific/Auckland': 'NZD', 'Europe/London': 'GBP', 'Asia/Tokyo': 'JPY', 'Asia/Singapore': 'SGD', 'Asia/Hong_Kong': 'HKD', 'Asia/Taipei': 'TWD', 'Asia/Seoul': 'KRW', 'Asia/Bangkok': 'THB', 'Asia/Kolkata': 'INR', 'Asia/Shanghai': 'CNY', 'Europe/Zurich': 'CHF' };
    if (byZone[zone]) return byZone[zone];
    const byRegion = { AU: 'AUD', US: 'USD', GB: 'GBP', CA: 'CAD', NZ: 'NZD', SG: 'SGD', HK: 'HKD', JP: 'JPY', TH: 'THB', KR: 'KRW', TW: 'TWD', CN: 'CNY', IN: 'INR', CH: 'CHF', IE: 'EUR', DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR', PT: 'EUR', FI: 'EUR', GR: 'EUR' };
    for (const language of navigator.languages || [navigator.language || '']) {
      const region = (language.split('-')[1] || '').toUpperCase();
      if (byRegion[region]) return byRegion[region];
    }
    return /^Europe\//.test(zone) ? 'EUR' : 'USD';
  }

  function loadRates() {
    const cached = storage.get('rates', null);
    if (cached && cached.rates) prices.rates = cached.rates;
    prices.render();
    if (cached && Date.now() - cached.time < CONFIG.ratesMaxAgeHours * 3600 * 1000) return;
    fetch(CONFIG.ratesUrl)
      .then((response) => response.json())
      .then((data) => {
        if (!data || !data.rates || !data.rates.JPY) return;
        storage.set('rates', { time: Date.now(), rates: data.rates });
        prices.rates = data.rates;
        prices.render();
      })
      .catch(() => { /* keep the fallback rates */ });
  }

  function openCurrencyPicker(anchor) {
    const select = el('select', {
      id: 'vt-currency', onchange: (e) => {
        prices.home = e.target.value;
        storage.set('home-currency', prices.home);
        prices.render();
        overlay.close();
        toast('Prices now shown in ' + CURRENCY_NAMES[prices.home] + 's');
      },
    }, Object.keys(CURRENCY_NAMES).map((code) => el('option', { value: code, selected: code === prices.home, text: code + ' · ' + CURRENCY_NAMES[code] })));

    const popover = el('div', { class: 'vt-ui vt-pop', role: 'dialog', 'aria-label': 'Choose currency' }, [
      el('label', { class: 'vt-pop-label', for: 'vt-currency', text: 'Show prices in' }),
      select,
      el('p', { class: 'vt-pop-note' }, ['Approximate, for budgeting only. ',
        el('a', { href: 'https://www.exchangerate-api.com', target: '_blank', rel: 'noopener', text: 'Rates by ExchangeRate-API' })]),
    ]);
    overlay.open(popover, { lock: false });
    const box = anchor.getBoundingClientRect();
    const maxLeft = window.scrollX + document.documentElement.clientWidth - popover.offsetWidth - 12;
    popover.style.top = (window.scrollY + box.bottom + 8) + 'px';
    popover.style.left = Math.max(12, Math.min(window.scrollX + box.left, maxLeft)) + 'px';
    select.focus();
    const outside = (e) => { if (!e.target.closest('.vt-pop')) overlay.close(true); };
    setTimeout(() => document.addEventListener('click', outside), 0);
    overlay.cleanups.push(() => document.removeEventListener('click', outside));
  }

  // ======================================================================
  // 10. CLOSED BADGES
  // Reads the hidden "closed restaurants" collection list in your footer and
  // adds a small badge next to links to those restaurants in guide text.
  // ======================================================================

  const closed = new Map();      // slug -> status as written in Webflow
  const closedNames = new Map(); // slug -> restaurant name (optional data-vt-name)

  function readClosedList() {
    document.querySelectorAll('[data-vt-closed]').forEach((node) => {
      const slug = clean(node.getAttribute('data-vt-slug'));
      const status = clean(node.getAttribute('data-vt-status'));
      if (!slug || !/closed/i.test(status)) return;
      closed.set(slug, status);
      const name = clean(node.getAttribute('data-vt-name'));
      if (name) closedNames.set(slug, name);
    });
  }

  function statusOf(slug) { return closed.get(slug) || 'Open'; }

  // 'Permanently Closed', 'Temporarily Closed', or null when open.
  function closedLabel(status) {
    if (!status || !/closed/i.test(status)) return null;
    return /temporar/i.test(status) ? 'Temporarily Closed' : 'Permanently Closed';
  }

  function slugFromLink(link) {
    const match = link.pathname && link.pathname.match(/^\/restaurants\/([^/?#]+)/);
    return match ? match[1] : null;
  }

  function slugOf(item) {
    const match = (item.page || '').match(/\/restaurants\/([^/?#]+)/);
    return match ? match[1] : (item.id || '').replace(/^place:/, '');
  }

  // Loose name comparison: "Taro's Ramen" matches "Taro’s Ramen South Brisbane".
  function simplify(text) {
    return clean(text).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[’'`]/g, '').replace(/&/g, ' and ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  }
  function namesMatch(a, b) {
    const x = simplify(a), y = simplify(b);
    return x.length > 2 && y.length > 2 && (x.includes(y) || y.includes(x));
  }

  // Adds a badge after each link to a closed restaurant in your guide text, and
  // on the heading of that restaurant's section. Heading badges are drawn with
  // CSS (not added as text), so tables of contents and map labels that read the
  // heading text aren't affected.
  function addClosedBadges() {
    if (!closed.size) return;
    const roots = [...document.querySelectorAll('.w-richtext, [data-vt-badges]')].filter((root) => !root.closest(IGNORE));
    roots.forEach((root) => {
      let heading = null;
      root.querySelectorAll('h1, h2, h3, h4, a[href*="/restaurants/"]').forEach((node) => {
        if (/^H[1-4]$/.test(node.tagName)) { heading = node; return; }
        const slug = slugFromLink(node);
        const label = closedLabel(slug && closed.get(slug));
        if (!label) return;

        const inHeading = node.closest('h1, h2, h3, h4');
        const target = inHeading || heading;
        const name = closedNames.get(slug) || node.textContent;
        if (target && target.tagName !== 'H1' && !target.hasAttribute('data-vt-closed-label')
            && (inHeading || namesMatch(target.textContent, name))) {
          target.setAttribute('data-vt-closed-label', label);
        }

        if (inHeading || (node.nextElementSibling && node.nextElementSibling.classList.contains('vt-closed'))) return;
        node.insertAdjacentElement('afterend', el('span', {
          class: 'vt-ui vt-closed' + (/temporar/i.test(label) ? ' vt-closed-temp' : ''),
          text: label,
        }));
      });
    });
  }

  // ======================================================================
  // 11. HOUSEKEEPING (replaces three small snippets in Webflow)
  // ======================================================================

  // Replaces the jQuery snippet on the Articles and Restaurants templates:
  // each image inside .images gets its alt text written into the element after it.
  function captionsFromAltText() {
    document.querySelectorAll('.images img').forEach((img) => {
      const caption = img.nextElementSibling;
      if (caption && img.hasAttribute('alt')) caption.textContent = img.getAttribute('alt');
    });
    // Replaces the gallery caption code on the Destinations template.
    document.querySelectorAll('.destination-gallery-image').forEach((img) => {
      const holder = img.closest('.w-dyn-item') || img.parentElement;
      const caption = holder && (holder.querySelector('.destination-gallery-caption-div')
        || (holder.parentElement && holder.parentElement.querySelector('.destination-gallery-caption-div')));
      const alt = img.getAttribute('alt') || '';
      if (caption && caption.textContent !== alt) caption.textContent = alt;
    });
  }

  // Replaces the jQuery back-button snippet in Site settings.
  function backButton() {
    document.addEventListener('click', (event) => {
      const link = event.target.closest && event.target.closest('a.back-button');
      if (!link) return;
      event.preventDefault();
      history.back();
    });
  }

  // Any Webflow element can open the saved list or phrase card:
  //   data-vt-open="saved"          data-vt-open="phrase-card" (optional data-vt-lang="ko")
  function openHooks() {
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest && event.target.closest('[data-vt-open]');
      if (!trigger) return;
      event.preventDefault();
      const what = trigger.getAttribute('data-vt-open');
      if (what === 'saved') openDrawer();
      if (what === 'phrase-card') phraseCard.open(trigger.getAttribute('data-vt-lang'));
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && document.querySelector('.vt-overlay, .vt-pop')) overlay.close();
    });
    // Screens release the wake lock when you switch apps; ask again on return.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && document.querySelector('.vt-sign') && navigator.wakeLock) {
        navigator.wakeLock.request('screen').then((lock) => { overlay.wakeLock = lock; }).catch(() => {});
      }
    });
    // Keep every open tab in sync when the saved list changes in another tab.
    window.addEventListener('storage', (event) => {
      if (event.key === CONFIG.storagePrefix + 'saved') saved.changed();
    });
  }

  // ======================================================================
  // 12. STYLES
  // Fonts inherit from your site. Colours are CSS variables you can override
  // in Webflow if you ever want to (e.g. :root { --vt-green: #4a7a06; }).
  // ======================================================================

  function injectStyles() {
    const css = `
:root{--vt-green:#5a8707;--vt-green-soft:#eef5e1;--vt-ink:#1f2a1c;--vt-line:#d9e2d0;--vt-berry:#b83a5b;--vt-berry-soft:#fbe9ef;--vt-sun:#ffe36e;--vt-paper:#fff}
.vt-ui,.vt-ui *{box-sizing:border-box}
.vt-ui{font-family:inherit;-webkit-font-smoothing:antialiased}
.vt-ui svg{width:18px;height:18px;flex:none;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.vt-locked,.vt-locked body{overflow:hidden!important}
.vt-offscreen{position:fixed;left:-9999px;top:0}
.vt-row{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 16px}
.vt-chip{display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border:1px solid var(--vt-line);border-radius:999px;background:var(--vt-paper);color:var(--vt-ink)!important;font:inherit;font-size:13px;font-weight:500;line-height:1.2;cursor:pointer;text-decoration:none!important;transition:background-color .15s,border-color .15s}
.vt-chip svg{width:16px;height:16px}
.vt-chip:hover{border-color:var(--vt-green)}
.vt-save[aria-pressed="true"]{background:var(--vt-berry-soft);border-color:var(--vt-berry);color:var(--vt-berry)!important}
.vt-save[aria-pressed="true"] svg{fill:currentColor}
.vt-save-compact{display:inline-grid;place-items:center;width:34px;height:34px;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.92);color:var(--vt-ink);cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.15)}
.vt-save-compact[aria-pressed="true"]{background:#fff;color:var(--vt-berry)}
.vt-ui :focus-visible,.vt-price:focus-visible{outline:2px solid var(--vt-green);outline-offset:2px}
.vt-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border:0;border-radius:999px;background:var(--vt-green);color:#fff!important;font:inherit;font-size:14px;font-weight:600;cursor:pointer;text-decoration:none!important}
.vt-btn-ghost{background:transparent;color:var(--vt-green)!important;box-shadow:inset 0 0 0 1.5px var(--vt-green)}
.vt-link{background:none;border:0;padding:4px 2px;font:inherit;font-size:13px;color:var(--vt-ink);text-decoration:underline;text-underline-offset:3px;cursor:pointer;opacity:.8}
.vt-push{margin-left:auto}
.vt-dock{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:900;display:flex;flex-direction:column;align-items:flex-end;gap:10px}
.vt-dock[hidden],.vt-drawer-foot[hidden]{display:none}
.vt-fab{display:inline-flex;align-items:center;gap:8px;padding:12px 16px;border:0;border-radius:999px;background:var(--vt-ink);color:#fff;font:inherit;font-size:14px;font-weight:600;box-shadow:0 6px 20px rgba(20,40,28,.28);cursor:pointer}
.vt-fab-phrase{background:var(--vt-sun);color:var(--vt-ink)}
.vt-count{display:inline-grid;place-items:center;min-width:20px;height:20px;padding:0 6px;border-radius:10px;background:var(--vt-berry);color:#fff;font-size:12px}
.vt-scrim{position:fixed;inset:0;z-index:2147483000;background:rgba(20,32,24,.45)}
.vt-drawer{position:fixed;top:0;right:0;bottom:0;z-index:2147483001;display:flex;flex-direction:column;width:min(420px,100%);background:var(--vt-paper);color:var(--vt-ink);box-shadow:-10px 0 40px rgba(0,0,0,.18)}
@media (max-width:600px){.vt-drawer{top:auto;width:100%;height:85vh;border-radius:20px 20px 0 0}}
.vt-drawer-head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid var(--vt-line)}
.vt-drawer-title{font-size:19px;font-weight:700}
.vt-drawer-list{flex:1;overflow:auto;padding:4px 20px 20px}
.vt-group{margin:20px 0 4px;font-size:13px;font-weight:700;color:var(--vt-green)}
.vt-item{padding:12px 0;border-bottom:1px solid var(--vt-line)}
.vt-item-name{font-size:16px;font-weight:600;color:var(--vt-ink)!important;text-decoration:none}
.vt-item-meta{margin-top:2px;font-size:12px;opacity:.65}
.vt-item-actions{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:10px}
.vt-drawer-foot{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:14px 20px calc(14px + env(safe-area-inset-bottom,0px));border-top:1px solid var(--vt-line)}
.vt-empty{padding:40px 8px;text-align:center;font-size:15px;line-height:1.5;opacity:.85}
.vt-empty-title{font-size:17px;font-weight:700;margin:0 0 6px}
.vt-sign{position:fixed;inset:0;z-index:2147483001;display:flex;flex-direction:column;overflow:auto;background:var(--vt-sun);color:var(--vt-ink);padding:calc(14px + env(safe-area-inset-top,0px)) 20px calc(20px + env(safe-area-inset-bottom,0px))}
.vt-sign-top{display:flex;align-items:center;justify-content:space-between;gap:12px}
.vt-sign-brand{display:flex;align-items:center;gap:10px;min-width:0}
.vt-sign-logo{display:inline-grid;place-items:center;flex:none;width:42px;height:42px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.12)}
.vt-sign-logo img{display:block;width:28px;height:28px;object-fit:contain}
.vt-sign-name{font-size:15px;font-weight:700;line-height:1.2}
.vt-sign-controls{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px}
.vt-sign-lang{padding:8px 10px;border:2px solid var(--vt-ink);border-radius:999px;background:transparent;color:var(--vt-ink);font:inherit;font-size:14px;font-weight:600}
.vt-sign-hint{font-size:13px;opacity:.7;text-align:center}
.vt-sign-done{padding:9px 18px;border:0;border-radius:999px;background:var(--vt-ink);color:var(--vt-sun);font:inherit;font-weight:700;cursor:pointer}
.vt-sign-body{flex:1;display:flex;flex-direction:column;justify-content:center;width:100%;max-width:900px;margin:0 auto;padding:24px 0}
.vt-sign-text{margin:0 0 22px;font-size:clamp(28px,7.2vw,64px);line-height:1.4;font-weight:800;white-space:pre-line}
.vt-sign-en{margin:0;max-width:60ch;font-size:clamp(15px,3.6vw,20px);line-height:1.5;opacity:.75}
.vt-sign-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;width:100%;max-width:720px;margin:0 auto}
.vt-sign-tab{padding:10px 8px;border:2px solid var(--vt-ink);border-radius:999px;background:transparent;color:var(--vt-ink);font:inherit;font-size:14px;font-weight:600;line-height:1.2;cursor:pointer}
.vt-sign-tab[aria-selected="true"]{background:var(--vt-ink);color:var(--vt-sun)}
.vt-sign-note{max-width:60ch;margin:14px auto 0;font-size:13px;line-height:1.45;text-align:center;opacity:.8}
@media (max-width:520px){.vt-sign-hint{display:none}.vt-sign-name{font-size:13px}.vt-sign-tab{font-size:13px;padding:9px 6px}}
.vt-price{display:inline;margin:0 .2em;padding:1px 8px;border:0;border-radius:999px;background:var(--vt-green-soft);color:var(--vt-green);font:inherit;font-size:.85em;font-weight:600;white-space:nowrap;cursor:pointer;vertical-align:baseline}
.vt-price[hidden]{display:none}
.vt-pop{position:absolute;z-index:2147483001;width:260px;padding:14px;border-radius:14px;background:var(--vt-paper);color:var(--vt-ink);box-shadow:0 12px 36px rgba(20,40,28,.22);font-size:14px}
.vt-pop-label{display:block;font-weight:600;margin-bottom:6px}
.vt-pop select{width:100%;padding:8px;border:1px solid var(--vt-line);border-radius:8px;font:inherit;background:#fff;color:var(--vt-ink)}
.vt-pop-note{margin:8px 0 0;font-size:12px;line-height:1.4;opacity:.75}
.vt-pop-note a{color:inherit}
.vt-closed{display:inline-block;margin:0 .35em;padding:1px 8px;border-radius:999px;background:#fcebeb;color:#7a1616;font-size:.8em;font-weight:600;line-height:1.5;vertical-align:baseline;white-space:nowrap}
.vt-closed-temp{background:#faeeda;color:#633806}
.vt-item .vt-closed{margin-left:8px;font-size:11px}
[data-vt-closed-label]::after{content:attr(data-vt-closed-label);font-family:var(--vt-text-font,sans-serif);display:inline-block;margin-left:.5em;padding:3px 10px;border-radius:999px;background:#fcebeb;color:#7a1616;font-size:14px;font-weight:600;letter-spacing:0;line-height:1.4;text-transform:none;vertical-align:middle;white-space:nowrap}
[data-vt-closed-label^="Temporarily"]::after{background:#faeeda;color:#633806}
.vt-toast{position:fixed;left:50%;bottom:calc(96px + env(safe-area-inset-bottom,0px));z-index:2147483002;max-width:calc(100% - 32px);padding:10px 18px;border-radius:999px;background:var(--vt-ink);color:#fff;font-size:14px;opacity:0;transform:translate(-50%,12px);transition:opacity .2s,transform .2s;pointer-events:none}
.vt-toast.vt-show{opacity:1;transform:translate(-50%,0)}
@media (prefers-reduced-motion:reduce){.vt-ui,.vt-ui *,.vt-toast{transition:none!important}}
`;
    document.head.appendChild(el('style', { id: 'vt-core-styles', text: css }));
    // Heading badges use the same font as your paragraph text, like the badges next to links.
    const sample = document.querySelector('.w-richtext p') || document.body;
    document.documentElement.style.setProperty('--vt-text-font', getComputedStyle(sample).fontFamily);
  }

  // ======================================================================
  // 13. START-UP
  // ======================================================================

  let context = { type: 'other', destinations: [], destination: null, country: null, countryInfo: null };

  // The public toolbox. guide.js and destination.js use these.
  const VT = {
    version: CONFIG.version,
    config: CONFIG,
    get context() { return context; },
    destinations: DESTINATIONS,
    countries: COUNTRIES,
    storage,
    maps,
    vegColor,
    mapsLink,
    mapsLabel,
    saved,
    statusOf,
    closedLabel,
    phraseCard,
    ui: { el, toast, overlay, icons: ICON, dock },
    debug: DEBUG,
  };
  window.VT = VT;

  onReady(() => {
    guard('styles', injectStyles);
    context = guard('context', readContext) || context;
    guard('hooks', openHooks);
    if (CONFIG.features.backButton) guard('back button', backButton);
    if (CONFIG.features.captions) guard('captions', captionsFromAltText);
    if (CONFIG.features.closedBadges) guard('closed list', readClosedList);
    if (CONFIG.features.savedPlaces && context.type === 'restaurant') guard('restaurant save', restaurantSaveButton);
    guard('dock', dock.build);

    // Let other scripts run now that the toolbox is ready. They register with:
    //   (window.vtReady = window.vtReady || []).push(function (VT) { ... });
    const queued = Array.isArray(window.vtReady) ? window.vtReady : [];
    window.vtReady = { push: (fn) => guard('vtReady callback', () => fn(VT)) };
    queued.forEach((fn) => window.vtReady.push(fn));

    // Work that changes the rich text waits until everything else has loaded.
    onLoaded(() => {
      if (CONFIG.features.prices) guard('prices', prices.run);
      if (CONFIG.features.closedBadges) guard('closed badges', addClosedBadges);
    });
  });
})();
