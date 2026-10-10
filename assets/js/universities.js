/* =====================================================================
 * UK universities directory (universities.html).
 *
 * Data: window.UK_UNIVERSITIES (bundled, 499 rows). supabase-data.js may
 * swap in a fresher copy via window.TC_applyUniversities(rows).
 * The `offerRate` field is a placeholder and is deliberately NOT shown.
 * `rank` is shown only when `ranked` is true.
 *
 * Shortlisting writes into the shared lead context from landing.js
 * (window.TC), so hearted institutions appear on the enquiry form at the
 * bottom of the page and are submitted with the lead.
 * ===================================================================== */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var PAGE = 24;

  function start() {
    var grid = $('[data-uni-grid]');
    if (!grid) return;
    var TC = window.TC || { ctx: { shortlist: [] }, renderCarry: function () {}, reduce: true, hasGsap: false };
    if (!TC.setShort) { // landing.js missing: keep hearts working on their own
      TC.isShort = function (n) { return TC.ctx.shortlist.indexOf(n) !== -1; };
      TC.setShort = function (n, on) { var l = TC.ctx.shortlist, i = l.indexOf(n); if (on && i === -1) l.push(n); else if (!on && i !== -1) l.splice(i, 1); Object.keys(cache).forEach(function (id) { var c = cache[id]; paintHeart(c._uni, $('.uni-heart', c), c); }); paintTray(true); };
    }
    var G = window.gsap, canFlip = TC.hasGsap && window.Flip && !TC.reduce;
    var data = (window.TC_pendingUniversities || window.UK_UNIVERSITIES || []).slice();
    var state = { q: '', nation: 'all', type: 'all', sort: 'rank', shown: PAGE };
    var cache = {};
    var count = $('[data-dir-count]'), progress = $('[data-dir-progress]'), more = $('[data-dir-more]'), empty = $('[data-dir-empty]');
    var tray = $('[data-sl-tray]'), trayN = $('[data-sl-n]'), trayNames = $('[data-sl-names]');

    function nationOf(u) { var p = String(u.location || '').split(','); return p[p.length - 1].trim(); }
    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    var TYPE_CLASS = { 'Russell Group': 't-russell', Specialist: 't-specialist', College: 't-college', Private: 't-private' };

    function stats() {
      var all = $('[data-stat="all"]'), rg = $('[data-stat="russell"]'), tot = $('[data-dir-total]');
      if (all) all.textContent = data.length;
      if (tot) tot.textContent = data.length;
      if (rg) rg.textContent = data.filter(function (u) { return u.type === 'Russell Group'; }).length;
    }

    function card(u) {
      if (cache[u.id]) return cache[u.id];
      var el = document.createElement('article');
      el.className = 'uni-card';
      el.setAttribute('data-flip-id', u.id);
      var rank = u.ranked ? '<span class="uni-rankb">#' + u.rank + '</span>' : '<span class="uni-rankb is-un" title="Not ranked in national league tables">Unranked</span>';
      el.innerHTML =
        '<div class="uni-top">' + rank + '<span class="uni-type ' + (TYPE_CLASS[u.type] || '') + '">' + esc(u.type) + '</span></div>' +
        '<h3>' + esc(u.name) + '</h3>' +
        '<p class="uni-loc"><svg class="icon icon-sm"><use href="#i-pin"/></svg>' + esc(u.location) + '</p>' +
        (u.programs ? '<p class="uni-prog"><b>Known for:</b> ' + esc(u.programs) + '</p>' : '') +
        '<button class="uni-more-btn" type="button">View details<svg class="icon icon-sm"><use href="#i-arrow"/></svg></button>' +
        '<button class="uni-heart" type="button" aria-pressed="false" aria-label="Shortlist ' + esc(u.name) + '"><svg class="icon icon-sm"><use href="#i-heart"/></svg></button>';
      var heart = $('.uni-heart', el);
      el._uni = u.name;
      heart.addEventListener('click', function () { toggle(u.name, heart); });
      // the whole card opens the details sheet (the heart only shortlists)
      el.addEventListener('click', function (e) {
        if (e.target.closest('.uni-heart') || !TC.openUni) return;
        TC.openUni(u, $('.uni-more-btn', el));
      });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
      cache[u.id] = el;
      return el;
    }

    function paintHeart(name, heart, el) {
      var on = TC.ctx.shortlist.indexOf(name) !== -1;
      heart.setAttribute('aria-pressed', on ? 'true' : 'false');
      el.classList.toggle('is-picked', on);
    }
    function toggle(name, heart) {
      TC.setShort(name, !TC.isShort(name));
      if (G && !TC.reduce) G.fromTo(heart, { scale: 0.6 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
    }
    // any change (card heart, details sheet, form chip) repaints cards and tray
    if (TC.onShortlist) TC.onShortlist(function () {
      Object.keys(cache).forEach(function (id) { var c = cache[id]; paintHeart(c._uni, $('.uni-heart', c), c); });
      paintTray(true);
    });
    function paintTray(pulse) {
      var n = TC.ctx.shortlist.length;
      trayN.textContent = n;
      trayNames.textContent = TC.ctx.shortlist.join(', ');
      tray.classList.toggle('is-on', n > 0);
      if (pulse && n && G && !TC.reduce) G.fromTo(trayN, { scale: 1.6 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
    }

    function matches() {
      var q = state.q.toLowerCase();
      var list = data.filter(function (u) {
        if (state.nation !== 'all' && nationOf(u) !== state.nation) return false;
        if (state.type !== 'all' && u.type !== state.type) return false;
        if (q && (u.name + ' ' + u.location + ' ' + (u.programs || '') + ' ' + u.type).toLowerCase().indexOf(q) === -1) return false;
        return true;
      });
      if (state.sort === 'az') list.sort(function (a, b) { return a.name.localeCompare(b.name); });
      else list.sort(function (a, b) { return (a.rank || 1e9) - (b.rank || 1e9); });
      return list;
    }

    function render(animate) {
      var list = matches(), vis = list.slice(0, state.shown);
      var flipState = animate && canFlip ? Flip.getState(grid.children) : null;
      var before = {};
      $$(':scope > .uni-card', grid).forEach(function (c) { before[c.getAttribute('data-flip-id')] = true; });
      var frag = document.createDocumentFragment();
      vis.forEach(function (u) { var c = card(u); paintHeart(u.name, $('.uni-heart', c), c); frag.appendChild(c); });
      grid.replaceChildren(frag);
      count.textContent = list.length === data.length ? 'Showing all ' + data.length + ' institutions' : list.length + (list.length === 1 ? ' institution matches' : ' institutions match');
      progress.textContent = 'Showing ' + vis.length + ' of ' + list.length;
      more.hidden = vis.length >= list.length;
      empty.hidden = list.length > 0;
      if (flipState) {
        Flip.from(flipState, { duration: 0.6, ease: 'power3.inOut', absolute: false, nested: false, prune: true });
        var fresh = vis.map(function (u) { return cache[u.id]; }).filter(function (c) { return !before[c.getAttribute('data-flip-id')]; });
        if (fresh.length) G.fromTo(fresh, { opacity: 0, y: 30, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.025, ease: 'expo.out', clearProps: 'transform,opacity' });
      }
      if (TC.hasGsap && window.ScrollTrigger) ScrollTrigger.refresh();
    }

    function chips(sel, key) {
      var btns = $$(sel + ' [data-val]');
      btns.forEach(function (b) {
        b.addEventListener('click', function () {
          state[key] = b.getAttribute('data-val');
          state.shown = PAGE;
          btns.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
          render(true);
        });
      });
      return btns;
    }
    var nationBtns = chips('[data-dir-nation]', 'nation');
    var typeBtns = chips('[data-dir-type]', 'type');

    var qInput = $('[data-dir-q]'), sortSel = $('[data-dir-sort]'), t = 0;
    qInput.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(function () { state.q = qInput.value.trim(); state.shown = PAGE; render(true); }, 140);
    });
    $('[data-dir-search-form]').addEventListener('submit', function (e) {
      e.preventDefault();
      state.q = qInput.value.trim(); state.shown = PAGE; render(true);
      var target = $('#directory');
      if (TC.lenis) TC.lenis.scrollTo(target, { offset: -140 }); else target.scrollIntoView({ behavior: TC.reduce ? 'auto' : 'smooth' });
    });
    sortSel.addEventListener('change', function () { state.sort = sortSel.value; render(true); });
    $('[data-dir-load]').addEventListener('click', function () { state.shown += PAGE; render(true); });
    $('[data-dir-reset]').addEventListener('click', function () {
      state = { q: '', nation: 'all', type: 'all', sort: state.sort, shown: PAGE };
      qInput.value = '';
      [nationBtns, typeBtns].forEach(function (bs) { bs.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-val') === 'all' ? 'true' : 'false'); }); });
      render(true);
    });

    // ?q=… deep link (e.g. from the home page map)
    try { var q0 = new URLSearchParams(location.search).get('q'); if (q0) { qInput.value = q0; state.q = q0; } } catch (e) { /* old browser */ }

    // Supabase may deliver a fresher dataset later.
    window.TC_applyUniversities = function (rows) {
      if (!rows || !rows.length) return;
      data = rows.slice(); cache = {}; stats(); render(false);
    };

    // Hero background drifts slowly.
    if (TC.hasGsap && !TC.reduce && window.ScrollTrigger) {
      G.fromTo('[data-dir-bg]', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.dir-hero', start: 'top top', end: 'bottom top', scrub: true } });
      G.from('.dir-hero .wrap > *', { y: 30, opacity: 0, stagger: 0.08, duration: 1, ease: 'expo.out', delay: 0.1 });
    }

    stats();
    render(false);
    if (canFlip) G.from($$(':scope > .uni-card', grid), { opacity: 0, y: 40, stagger: 0.03, duration: 0.8, ease: 'expo.out', delay: 0.3, clearProps: 'transform,opacity' });
    paintTray(false);
  }

  // landing.js boots on DOMContentLoaded and publishes window.TC; run after it.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
