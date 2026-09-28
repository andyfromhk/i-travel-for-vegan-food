/*!
 * I Travel For Vegan Food: destination.js
 * ------------------------------------------------------------------------
 * Runs on the Destinations template. It needs core.js.
 *
 *   1. The fullscreen restaurant map, rebuilt from the old script with the
 *      same behaviour: open/close, coloured markers, tooltips, tapping a
 *      marker highlights its card, the locate icon on a card finds it on the
 *      map, and markers follow your Finsweet filters.
 *   2. Save hearts on every restaurant photo: the map's list, marker tooltips
 *      and the restaurant grid on the page (the same saved list as the rest
 *      of the site), with a small heart on saved markers.
 *   3. Your "Saved" tag (.destination-saved-toggle): show only saved places,
 *      on the list and the map, with a heart and a count.
 *   4. Your "Distance from Me" sort option: sorts the cards by distance from
 *      where you are, with walking times and a blue dot on the map.
 *   5. Tapping a marker's tooltip opens that restaurant's page in a new tab.
 *
 * Load it on the Destinations template: Page settings > Custom code > Before </body> tag
 *   <script defer src="https://cdn.jsdelivr.net/gh/andyfromhk/i-travel-for-vegan-food@v1.6.0/destination.min.js"></script>
 *
 * Debugging: add ?vtdebug=1 to the page address to see errors in the console.
 */
(() => {
  'use strict';

  if (window.VTDestination) return;
  window.VTDestination = { version: '1.1.0' };

  const DEBUG = /[?&]vtdebug=1/.test(location.search);
  function guard(name, fn) {
    try { return fn(); } catch (e) { if (DEBUG) console.error('[VT destination] ' + name + ' failed:', e); return undefined; }
  }

  // Turn any new feature off by setting it to false.
  const FEATURES = {
    saveHearts: true,    // hearts on the map's list and in marker tooltips
    listingHearts: true, // hearts on the restaurant grid on the page
    savedOnly: true,     // your "Saved" tag
    nearMe: true,        // your "Distance from Me" sort option
    tooltipLinks: true,  // tapping a tooltip opens the restaurant page in a new tab
  };

  // Your Webflow class names.
  const SEL = {
    overlay: '.map-fullscreen-overlay',
    nonMap: '.non-map-wrapper',
    open: '.map-fullscreen-open',
    close: '.map-fullscreen-close',
    map: '#map-wrapper',
    list: '.restaurant-list',
    card: '.restaurant-list-item',
    imageArea: '.restaurant-img-wrapper',
    locate: '.locate-map-marker-icon-div',
    multiple: '.multiple-location-div',
    sortTrigger: '[fs-cmssort-element="trigger"]',
    sortLabel: '[fs-cmssort-element="dropdown-label"]',
    // The "Distance from Me" option: data-vt-sort="distance" if you add it, otherwise
    // the dropdown link whose text mentions distance and has no Finsweet sort field.
    distanceOption: '[data-vt-sort="distance"]',
    savedToggle: '.destination-saved-toggle, [data-vt-saved-toggle]',
    // Restaurant cards elsewhere on the page (e.g. the grid under "Open map"):
    // a collection item whose card links to a restaurant page.
    pageCards: '.w-dyn-item > a[href*="/restaurants/"], [data-vt-heart]',
  };

  const MAP = {
    startZoom: 12,
    fitPadding: 50,
    locateZoom: 15,         // zoom used by a card's locate icon
    locateNudgeY: -40,      // then nudges the map so the tooltip fits
    fewMarkers: 3,          // with fewer than this many markers showing…
    fewMarkersMaxZoom: 14,  // …don't zoom in closer than this
    farMetres: 50000,       // "Near me" only sorts when you're within 50 km
  };

  const ICONS = {
    locate: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8"/></svg>',
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
    open: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  };

  const clean = (text) => (text || '').replace(/\s+/g, ' ').trim();
  const hiddenByWebflow = (node) => !!(node && node.closest('.w-condition-invisible'));

  // ======================================================================
  // 1. READING THE CARDS
  // Each card is read as one unit, so a card with a missing field can never
  // shift the names or positions of the cards after it.
  // ======================================================================

  function readCard(card, list, VT) {
    const text = (selector) => clean((card.querySelector(selector) || {}).textContent);
    const link = card.querySelector('a[href*="/restaurants/"]');
    const slugFromLink = link && (link.pathname.match(/^\/restaurants\/([^/?#]+)/) || [])[1];
    const slug = card.id || slugFromLink || null;
    const lat = parseFloat(text('.latitude'));
    const lng = parseFloat(text('.longitude'));
    const multiple = card.querySelector(SEL.multiple);
    const chainMarker = card.querySelector('[data-vt-chain]');
    const chain = (!!multiple && !hiddenByWebflow(multiple)) || (!!chainMarker && !hiddenByWebflow(chainMarker));

    // The grid cell that holds this card (a direct child of the list).
    let item = card;
    while (item.parentElement && item.parentElement !== list) item = item.parentElement;

    const vegType = text('.veg-type');
    return {
      card, item, slug,
      id: slug ? VT.saved.placeId(slug) : null,
      name: text('.listing-title'),
      vegType,
      color: VT.vegColor(vegType),
      priceRange: text('.price-range'),
      lat, lng,
      hasCoords: !isNaN(lat) && !isNaN(lng) && !chain,
      chain,
      // Optional attributes on the card (see the checklist) for exact saved links.
      mapsUrl: card.getAttribute('data-vt-maps') || null,
      address: card.getAttribute('data-vt-address') || null,
      locator: card.getAttribute('data-vt-locator') || null,
      marker: null,
      distance: null,
    };
  }

  function savedItem(p, VT) {
    return {
      id: p.id,
      kind: 'place',
      name: p.name,
      destination: VT.context.destination,
      address: p.chain ? null : p.address,
      lat: p.hasCoords ? p.lat : null,
      lng: p.hasCoords ? p.lng : null,
      mapsUrl: p.chain ? p.locator : p.mapsUrl,
      page: p.slug ? '/restaurants/' + p.slug : null,
      chain: p.chain,
    };
  }

  // ======================================================================
  // 2. THE PAGE
  // ======================================================================

  function destination(VT) {
    const el = VT.ui.el;
    const overlay = document.querySelector(SEL.overlay);
    const nonMap = document.querySelector(SEL.nonMap);
    const mapEl = document.querySelector(SEL.map);
    const list = document.querySelector(SEL.list);
    const places = list ? [...list.querySelectorAll(SEL.card)].map((card) => readCard(card, list, VT)).filter((p) => p.slug) : [];
    const bySlug = new Map(places.map((p) => [p.slug, p]));

    const state = {
      map: null, mapReady: null, savedOnly: false,
      me: null, meDot: null, stopWatching: null, sortedByDistance: false,
      distanceOption: null, savedToggle: null, labelBefore: null,
    };

    // ---------- opening and closing the fullscreen map (same as before) ----------
    const isOpen = () => !!overlay && overlay.style.display === 'flex';

    function openMap() {
      if (!overlay) return;
      Object.assign(overlay.style, { display: 'flex', position: 'fixed', top: '0', left: '0', width: '100%', height: '100vh', zIndex: '1000' });
      if (nonMap) { nonMap.style.overflow = 'hidden'; nonMap.style.height = '100vh'; }
      // The map is only built the first time it's opened, so visitors who never
      // open it don't download or pay for a Google map.
      ensureMap().then(() => {
        if (!state.map) return;
        google.maps.event.trigger(state.map, 'resize');
        fitTo(shownPlaces());
      });
    }

    function closeMap() {
      if (!overlay) return;
      overlay.style.display = 'none';
      if (nonMap) { nonMap.style.overflow = ''; nonMap.style.height = ''; }
    }

    // Kept so anything else on the page that called the old functions still works.
    window.openFullscreenMap = openMap;
    window.closeFullscreenMap = closeMap;

    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!target.closest) return;
      if (target.closest(SEL.open)) { event.preventDefault(); openMap(); return; }
      if (target.closest(SEL.close)) { closeMap(); return; }

      // Filter modal housekeeping, as before: give the page its scroll back.
      if (target.closest('.filters-apply-button, .filters_tag')) document.body.style.overflow = '';
      if (target.closest('.filters_modal-close-button, .filters-apply-button, .filters_modal-background-overlay') && !isOpen() && nonMap) {
        nonMap.style.overflow = '';
        nonMap.style.height = '';
      }

      // Choosing one of your sort options takes over from "Near me".
      if ((state.sortedByDistance || state.stopWatching) && target.closest(SEL.sortTrigger) && target.closest('[fs-cmssort-field]')) nearMeOff();
    });

    // Start downloading Google Maps as soon as someone reaches for the button.
    const openButton = document.querySelector(SEL.open);
    if (openButton) ['pointerenter', 'touchstart', 'focusin'].forEach((type) => openButton.addEventListener(type, () => VT.maps.load().catch(() => {}), { once: true, passive: true }));

    if (FEATURES.listingHearts) guard('page card hearts', () => addPageCardHearts(VT, list));

    if (!places.length) return;

    // ---------- the map ----------
    function ensureMap() {
      if (state.mapReady) return state.mapReady;
      state.mapReady = VT.maps.load()
        .then(() => Promise.all([google.maps.importLibrary('maps'), google.maps.importLibrary('marker')]))
        .then(([{ Map }]) => {
          const first = places.find((p) => p.hasCoords);
          if (!first || !mapEl) return null;
          state.map = new Map(mapEl, {
            zoom: MAP.startZoom, center: { lat: first.lat, lng: first.lng },
            disableDefaultUI: true, gestureHandling: 'greedy', mapId: VT.maps.mapId, clickableIcons: false,
          });
          state.map.addListener('click', clearActive);
          places.forEach(addMarker);
          syncMarkers();
          if (state.me) showMe();
          return state.map;
        })
        .catch((e) => { if (DEBUG) console.error('[VT destination] map failed to load:', e); state.mapReady = null; return null; });
      return state.mapReady;
    }

    function addMarker(p) {
      if (!p.hasCoords) return;
      const content = el('div', { class: 'map-marker' });
      content.style.backgroundColor = p.color;
      p.marker = new google.maps.marker.AdvancedMarkerElement({ position: { lat: p.lat, lng: p.lng }, map: state.map, title: p.name, content });
      if (VT.saved.has(p.id)) content.classList.add('vt-saved');
      p.marker.addListener('gmp-click', () => {
        clearActive();
        activateMarker(p);
        activateCard(p, true);
        showTooltip(p);
      });
    }

    // A card counts as showing unless your filters (or "Saved") have hidden it.
    function isShown(p) {
      return p.item.isConnected && getComputedStyle(p.item).display !== 'none' && getComputedStyle(p.card).display !== 'none';
    }
    const shownPlaces = () => places.filter((p) => p.marker && isShown(p));

    // Markers follow the list: filtered-out places disappear from the map, and
    // the map refits to what's left.
    function syncMarkers() {
      if (!state.map) return;
      let changed = false;
      places.forEach((p) => {
        if (!p.marker) return;
        const on = isShown(p);
        if ((p.marker.map === state.map) !== on) { p.marker.map = on ? state.map : null; changed = true; }
      });
      if (changed) fitTo(shownPlaces());
    }

    function fitTo(list, extraPoint) {
      if (!state.map || !list.length) return;
      const bounds = new google.maps.LatLngBounds();
      list.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
      if (extraPoint) bounds.extend(extraPoint);
      state.map.fitBounds(bounds, MAP.fitPadding);
      if (list.length < MAP.fewMarkers && !extraPoint) {
        google.maps.event.addListenerOnce(state.map, 'bounds_changed', () => {
          if (state.map.getZoom() > MAP.fewMarkersMaxZoom) state.map.setZoom(MAP.fewMarkersMaxZoom);
        });
      }
    }

    // Watches the list for your Finsweet filters (and sort) changing it. This
    // replaces the old 300 ms / 1 second timers after button clicks.
    let syncTimer = 0;
    new MutationObserver(() => {
      clearTimeout(syncTimer);
      syncTimer = setTimeout(syncMarkers, 100);
    }).observe(list, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });

    // ---------- active card, marker and tooltip (same as before) ----------
    function clearActive() {
      document.querySelectorAll(SEL.card).forEach((card) => { card.classList.remove('active'); card.style.border = ''; });
      places.forEach((p) => {
        if (!p.marker) return;
        p.marker.content.classList.remove('active');
        p.marker.content.style.transform = '';
        p.marker.zIndex = undefined;
      });
      hideTooltips();
    }

    function activateMarker(p) {
      p.marker.content.classList.add('active');
      p.marker.zIndex = 1000;
    }

    function activateCard(p, scroll) {
      p.card.classList.add('active');
      p.card.style.border = '2px solid ' + p.color;
      p.card.style.borderRadius = '4px';
      if (scroll) p.card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function hideTooltips() {
      places.forEach((p) => {
        if (!p.marker) return;
        const tip = p.marker.content.querySelector('.marker-tooltip');
        if (tip) tip.remove();
      });
    }

    function showTooltip(p) {
      hideTooltips();
      const tip = el('div', { class: 'marker-tooltip' });
      const row = el('div', { class: 'horizontal-flex tooltip' });
      if (p.vegType) {
        const pill = el('div', { class: 'veg-type-pill', text: p.vegType });
        pill.style.backgroundColor = p.color;
        row.appendChild(pill);
      }
      if (p.priceRange) row.appendChild(el('div', { class: 'paragraph listing-info', text: p.priceRange }));
      tip.appendChild(row);
      const title = el('div', { class: 'listing-title', text: p.name });
      if (FEATURES.saveHearts) {
        const heart = VT.saved.button(savedItem(p, VT), { compact: true });
        heart.classList.add('vt-tip-save');
        tip.appendChild(el('div', { class: 'vt-tip-title' }, [title, heart]));
      } else {
        tip.appendChild(title);
      }
      tip.style.pointerEvents = 'auto';
      tip.style.zIndex = '1001';
      if (FEATURES.tooltipLinks && p.slug) {
        // The whole tooltip opens the restaurant page in a new tab (the heart still just saves).
        tip.classList.add('vt-tip-link');
        tip.setAttribute('role', 'link');
        tip.setAttribute('tabindex', '0');
        tip.setAttribute('aria-label', 'Open ' + p.name + ' in a new tab');
        title.insertAdjacentHTML('beforeend', '<span class="vt-tip-open">' + ICONS.open + '</span>');
        const open = (event) => {
          event.stopPropagation();
          window.open('/restaurants/' + p.slug, '_blank', 'noopener');
        };
        tip.addEventListener('click', open);
        tip.addEventListener('keydown', (event) => { if (event.key === 'Enter') open(event); });
      }
      p.marker.content.appendChild(tip);
    }

    // The locate icon on a card: find that place on the map.
    document.addEventListener('click', (event) => {
      const icon = event.target.closest && event.target.closest(SEL.locate);
      if (!icon) return;
      const card = icon.closest(SEL.card);
      const p = card && bySlug.get(card.id || (places.find((x) => x.card === card) || {}).slug);
      if (!p) return;
      event.stopPropagation();
      ensureMap().then(() => {
        if (!state.map || !p.marker) return;
        clearActive();
        activateCard(p, false);
        activateMarker(p);
        state.map.setZoom(MAP.locateZoom);
        state.map.panTo(p.marker.position);
        state.map.panBy(0, MAP.locateNudgeY);
        showTooltip(p);
      });
    });

    // ---------- save hearts ----------
    function addHearts() {
      places.forEach((p) => {
        const heart = VT.saved.button(savedItem(p, VT), { compact: true });
        heart.classList.add('vt-card-save');
        (p.card.querySelector(SEL.imageArea) || p.card).appendChild(heart);
      });
    }

    function refreshSavedState() {
      let count = 0;
      places.forEach((p) => {
        const on = VT.saved.has(p.id);
        if (on) count++;
        p.item.classList.toggle('vt-is-saved', on);
        if (p.marker) p.marker.content.classList.toggle('vt-saved', on);
      });
      if (state.savedToggle) {
        const badge = state.savedToggle.querySelector('.vt-count');
        badge.textContent = count;
        badge.hidden = !count;
        if (!count && state.savedOnly) toggleSavedOnly(); // nothing left to show
      }
    }

    // ---------- "Saved": only show saved places ----------
    function toggleSavedOnly() {
      const count = places.filter((p) => VT.saved.has(p.id)).length;
      if (!state.savedOnly && !count) {
        VT.ui.toast('Tap the heart on a restaurant to save it', 3000);
        return;
      }
      state.savedOnly = !state.savedOnly;
      list.classList.toggle('vt-saved-only', state.savedOnly);
      state.savedToggle.setAttribute('aria-pressed', state.savedOnly ? 'true' : 'false');
      state.savedToggle.classList.toggle('is-active', state.savedOnly);
      syncMarkers();
    }

    // ---------- "Near me": sort by distance ----------
    function cardLine(p) {
      const rows = [...p.card.querySelectorAll('.horizontal-flex')].filter((row) => !row.closest('.display-hidden'));
      return rows[0] || p.card.querySelector('.listing-title') || p.card;
    }

    function showDistances() {
      places.forEach((p) => {
        if (p.distance == null) return;
        const line = cardLine(p);
        let span = line.querySelector('.vt-card-distance');
        if (!span) {
          span = el('span', { class: 'vt-card-distance' });
          line.appendChild(span);
        }
        span.textContent = VT.location.describe(p.distance);
      });
    }

    function sortByDistance() {
      const withDistance = places.filter((p) => p.distance != null).sort((a, b) => a.distance - b.distance);
      const rank = new Map(withDistance.map((p, i) => [p, i]));
      // Visual order only (CSS order on your grid), so Finsweet's own list stays untouched.
      places.forEach((p, i) => { p.item.style.order = rank.has(p) ? rank.get(p) : 10000 + i; });
      state.sortedByDistance = true;
    }

    function showMe() {
      if (!state.map || !state.me) return;
      if (!state.meDot) {
        state.meDot = new google.maps.marker.AdvancedMarkerElement({
          position: state.me, map: state.map, zIndex: 900, title: 'You are here', content: el('div', { class: 'vt-me' }),
        });
      } else {
        state.meDot.position = state.me;
      }
    }

    const sortLabel = () => document.querySelector(SEL.sortTrigger + ' ' + SEL.sortLabel);

    // restoreLabel: put the Sort label back (when distance sorting couldn't start).
    function nearMeOff(restoreLabel) {
      if (state.stopWatching) state.stopWatching();
      state.stopWatching = null;
      state.watchToken = null; // any location update still on its way is ignored
      state.sortedByDistance = false;
      state.me = null;
      places.forEach((p) => { p.distance = null; p.item.style.order = ''; });
      document.querySelectorAll('.vt-card-distance').forEach((n) => n.remove());
      if (state.meDot) { state.meDot.map = null; state.meDot = null; }
      if (state.distanceOption) {
        state.distanceOption.classList.remove('vt-busy');
        state.distanceOption.removeAttribute('aria-current');
      }
      const label = sortLabel();
      if (restoreLabel && label && state.labelBefore != null) label.textContent = state.labelBefore;
    }

    // Choosing "Distance from Me" (again) sorts from where you are right now.
    function startNearMe() {
      const option = state.distanceOption;
      const label = sortLabel();
      if (state.stopWatching) nearMeOff(false);
      else if (label) state.labelBefore = label.textContent;
      if (label) label.textContent = clean(option.textContent);
      option.classList.add('vt-busy');
      option.setAttribute('aria-current', 'true');
      let first = true;
      const token = {};
      state.watchToken = token;
      state.stopWatching = VT.location.watch((me) => {
        if (state.watchToken !== token) return;
        option.classList.remove('vt-busy');
        let nearest = null;
        places.forEach((p) => {
          p.distance = p.hasCoords ? VT.location.distance(me, p) : null;
          if (p.distance != null && (!nearest || p.distance < nearest.distance)) nearest = p;
        });
        if (!nearest || nearest.distance > MAP.farMetres) {
          if (first) {
            nearMeOff(true);
            const city = (VT.destinations[VT.context.destination] || [])[0];
            VT.ui.toast("You're not near these places yet, so the list keeps its usual order" + (city ? '. Try again in ' + city + '.' : '.'), 4500);
          }
          return;
        }
        state.me = me;
        showDistances();
        showMe();
        if (!first) return; // keep the order steady while you walk; distances still update
        first = false;
        sortByDistance();
        VT.ui.toast('Sorted by distance from you', 2500);
        if (state.map) fitTo([nearest], me);
      }, (error) => {
        if (state.watchToken !== token) return;
        VT.ui.toast(VT.location.errorMessage(error), 4000);
        nearMeOff(true);
      });
    }

    // ---------- your "Distance from Me" sort option and "Saved" tag ----------
    function findDistanceOption() {
      const tagged = document.querySelector(SEL.distanceOption);
      if (tagged) return tagged;
      const dropdown = document.querySelector(SEL.sortTrigger);
      if (!dropdown) return null;
      return [...dropdown.querySelectorAll('a, [role="option"]')]
        .find((n) => !n.hasAttribute('fs-cmssort-field') && /distance/i.test(n.textContent)) || null;
    }

    // Closes the Webflow dropdown the option sits in.
    function closeDropdown(option) {
      const dropdown = option.closest('.w-dropdown') || option.closest(SEL.sortTrigger);
      if (!dropdown) return;
      if (window.jQuery) window.jQuery(dropdown).triggerHandler('w-close');
      else dropdown.querySelectorAll('.w--open').forEach((n) => n.classList.remove('w--open'));
    }

    function wireControls() {
      if (FEATURES.nearMe && VT.location && VT.location.supported()) {
        state.distanceOption = findDistanceOption();
        if (state.distanceOption) {
          state.distanceOption.addEventListener('click', (event) => {
            event.preventDefault();
            closeDropdown(state.distanceOption);
            startNearMe();
          });
        }
      }

      if (FEATURES.savedOnly && FEATURES.saveHearts) {
        const toggle = document.querySelector(SEL.savedToggle);
        if (toggle) {
          state.savedToggle = toggle;
          // Heart on the left, your text in the middle, a count on the right.
          toggle.insertAdjacentHTML('afterbegin', '<span class="vt-toggle-heart">' + ICONS.heart + '</span>');
          toggle.appendChild(el('span', { class: 'vt-count vt-toggle-count', hidden: true }));
          toggle.setAttribute('role', 'button');
          toggle.setAttribute('tabindex', '0');
          toggle.setAttribute('aria-pressed', 'false');
          toggle.addEventListener('click', (event) => { event.preventDefault(); toggleSavedOnly(); });
          toggle.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleSavedOnly(); }
          });
        }
      }
    }

    // ---------- start ----------
    if (FEATURES.saveHearts) guard('hearts', addHearts);
    guard('controls', wireControls);
    guard('saved state', refreshSavedState);
    VT.saved.onChange(() => guard('saved state', refreshSavedState));
    if (isOpen()) openMap();
  }

  // Hearts on restaurant cards outside the map (the grid under "Open map"). The whole
  // card is a link, so the heart sits next to it (not inside it) over the photo's
  // top-right corner: tapping the heart saves, tapping the card still opens the page.
  function addPageCardHearts(VT, list) {
    document.querySelectorAll(SEL.pageCards).forEach((card) => {
      if ((list && list.contains(card)) || card.closest(SEL.overlay) || card.hasAttribute('data-vt-heart-done')) return;
      const link = card.matches('a') ? card : card.querySelector('a[href*="/restaurants/"]');
      const slug = link && (link.pathname.match(/^\/restaurants\/([^/?#]+)/) || [])[1];
      if (!slug || !card.querySelector('img')) return;
      const host = card.matches('a') ? card.parentElement : card;
      const name = clean((card.querySelector('.title-s, .listing-title, h3, h4') || {}).textContent) || slug;
      const item = { id: VT.saved.placeId(slug), kind: 'place', name, destination: VT.context.destination, page: '/restaurants/' + slug };
      const heart = VT.saved.button(item, { compact: true });
      heart.classList.add('vt-page-card-save');
      host.classList.add('vt-heart-host');
      host.appendChild(heart);
      card.setAttribute('data-vt-heart-done', '');
    });
  }

  // ======================================================================
  // 3. STYLES for the things this script adds (your existing map and card
  // styles in Webflow stay as they are)
  // ======================================================================

  function injectStyles() {
    const css = `
.restaurant-img-wrapper .vt-card-save{position:absolute;top:.5rem;right:.5rem;z-index:2}
.vt-heart-host{position:relative}
.vt-heart-host > .vt-page-card-save{position:absolute;top:.5rem;right:.5rem;z-index:2}
.destination-saved-toggle,[data-vt-saved-toggle]{display:inline-flex;align-items:center;gap:6px;cursor:pointer;user-select:none}
.vt-toggle-heart{display:inline-flex;line-height:0}
.vt-toggle-heart svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.vt-toggle-count[hidden]{display:none!important}
:where(.destination-saved-toggle.is-active,[data-vt-saved-toggle].is-active){background-color:#fbe9ef;border-color:#b83a5b;color:#b83a5b}
.is-active > .vt-toggle-heart svg{fill:currentColor}
[aria-current="true"].vt-busy{opacity:.6}
#map-wrapper .vt-tip-link{cursor:pointer}
#map-wrapper .vt-tip-open{display:inline-flex;margin-left:6px;vertical-align:middle;color:#8f8f8f;line-height:0}
#map-wrapper .vt-tip-open svg{width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
#map-wrapper .vt-tip-link:hover .vt-tip-open{color:#5a8707}
.restaurant-list.vt-saved-only > :not(.vt-is-saved){display:none!important}
.vt-card-distance{color:#1a73e8;font-size:.8rem;font-weight:600;white-space:nowrap}
#map-wrapper .map-marker{position:relative}
#map-wrapper .map-marker.vt-saved::after{content:"";position:absolute;top:-5px;right:-5px;width:10px;height:10px;border:2px solid #fff;border-radius:50%;background:#b83a5b}
#map-wrapper .vt-tip-title{display:flex;align-items:center;justify-content:center;gap:8px}
#map-wrapper .vt-tip-save{width:28px;height:28px;box-shadow:none;border:1px solid #e3e3e3}
#map-wrapper .vt-tip-save svg{width:15px;height:15px}
#map-wrapper .vt-me{width:18px;height:18px;border:3px solid #fff;border-radius:50%;background:#1a73e8;box-shadow:0 0 0 6px rgba(26,115,232,.22),0 1px 3px rgba(0,0,0,.35);transform:translate(0,50%)}
`;
    const style = document.createElement('style');
    style.id = 'vt-destination-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ======================================================================
  // 4. START-UP
  // ======================================================================

  function start() {
    guard('styles', injectStyles);
    // Wait for core.js (saved places, Maps loader, veg-type colours, location).
    (window.vtReady = window.vtReady || []).push((VT) => guard('destination', () => destination(VT)));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
