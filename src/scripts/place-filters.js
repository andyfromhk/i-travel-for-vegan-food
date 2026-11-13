/*!
 * I Travel For Vegan Food: place-filters.js
 * ------------------------------------------------------------------------
 * Search, filters and sorting for the restaurant list inside a destination's
 * fullscreen map. (This is the site's own replacement for Finsweet Attributes.)
 *
 * It only ever does two things to the list:
 *   - hides the cards that don't match (the `hidden` attribute), and
 *   - puts the cards in the chosen order.
 * destination.js watches the list, so the map's markers follow along.
 *
 * Everything it looks for is marked with data-* attributes in
 * src/components/section/DestinationMap.astro:
 *
 *   [data-map-list]            the list           [data-map-card]      one restaurant
 *   [data-filter-search]       the search box     input[name="veg"]    veg type checkboxes
 *   input[name="price"]        price checkboxes   [data-filter-tags]   where active filters are listed
 *   [data-sort-menu]           the sort menu      [data-sort-field]    one sort option
 */
(() => {
  'use strict';

  const root = document.querySelector('[data-place-filters]');
  const list = root && root.querySelector('[data-map-list]');
  if (!root || !list) return;

  const cards = [...list.querySelectorAll('[data-map-card]')];
  const search = root.querySelector('[data-filter-search]');
  const boxes = [...root.querySelectorAll('input[type="checkbox"][name]')];
  const tags = root.querySelector('[data-filter-tags]');
  const shown = root.querySelector('[data-filter-shown]');
  const empty = root.querySelector('[data-filter-empty]');
  const panel = root.querySelector('[data-filter-panel]');
  const sortMenu = root.querySelector('[data-sort-menu]');
  const sortLabel = root.querySelector('[data-sort-label]');

  // Which values are ticked in each group, e.g. { veg: ['vegan'], price: [] }
  function chosen() {
    const groups = {};
    boxes.forEach((box) => {
      groups[box.name] = groups[box.name] || [];
      if (box.checked) groups[box.name].push(box.value);
    });
    return groups;
  }

  // ---------- filtering ----------
  function apply() {
    const words = (search ? search.value : '').toLowerCase().trim().split(/\s+/).filter(Boolean);
    const groups = chosen();

    cards.forEach((card) => {
      const text = card.dataset.search || '';
      const matchesSearch = words.every((word) => text.includes(word));
      // Within a group any ticked value matches; across groups all must match.
      const matchesGroups = Object.entries(groups).every(([name, values]) => !values.length || values.includes(card.dataset[name]));
      card.hidden = !(matchesSearch && matchesGroups);
    });

    renderTags(words.length ? search.value.trim() : '', groups);
    count();
  }

  // Counts what is really on screen, so the "Saved" tag (handled by destination.js) is included.
  function count() {
    const visible = cards.filter((card) => getComputedStyle(card).display !== 'none').length;
    if (shown) shown.textContent = visible;
    if (empty) empty.hidden = visible > 0;
  }

  // ---------- active filter tags ----------
  function renderTags(text, groups) {
    if (!tags) return;
    tags.textContent = '';
    const add = (label, remove) => {
      const tag = document.createElement('button');
      tag.type = 'button';
      tag.className = 'dest-map_tag';
      tag.setAttribute('aria-label', 'Remove filter: ' + label);
      tag.append(label);
      const cross = document.createElement('span');
      cross.className = 'dest-map_tag_remove';
      cross.setAttribute('aria-hidden', 'true');
      // A drawn cross, as tall as the text (the × character draws smaller than letters).
      cross.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>';
      tag.appendChild(cross);
      tag.addEventListener('click', () => { remove(); apply(); });
      tags.appendChild(tag);
    };
    if (text) add('“' + text + '”', () => { search.value = ''; });
    boxes.filter((box) => box.checked).forEach((box) => add(box.dataset.label || box.value, () => { box.checked = false; }));
    tags.hidden = !tags.children.length;
  }

  // ---------- sorting ----------
  const sorters = {
    likes: (a, b) => Number(b.dataset.likes || 0) - Number(a.dataset.likes || 0) || (b.dataset.created || '').localeCompare(a.dataset.created || ''),
    created: (a, b) => (b.dataset.created || '').localeCompare(a.dataset.created || ''),
    name: (a, b) => (a.dataset.name || '').localeCompare(b.dataset.name || '', undefined, { sensitivity: 'base' }),
    price: (a, b) => Number(a.dataset.priceRank || 99) - Number(b.dataset.priceRank || 99),
  };

  function sortBy(field, direction) {
    const compare = sorters[field];
    if (!compare) return;
    const sign = direction === 'desc' ? -1 : 1;
    // "Most Popular" and "Recently Added" already run highest first.
    const flip = field === 'likes' || field === 'created' ? 1 : sign;
    cards.sort((a, b) => flip * compare(a, b));
    cards.forEach((card) => {
      card.style.order = ''; // "Distance from Me" orders with CSS; a real sort takes over from it
      list.appendChild(card);
    });
  }

  // ---------- wiring ----------
  if (search) search.addEventListener('input', apply);
  boxes.forEach((box) => box.addEventListener('change', apply));

  root.addEventListener('click', (event) => {
    const target = event.target.closest('button, [data-filter-open]');
    if (!target) return;

    if (target.matches('[data-filter-open]') && panel) { panel.showModal(); return; }
    if (target.matches('[data-filter-close]') && panel) { panel.close(); return; }
    if (target.matches('[data-filter-clear]')) {
      if (search) search.value = '';
      boxes.forEach((box) => { box.checked = false; });
      apply();
      return;
    }
    if (target.matches('[data-filter-clear-group]')) {
      const group = target.getAttribute('data-filter-clear-group');
      if (group === 'search' && search) search.value = '';
      boxes.filter((box) => box.name === group).forEach((box) => { box.checked = false; });
      apply();
      return;
    }
    if (target.matches('[data-sort-field]')) {
      sortBy(target.getAttribute('data-sort-field'), target.getAttribute('data-sort-dir'));
      if (sortLabel) sortLabel.textContent = target.textContent.trim();
      sortMenu.querySelectorAll('[aria-current]').forEach((n) => n.removeAttribute('aria-current'));
      target.setAttribute('aria-current', 'true');
      if (sortMenu) sortMenu.open = false;
    }
  });

  // Clicking the dimmed area around the filter panel closes it.
  if (panel) panel.addEventListener('click', (event) => { if (event.target === panel) panel.close(); });

  // The sort menu closes when you click elsewhere.
  document.addEventListener('click', (event) => {
    if (sortMenu && sortMenu.open && !sortMenu.contains(event.target)) sortMenu.open = false;
  });

  // The "Saved" tag changes what is on screen without touching the filters, so recount then too.
  new MutationObserver(count).observe(list, { attributes: true, attributeFilter: ['class'] });

  apply();
})();
