/*!
 * I Travel For Vegan Food: guide.js
 * ------------------------------------------------------------------------
 * Runs on the Articles and Map Guides templates. It needs core.js.
 *
 *   1. Rich text formatting: turns your writing shortcuts into tip boxes and
 *      dividers. Both the old [.tips]...[.tips] codes and the new, simpler
 *      ones work (see docs/writing-guide.md). Replaces the Refokus script.
 *   2. Articles: table of contents and side-by-side image pairs.
 *   3. Map guides: the interactive map that follows the guide as you scroll.
 *      Replaces the old map script and the three GSAP libraries.
 *
 * Load it in Webflow on each template: Page settings > Custom code > Before </body> tag
 *   <script defer src="https://cdn.jsdelivr.net/gh/andyfromhk/i-travel-for-vegan-food@v1.2.0/guide.min.js"></script>
 *
 * Debugging: add ?vtdebug=1 to the page address to see errors in the console.
 */
(() => {
  'use strict';

  if (window.VTGuide) return;
  window.VTGuide = { version: '1.0.0' };

  const DEBUG = /[?&]vtdebug=1/.test(location.search);

  function guard(name, fn) {
    try { return fn(); } catch (e) { if (DEBUG) console.error('[VT guide] ' + name + ' failed:', e); return undefined; }
  }

  // ======================================================================
  // 1. RICH TEXT FORMATTING
  // ======================================================================

  // New shortcut 1: a paragraph containing only --- (or ***) becomes a divider.
  const DIVIDER_TEXT = /^(?:-{3,}|_{3,}|\*{3,}|(?:\* ){2,}\*|—{2,})$/;

  // New shortcut 2: a block quote becomes a tip box. Start it with one of these
  // emoji to choose the icon; with no emoji you get the light bulb.
  const TIP_ICONS = [
    ['💡', 'idea'],
    ['📷', 'camera'], ['📸', 'camera'],
    ['🎫', 'ticket'], ['🎟', 'ticket'], ['🚆', 'ticket'], ['🚄', 'ticket'],
    ['🧭', 'compass'],
    ['🍜', 'food'], ['🍱', 'food'],
    ['🌐', 'website'],
    ['📍', 'location'],
    ['🏨', 'hotel'], ['🛏', 'hotel'],
    ['🍴', 'cutlery'], ['🍽', 'cutlery'],
    ['📖', 'book'], ['📚', 'book'],
    ['💰', 'money'], ['💴', 'money'], ['💵', 'money'],
    ['🏷', 'discount'],
    ['📱', 'phone-heart'],
  ];
  const INVISIBLE = /[\u200B-\u200D\uFEFF\u00A0]/g; // Webflow puts these in empty paragraphs

  function formatRichText() {
    document.querySelectorAll('.w-richtext').forEach((root) => {
      [...root.children].forEach((node) => {
        if (node.tagName === 'P' && DIVIDER_TEXT.test(node.textContent.replace(INVISIBLE, '').trim())) {
          node.innerHTML = '<span class="divider"></span>';
        } else if (node.tagName === 'BLOCKQUOTE' && !node.classList.contains('instagram-media')) {
          node.replaceWith(tipFromQuote(node));
        }
      });
      applyShortcodes(root);
    });
  }

  // Builds exactly the same HTML the old [.tips][.icon-x][.icon-x][.div]...[.div][.tips]
  // code produced, so your existing Webflow styles apply unchanged.
  function tipFromQuote(quote) {
    let icon = 'idea';
    const first = firstTextNode(quote);
    if (first) {
      const text = first.nodeValue.replace(/^[\s\u200B-\u200D\uFEFF]+/, '');
      const match = TIP_ICONS.find(([emoji]) => text.startsWith(emoji));
      if (match) {
        icon = match[1];
        first.nodeValue = text.slice(match[0].length).replace(/^\uFE0F/, '').replace(/^\s+/, '');
      }
    }
    const p = document.createElement('p');
    p.innerHTML = '<span class="tips"><span class="icon-' + icon + '"></span><span class="div"></span></span>';
    const body = p.querySelector('.div');
    while (quote.firstChild) body.appendChild(quote.firstChild);
    return p;
  }

  function firstTextNode(node) {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.nodeValue.replace(INVISIBLE, '').trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP),
    });
    return walker.nextNode();
  }

  // The old codes, handled the same way the Refokus script did:
  //   [.name]text[.name]      -> <span class="name">text</span>
  //   [#name]text[#name]      -> <span id="name">text</span>
  //   [$attr=value]text[$attr] -> <span attr="value">text</span>
  const SHORTCODES = [
    { regex: /\[\.([\w-]+)\](.*?)\[\.\1\]/g, html: '<span class="$1">$2</span>' },
    { regex: /\[#([\w-]+)\](.*?)\[#\1\]/g, html: '<span id="$1">$2</span>' },
    { regex: /\[\$([^=\]]+)(=([^\]]+))?\](.*?)\[\$\1\]/g, html: '<span $1="$3">$4</span>' },
  ];

  function applyShortcodes(root) {
    root.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, blockquote, figcaption').forEach((node) => {
      const original = node.innerHTML;
      if (original.indexOf('[') === -1) return;
      let html = original;
      SHORTCODES.forEach(({ regex, html: replacement }) => {
        for (let i = 0; i < 20; i++) { // repeat for nested codes, like the tip box inside [.tips]
          regex.lastIndex = 0;
          if (!regex.test(html)) break;
          regex.lastIndex = 0;
          html = html.replace(regex, replacement);
        }
      });
      if (html !== original) node.innerHTML = html;
    });
  }

  // ======================================================================
  // 2. ARTICLES: table of contents and image pairs
  // ======================================================================

  // Builds the table of contents inside #toc from the headings inside #content.
  // Heading levels: data-vt-toc on #toc if you ever add it, otherwise "h2,h3"
  // (every article currently uses h2,h3).
  function buildTableOfContents() {
    const toc = document.getElementById('toc');
    const content = document.getElementById('content');
    if (!toc || !content || toc.querySelector('.tocitem')) return;

    const levels = (toc.getAttribute('data-vt-toc') || 'h2,h3').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean);
    const used = new Set();
    const links = new Map();

    content.querySelectorAll(levels.join(',')).forEach((heading) => {
      // Same id recipe as the old script, so links people have shared (…#where-to-stay) keep working.
      const base = heading.innerHTML.replace(/\s+/g, '-').replace(/[°&/\\#,+()$~%.'":;*?<>{}]/g, '').toLowerCase();
      if (!base) return;
      let id = base;
      for (let n = 2; used.has(id); n++) id = base + '-' + n; // only repeated headings get -2, -3…
      used.add(id);
      heading.id = id;

      const item = document.createElement('a');
      item.className = 'tocitem toc-' + heading.tagName.toLowerCase();
      item.href = '#' + id;
      item.innerHTML = headingHtml(heading);
      toc.appendChild(item);
      links.set(heading, item);
    });

    // Highlights the section you're reading (only inside the table of contents).
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        toc.querySelectorAll('.tocitem.active').forEach((a) => a.classList.remove('active'));
        const link = links.get(entry.target);
        if (link) link.classList.add('active');
      });
    }, { rootMargin: '0px 0px -75% 0px' });
    links.forEach((_, heading) => observer.observe(heading));
  }

  // The heading's formatting (e.g. italics) without links or ids inside it.
  function headingHtml(heading) {
    const copy = heading.cloneNode(true);
    copy.querySelectorAll('a').forEach((a) => a.replaceWith(...a.childNodes));
    copy.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
    return copy.innerHTML;
  }

  // Two centred images in a row are shown side by side (same as the old script).
  function pairImages() {
    const figures = [...document.querySelectorAll('.w-richtext-align-center')];
    for (let i = 0; i < figures.length; i++) {
      const current = figures[i];
      const next = figures[i + 1];
      if (!next || current.nextElementSibling !== next || !current.querySelector('img') || !next.querySelector('img')) continue;

      const wrapper = document.createElement('div');
      wrapper.className = 'vt-image-pair';
      wrapper.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;gap:10px;width:100%';
      current.parentNode.insertBefore(wrapper, current);
      [current, next].forEach((figure) => {
        figure.style.flex = '1 1 0%';
        figure.style.minWidth = '0';
        const img = figure.querySelector('img');
        img.style.width = '100%';
        img.style.height = 'auto';
        img.style.display = 'block';
        wrapper.appendChild(figure);
      });
      wrapper.querySelectorAll('figcaption').forEach((caption) => {
        caption.style.fontSize = '0.8em';
        caption.style.textAlign = 'center';
      });
      i++;
    }
  }

  // ======================================================================
  // 3. MAP GUIDES
  // The map follows the guide: as each place's heading reaches the "reading
  // band" near the top of the screen, its marker lights up and the map glides
  // to it. Route and end-of-day blocks do the same in a band mid-screen.
  // ======================================================================

  const MAP = {
    startZoom: 13,
    activeZoom: 14,              // street level when a place becomes active
    panMs: 400,                  // map glide duration
    scrollMs: 600,               // scrolling to a place after tapping its marker
    dayScrollMs: 1000,           // scrolling with the previous/next day buttons
    headingBand: [20, 40],       // % from the top: a heading here is the current place
    blockBand: [40, 60],         // % from the top: route / end-of-day blocks here are shown
    mobileBreakpoint: 768,
    mobileScroller: '.article-div',
    mobileCenterOffsetPx: 20,
    scrollOffsetDesktop: 72,
    scrollOffsetMobileRatio: 0.1,
    scrollOffsetMobileFallback: 60,
    curveColor: '#5a8707',
    curveWeight: 4,
    curveOpacity: 0.7,
    nonFoodColor: '#888888',
    overlayFadeMs: 500,
    overlayShowDelayMs: 50,
    endOfDayDelayMs: 100,
    routeLabelDelayMs: 50,
    routeClearDelayMs: 100,
    introText: 'Scroll the guide to explore the map',
    endOfDayText: 'End of Day',
    restaurantIcon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M16 6v6c0 1.1.9 2 2 2h1v7c0 .55.45 1 1 1s1-.45 1-1V3.13c0-.65-.61-1.13-1.24-.98C17.6 2.68 16 4.51 16 6m-5 3H9V3c0-.55-.45-1-1-1s-1 .45-1 1v6H5V3c0-.55-.45-1-1-1s-1 .45-1 1v6c0 2.21 1.79 4 4 4v8c0 .55.45 1 1 1s1-.45 1-1v-8c2.21 0 4-1.79 4-4V3c0-.55-.45-1-1-1s-1 .45-1 1z"></path></svg>',
    sightIcon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"><path fill="white" d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5s5 2.24 5 5s-2.24 5-5 5"></path></svg>',
  };

  const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2); // same curve as GSAP's power2.inOut

  // Runs step(progress 0→1) on every screen frame for `ms`, then done().
  function animate(ms, step, done) {
    let frame = 0;
    if (!ms || reduceMotion()) { step(1); if (done) done(); return () => {}; }
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / ms);
      step(ease(t));
      if (t < 1) frame = requestAnimationFrame(tick);
      else if (done) done();
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }

  // Reads the places from the guide text. Every h2/h3 is a place (so days line up),
  // and the embed after it can give its coordinates, veg type, price and district,
  // plus a route block or an end-of-day block.
  function readPlaces(text, routing) {
    const places = [];
    let place = null;
    [...text.children].forEach((node) => {
      if (node.matches('h2, h3')) {
        place = {
          index: places.length, heading: node, title: node.textContent.trim(),
          lat: NaN, lng: NaN,
          vegType: node.dataset.vegType, priceRange: node.dataset.priceRange, district: node.dataset.district,
          hasTrigger: false, routeEl: null, route: null, endEl: null, isEndOfDay: false,
          marker: null, day: 1,
        };
        places.push(place);
        return;
      }
      if (!place || !node.classList.contains('w-embed')) return;

      const trigger = node.querySelector('.location-trigger');
      if (trigger) {
        const d = trigger.dataset;
        place.vegType = d.vegType ?? place.vegType;
        place.priceRange = d.priceRange ?? place.priceRange;
        place.district = d.district ?? place.district;
        const lat = parseFloat(d.lat);
        const lng = parseFloat(d.lng);
        if (isNaN(place.lat) && !isNaN(lat) && !isNaN(lng)) { place.lat = lat; place.lng = lng; place.hasTrigger = true; }
      }
      const route = node.querySelector('.route-info');
      if (routing && route && place.hasTrigger && !place.routeEl && !place.endEl) {
        place.routeEl = node;
        place.route = { mode: route.dataset.travelMode ?? 'UNKNOWN', text: route.dataset.travelInfo ?? '' };
      }
      const end = node.querySelector('.end-of-day');
      if (routing && end && place.hasTrigger && !place.routeEl && !place.endEl) {
        place.endEl = node;
        place.isEndOfDay = true;
        place.endText = end.textContent.trim() || MAP.endOfDayText;
      }
    });

    let day = 1;
    places.forEach((p) => {
      p.day = day;
      if (p.isEndOfDay) day++;
      if (!isNaN(p.lat) && !(p.vegType || '').trim()) p.vegType = 'unknown';
    });
    return places;
  }

  const isFood = (p) => !!p.vegType && p.vegType.toLowerCase() !== 'unknown';

  // The small line under each heading: district | veg type | price.
  function addInfoLines(places, VT) {
    places.forEach((p) => {
      const old = p.heading.nextElementSibling;
      if (old && old.classList.contains('location-info-line')) old.remove();
      const parts = [];
      if (isNaN(p.lat) && p.district && p.district.toLowerCase().includes('multiple')) parts.push(['Multiple locations', 'info-district']);
      else if (p.district) parts.push([p.district, 'info-district']);
      if (isFood(p)) parts.push([p.vegType, 'info-veg-type', VT.vegColor(p.vegType)]);
      if (isFood(p) && p.priceRange) parts.push([p.priceRange, 'info-price-range']);
      if (!parts.length) return;
      const line = document.createElement('div');
      line.className = 'location-info-line';
      parts.forEach(([text, className, color]) => {
        const span = document.createElement('span');
        span.className = className;
        span.textContent = text;
        if (color) span.style.color = color;
        line.appendChild(span);
      });
      p.heading.insertAdjacentElement('afterend', line);
    });
  }

  function mapGuide(VT) {
    const els = {
      map: document.getElementById('map'),
      text: document.querySelector('.guide-rich-text'),
      dayBox: document.querySelector('.day-counter-div'),
      day: document.getElementById('day-counter'),
      prev: document.querySelector('.previous-day-button'),
      next: document.querySelector('.next-day-button'),
    };
    const hide = (node) => { if (node) node.style.setProperty('display', 'none', 'important'); };
    if (!els.map || !els.text) { hide(els.dayBox); return; }

    let routing = els.text.dataset.enableRouting === 'true';
    const places = readPlaces(els.text, routing);
    if (!places.length) { hide(els.map); hide(els.dayBox); return; }
    if (routing && !places.some((p) => p.isEndOfDay)) routing = false; // routes need days
    if (!routing) hide(els.dayBox);
    addInfoLines(places, VT);

    const state = {
      map: null, current: -1, day: 1, maxDay: Math.max(1, ...places.map((p) => p.day)),
      isMobile: false, scroller: null, programmatic: false, firstZoomDone: false,
      intro: null, routeLine: null, routeLabel: null, endOfDay: null, shownTooltips: [],
      observers: [], stopPan: () => {},
    };

    // ---------- scrolling ----------
    function readScrollMode() {
      state.scroller = document.querySelector(MAP.mobileScroller);
      const mobile = window.innerWidth < MAP.mobileBreakpoint && !!state.scroller;
      const changed = mobile !== state.isMobile;
      state.isMobile = mobile;
      return changed;
    }
    const scrollArea = () => (state.isMobile ? state.scroller : null); // null = the whole window
    const scrollOffset = () => (state.isMobile
      ? (state.scroller ? state.scroller.clientHeight * MAP.scrollOffsetMobileRatio : MAP.scrollOffsetMobileFallback)
      : MAP.scrollOffsetDesktop);

    function scrollToHeading(heading, ms) {
      const area = scrollArea();
      const from = area ? area.scrollTop : window.scrollY;
      const top = area
        ? heading.getBoundingClientRect().top - area.getBoundingClientRect().top + area.scrollTop
        : heading.getBoundingClientRect().top + window.scrollY;
      const to = Math.max(0, top - scrollOffset());
      state.programmatic = true;
      animate(ms, (k) => {
        const y = from + (to - from) * k;
        if (area) area.scrollTo({ top: y, behavior: 'instant' });
        else window.scrollTo({ top: y, behavior: 'instant' });
      }, () => setTimeout(() => { state.programmatic = false; }, 50));
    }

    // ---------- map overlays ----------
    function overlayMarker(position, text, className, zIndex, delay) {
      const content = document.createElement('div');
      content.className = className;
      content.textContent = text;
      const marker = new google.maps.marker.AdvancedMarkerElement({ position, map: state.map, content, zIndex });
      setTimeout(() => content.classList.add('visible'), delay);
      return marker;
    }
    function fadeOut(marker, ms) {
      if (!marker) return;
      if (marker.content) marker.content.classList.remove('visible');
      setTimeout(() => { marker.map = null; }, ms);
    }
    function clearIntro() { fadeOut(state.intro, MAP.overlayFadeMs); state.intro = null; }
    function clearEndOfDay() { fadeOut(state.endOfDay, MAP.overlayFadeMs); state.endOfDay = null; }
    function clearRoute() {
      if (state.routeLine) { state.routeLine.setMap(null); state.routeLine = null; }
      fadeOut(state.routeLabel, MAP.routeClearDelayMs);
      state.routeLabel = null;
      hideRouteTooltips();
    }
    function showRouteTooltips(indexes) {
      hideRouteTooltips();
      state.shownTooltips = indexes;
      indexes.forEach((i) => {
        const marker = places[i] && places[i].marker;
        if (!marker) return;
        marker.content.classList.add('show-route-tooltip');
        if (i !== state.current) marker.zIndex = 998;
      });
    }
    function hideRouteTooltips() {
      state.shownTooltips.forEach((i) => {
        const marker = places[i] && places[i].marker;
        if (!marker) return;
        marker.content.classList.remove('show-route-tooltip');
        if (i !== state.current) marker.zIndex = 5;
      });
      state.shownTooltips = [];
    }

    // ---------- the current place ----------
    function activate(index, force) {
      clearIntro(); // the intro message goes as soon as the first place is reached
      clearRoute();
      clearEndOfDay();
      if (index === state.current && !force && places[index] && places[index].marker) return;

      const previous = places[state.current];
      if (previous) {
        if (previous.marker) { previous.marker.content.classList.remove('active'); previous.marker.zIndex = 5; }
        previous.heading.classList.remove('active-heading');
      }
      state.current = index;
      const place = places[index];
      if (!place) { state.stopPan(); return; }
      place.heading.classList.add('active-heading');
      if (!place.marker || !state.map) { state.stopPan(); return; }

      place.marker.content.classList.add('active');
      place.marker.zIndex = 999;

      // Street level, unless the reader has zoomed in further themselves.
      const first = !state.firstZoomDone;
      const zoom = !first && state.map.getZoom() > MAP.activeZoom ? state.map.getZoom() : MAP.activeZoom;
      let target = { lat: place.lat, lng: place.lng };
      if (state.isMobile) target = nudgeForMobile(target, zoom);
      glideTo(target, () => {
        if (state.map.getZoom() !== zoom) state.map.setZoom(zoom);
        state.firstZoomDone = true;
      });
    }

    // On phones the marker sits slightly below centre, clear of the tooltip.
    function nudgeForMobile(point, zoom) {
      const projection = state.map.getProjection();
      if (!projection) return point;
      const world = projection.fromLatLngToPoint(new google.maps.LatLng(point.lat, point.lng));
      const shifted = projection.fromPointToLatLng(new google.maps.Point(world.x, world.y - MAP.mobileCenterOffsetPx / Math.pow(2, zoom)));
      return shifted ? { lat: shifted.lat(), lng: shifted.lng() } : point;
    }

    function glideTo(target, done) {
      state.stopPan();
      const start = state.map.getCenter();
      const from = start ? { lat: start.lat(), lng: start.lng() } : target;
      state.stopPan = animate(MAP.panMs, (k) => {
        state.map.setCenter({ lat: from.lat + (target.lat - from.lat) * k, lng: from.lng + (target.lng - from.lng) * k });
      }, done);
    }

    function fitBounds(points, padding) {
      const bounds = new google.maps.LatLngBounds();
      points.forEach((p) => bounds.extend(p));
      if (!bounds.isEmpty()) state.map.fitBounds(bounds, { top: padding, bottom: padding, left: padding, right: padding });
    }

    // ---------- routes and end of day ----------
    function curve(a, b) {
      const points = [];
      const midLat = (a.lat() + b.lat()) / 2;
      const midLng = (a.lng() + b.lng()) / 2;
      const dx = b.lng() - a.lng();
      const dy = b.lat() - a.lat();
      const length = Math.sqrt(dx * dx + dy * dy);
      const bend = length * 0.1;
      const perpX = length > 1e-6 ? -dy / length : 0;
      const perpY = length > 1e-6 ? dx / length : 0;
      const controlLat = midLat + perpY * bend;
      const controlLng = midLng + perpX * bend;
      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        const u = 1 - t;
        const lat = u * u * a.lat() + 2 * u * t * controlLat + t * t * b.lat();
        const lng = u * u * a.lng() + 2 * u * t * controlLng + t * t * b.lng();
        if (!isNaN(lat) && !isNaN(lng)) points.push(new google.maps.LatLng(lat, lng));
      }
      return points.length >= 2 ? points : [a, b];
    }

    function showRoute(index) {
      if (!state.routing || index < 0 || index + 1 >= places.length) return;
      const from = places[index];
      const to = places[index + 1];
      if (!from || from.isEndOfDay || !from.route || !to || !from.marker || !to.marker || !state.map) { clearRoute(); return; }
      clearRoute();
      clearEndOfDay();

      const a = new google.maps.LatLng(from.lat, from.lng);
      const b = new google.maps.LatLng(to.lat, to.lng);
      const path = curve(a, b);
      const arrow = {
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3,
        strokeColor: MAP.curveColor, fillColor: MAP.curveColor, fillOpacity: 1, strokeWeight: 0.5,
      };
      state.routeLine = new google.maps.Polyline({
        path, geodesic: true, map: state.map, zIndex: 1,
        strokeColor: MAP.curveColor, strokeOpacity: MAP.curveOpacity, strokeWeight: MAP.curveWeight,
        icons: [{ icon: arrow, offset: '25%', repeat: '100px' }],
      });
      const middle = path[Math.floor(path.length / 2)];
      if (middle) state.routeLabel = overlayMarker(middle, from.route.text, 'route-tooltip-marker-content', 1000, MAP.routeLabelDelayMs);
      showRouteTooltips([index, index + 1]);
      fitBounds([a, b], state.isMobile ? 50 : 120);
    }

    function showEndOfDay(text) {
      clearRoute();
      clearEndOfDay();
      activate(-1);
      setTimeout(() => {
        if (!state.map || state.endOfDay || state.programmatic) return;
        const centre = state.map.getCenter();
        if (centre) state.endOfDay = overlayMarker(centre, text, 'end-of-day-overlay-content', 1001, MAP.overlayShowDelayMs);
      }, MAP.endOfDayDelayMs);
    }

    // ---------- days ----------
    function setDay(day) {
      if (!els.day || !state.routing) return;
      const value = Math.max(1, Math.min(day, state.maxDay));
      if (value !== state.day || !els.day.textContent) {
        state.day = value;
        els.day.textContent = value;
      }
      updateDayButtons();
    }
    function updateDayButtons() {
      if (!els.prev || !els.next) return;
      if (!state.routing || state.maxDay <= 1) {
        [els.prev, els.next].forEach((b) => { b.classList.add('day-button-disabled'); b.disabled = true; });
        return;
      }
      const atStart = state.day <= 1;
      const atEnd = state.day >= state.maxDay;
      els.prev.disabled = atStart;
      els.next.disabled = atEnd;
      els.prev.classList.toggle('day-button-disabled', atStart);
      els.next.classList.toggle('day-button-disabled', atEnd);
    }
    function goToDay(step) {
      if (!state.routing || state.programmatic) return;
      const target = state.day + step;
      if (target < 1 || target > state.maxDay) return;
      const index = places.findIndex((p) => p.day === target);
      if (index === -1) return;
      activate(index, false);
      setDay(target);
      scrollToHeading(places[index].heading, MAP.dayScrollMs);
    }

    // ---------- watching the scroll ----------
    // Each observer watches one "band" of the screen and reports when an
    // element enters or leaves it. We act only on changes, and not while the
    // page is scrolling itself (after a marker or day button tap).
    function watch() {
      state.observers.forEach((o) => o.disconnect());
      state.observers = [];
      const inBand = new Map();
      const margin = ([top, bottom]) => '-' + top + '% 0px -' + (100 - bottom) + '% 0px';
      const passedUpward = (entry) => entry.rootBounds && entry.boundingClientRect.bottom <= entry.rootBounds.top + 1;

      const observe = (band, elements, handle) => {
        if (!elements.length) return;
        const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            const was = inBand.get(entry.target) || false;
            inBand.set(entry.target, entry.isIntersecting);
            if (was === entry.isIntersecting || state.programmatic) return;
            guard('scroll step', () => handle(entry));
          });
        }, { root: scrollArea(), rootMargin: margin(band) });
        elements.forEach((element) => observer.observe(element));
        state.observers.push(observer);
      };

      const byElement = new Map();
      places.forEach((p) => {
        byElement.set(p.heading, p);
        if (p.routeEl) byElement.set(p.routeEl, p);
        if (p.endEl) byElement.set(p.endEl, p);
      });

      // Headings: entering the band makes the place current.
      observe(MAP.headingBand, places.map((p) => p.heading), (entry) => {
        if (!entry.isIntersecting) return;
        const p = byElement.get(entry.target);
        activate(p.index);
        setDay(p.day);
      });

      if (!state.routing) return;

      // Route blocks: show the route while in the band. Scrolling back up past
      // one returns to the place before it.
      const routes = places.filter((p, i) => p.routeEl && !p.isEndOfDay && i + 1 < places.length && !isNaN(p.lat) && !isNaN(places[i + 1].lat));
      observe(MAP.blockBand, routes.map((p) => p.routeEl), (entry) => {
        const p = byElement.get(entry.target);
        if (entry.isIntersecting) { showRoute(p.index); return; }
        clearRoute();
        if (!passedUpward(entry)) { activate(p.index); setDay(p.day); }
      });

      // End-of-day blocks: show the overlay while in the band, then move the day on.
      const ends = places.filter((p) => p.endEl && p.isEndOfDay);
      observe(MAP.blockBand, ends.map((p) => p.endEl), (entry) => {
        const p = byElement.get(entry.target);
        if (entry.isIntersecting) { showEndOfDay(p.endText); setDay(p.day); return; }
        clearEndOfDay();
        if (!passedUpward(entry)) { activate(p.index); setDay(p.day); return; }
        const next = places[p.index + 1];
        setDay(next ? next.day : p.day + 1);
      });
    }

    // ---------- markers ----------
    function tooltipFor(p) {
      const tooltip = document.createElement('div');
      tooltip.className = 'marker-tooltip';
      if (!(state.routing && state.isMobile)) { // phones on route guides show the name only
        const row = document.createElement('div');
        row.className = 'horizontal-flex';
        if (isFood(p)) {
          const pill = document.createElement('div');
          pill.className = 'veg-type-pill';
          pill.style.backgroundColor = VT.vegColor(p.vegType);
          pill.textContent = p.vegType;
          row.appendChild(pill);
        }
        if (p.priceRange) {
          const price = document.createElement('div');
          price.className = 'paragraph listing-info';
          price.textContent = p.priceRange;
          row.appendChild(price);
        }
        if (row.hasChildNodes()) tooltip.appendChild(row);
      }
      const title = document.createElement('div');
      title.className = 'listing-title';
      title.textContent = p.title;
      tooltip.appendChild(title);
      return tooltip;
    }

    function addMarkers() {
      places.forEach((p) => {
        if (isNaN(p.lat)) return;
        const content = document.createElement('div');
        content.className = 'map-marker';
        content.style.backgroundColor = isFood(p) ? VT.vegColor(p.vegType) : MAP.nonFoodColor;
        content.dataset.locationIndex = p.index;
        const icon = document.createElement('div');
        icon.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);line-height:0';
        icon.innerHTML = isFood(p) ? MAP.restaurantIcon : MAP.sightIcon;
        content.appendChild(icon);
        content.appendChild(tooltipFor(p));

        p.marker = new google.maps.marker.AdvancedMarkerElement({
          position: { lat: p.lat, lng: p.lng }, map: state.map, title: p.title, content, zIndex: 5,
        });
        p.marker.addListener('gmp-click', () => {
          if (state.programmatic) return;
          activate(p.index, true);
          setDay(p.day);
          scrollToHeading(p.heading, MAP.scrollMs);
        });
      });
    }

    // ---------- start ----------
    readScrollMode();
    state.routing = routing;

    const start = () => {
      setDay(1);
      watch();
      if (routing && els.prev && els.next) {
        els.prev.addEventListener('click', () => goToDay(-1));
        els.next.addEventListener('click', () => goToDay(1));
        updateDayButtons();
      } else {
        hide(els.dayBox);
      }
      let timer = 0;
      window.addEventListener('resize', () => {
        clearTimeout(timer);
        timer = setTimeout(() => { if (readScrollMode()) watch(); }, 200);
      });
    };

    const firstWithCoords = places.find((p) => !isNaN(p.lat));
    if (!firstWithCoords) { hide(els.map); start(); return; }

    VT.maps.load()
      .then(() => Promise.all([google.maps.importLibrary('maps'), google.maps.importLibrary('marker')]))
      .then(([{ Map }]) => {
        const centre = { lat: firstWithCoords.lat, lng: firstWithCoords.lng };
        state.map = new Map(els.map, {
          center: centre, zoom: MAP.startZoom, disableDefaultUI: true,
          gestureHandling: 'greedy', mapId: VT.maps.mapId, clickableIcons: false,
        });
        addMarkers();
        state.intro = overlayMarker(centre, MAP.introText, 'end-of-day-overlay-content', 1002, MAP.overlayShowDelayMs);
        start();
      })
      .catch((e) => { if (DEBUG) console.error('[VT guide] map failed to load:', e); start(); });
  }

  // ======================================================================
  // 4. STYLES for the things this script creates
  // Rules start with #map or .guide-rich-text so they win over any older copies
  // of the same rules still in Webflow's custom code.
  // ======================================================================

  function injectStyles() {
    const css = `
#map .map-marker{position:relative;width:25px;height:25px;border:2px solid #fff;border-radius:50%;cursor:pointer;transform:translate(0,50%);transition:transform .2s ease-in-out,box-shadow .2s ease-in-out;box-shadow:0 1px 3px rgba(0,0,0,.3)}
#map .map-marker.active{box-shadow:0 3px 6px rgba(0,0,0,.5)}
#map .marker-tooltip{position:absolute;bottom:100%;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;width:max-content;max-width:none;margin-bottom:3px;padding:.5rem 1rem;background:#fff;border:1.5px solid #e3e3e3;border-radius:10px;text-align:center;pointer-events:none;opacity:0;visibility:hidden;transition:opacity .2s ease,visibility .2s ease}
#map .map-marker:hover .marker-tooltip,#map .map-marker.active .marker-tooltip,#map .map-marker.show-route-tooltip .marker-tooltip{opacity:1;visibility:visible;pointer-events:auto}
#map .marker-tooltip .horizontal-flex{display:flex;flex-wrap:nowrap;gap:.5rem;justify-content:center;align-items:center;margin:0 0 .25rem}
#map .marker-tooltip .veg-type-pill{flex:none;white-space:nowrap;padding:.1rem .4rem;border-radius:4px;color:#fff;font-size:.575rem;line-height:1.2;letter-spacing:.1ch}
#map .marker-tooltip .listing-info{flex:none;white-space:nowrap;margin:0;color:#555;font-size:.8rem}
#map .marker-tooltip .listing-title{max-width:190px;color:#000;font-family:'Montserrat',sans-serif;font-size:.875rem;font-weight:600;letter-spacing:.05ch}
#map .route-tooltip-marker-content{position:absolute;z-index:1000;width:180px;padding:.375rem .75rem;transform:translate(-50%,calc(-100% - 8px));background:#fff;border:2px solid #5a8707;border-radius:6px;color:#000;font-family:'Montserrat',sans-serif;font-size:.875rem;font-weight:600;letter-spacing:.05ch;text-align:center;white-space:normal;pointer-events:none;opacity:0;visibility:hidden;transition:opacity .3s ease,visibility .3s ease}
#map .end-of-day-overlay-content{position:absolute;z-index:1000;padding:.75rem 1.25rem;transform:translate(-50%,-50%);background:#fff;border:2px solid #5a8707;border-radius:8px;color:#000;font-family:'Montserrat',sans-serif;font-size:.875rem;font-weight:600;text-align:center;white-space:nowrap;pointer-events:none;opacity:0;visibility:hidden;transition:opacity .5s ease,visibility .5s ease}
#map .route-tooltip-marker-content.visible,#map .end-of-day-overlay-content.visible{opacity:1;visibility:visible}
@media screen and (max-width:767px){
#map .marker-tooltip{padding:.25rem .5rem}
#map .marker-tooltip .listing-title{max-width:180px;font-size:.75rem}
#map .route-tooltip-marker-content{max-width:150px;padding:.25rem .5rem;font-size:.75rem}
}
.guide-rich-text .location-info-line{display:flex;flex-wrap:wrap;align-items:center;gap:0 .5rem;margin:.25rem 0 1rem;font-size:.825rem}
.guide-rich-text .location-info-line .info-veg-type{font-weight:600}
.guide-rich-text .location-info-line .info-price-range{color:#8f8f8f}
.guide-rich-text .location-info-line .info-district{color:#555;font-weight:600;font-style:italic}
.guide-rich-text .location-info-line span:not(:last-child)::after{content:"|";display:inline-block;margin-left:.5rem;color:#555;font-weight:400;font-style:normal}
.day-button-disabled{background-color:#e0e0e0;color:#a0a0a0;cursor:not-allowed;opacity:.7}
`;
    const style = document.createElement('style');
    style.id = 'vt-guide-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ======================================================================
  // 5. START-UP
  // ======================================================================

  function start() {
    guard('rich text', formatRichText);
    if (/^\/articles\//.test(location.pathname)) {
      guard('table of contents', buildTableOfContents);
      guard('image pairs', pairImages);
    }
    if (document.getElementById('map') && document.querySelector('.guide-rich-text')) {
      guard('styles', injectStyles);
      // Wait for core.js, which provides the Maps loader and veg-type colours.
      (window.vtReady = window.vtReady || []).push((VT) => guard('map guide', () => mapGuide(VT)));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
