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

  /* ---- Course areas. "Known for" is free text (255 distinct subjects), so
     each subject is grouped into one of these areas; a university can sit in
     several. Keep the regexes broad: an unmatched university simply doesn't
     appear under any course filter. */
  var COURSES = [
    ['business', 'Business, Finance & Management', /business|manag|financ|account|econom|marketing|\bmba\b|entrepreneur|hospitality|tourism|events|retail|logistic|supply chain|banking|real estate/i],
    ['computing', 'Computing & IT', /comput|software|\bdata\b|cyber|artificial|\bai\b|informat|\bit\b|digital tech|games? (dev|design)/i],
    ['engineering', 'Engineering & Technology', /engineer|technolog|aerospace|aeronaut|robot|mechan|electr|automotive|motorsport|manufactur|energy/i],
    ['medicine', 'Medicine, Nursing & Health', /medic|health|nurs|pharma|dent|physio|optom|chiropr|osteopath|midwif|biomed|clinical|paramedic|occupational|radiograph|psychotherap|nutrition|podiat/i],
    ['law', 'Law & Criminology', /\blaw\b|legal|crimin|policing/i],
    ['science', 'Sciences & Maths', /science|physic|chemi|biolog|mathem|maths|statistic|environment|geograph|geolog|forensic|ecolog|marine|astronom/i],
    ['social', 'Psychology, Social Sciences & Humanities', /psycholog|politic|\bppe\b|sociolog|social|international relations|histor|philosoph|humanit|english|literat|language|linguist|classics|archaeolog|anthropolog|creative writing|liberal arts/i],
    ['art', 'Art, Design & Fashion', /\bart\b|fine art|design|fashion|illustrat|textile|craft|jewel|photograph|graphic/i],
    ['performing', 'Music, Drama & Performance', /music|acting|drama|theatre|dance|perform|choreograph|stage|opera|circus/i],
    ['media', 'Media, Film & Journalism', /media|film|journalism|screen|animation|visual effects|broadcast|communication|television|sound|cinematograph|directing|producing/i],
    ['architecture', 'Architecture, Building & Planning', /architect|built environment|construct|planning|survey|interior|landscape/i],
    ['education', 'Education & Teaching', /educat|teach|childhood/i],
    ['agriculture', 'Agriculture, Animal & Veterinary', /agricult|animal|equine|veterin|horticult|land-based|countryside|farm|zoolog/i],
    ['sport', 'Sport & Exercise', /sport|exercise|coaching|fitness/i],
    ['theology', 'Theology & Religious Studies', /theolog|biblic|ministry|divinity|religio|mission|church|islamic|jewish|rabbin/i]
  ];
  var NATIONS = ['England', 'Scotland', 'Wales', 'N. Ireland'];
  var TYPES = ['Russell Group', 'Public', 'Specialist', 'Private', 'College'];
  var MIN_CITY = 5;   // cities with at least this many institutions get their own area option

  function nationOf(u) { var p = String(u.location || '').split(','); return p[p.length - 1].trim(); }
  function cityOf(u) { return String(u.location || '').split(',')[0].trim(); }
  function coursesOf(u) {
    if (u._courses && u._coursesFor === u.programs) return u._courses;
    var hay = String(u.programs || '');
    u._courses = COURSES.filter(function (c) { return c[2].test(hay); }).map(function (c) { return c[0]; });
    u._coursesFor = u.programs;
    return u._courses;
  }

  /* Fill the three filter dropdowns from the data, with counts. This runs as
     soon as the script loads, i.e. before landing.js turns every <select>
     into the styled dropdown, so the styled lists pick these options up. */
  (function fillFilters() {
    var data = window.UK_UNIVERSITIES || [];
    function add(sel, value, text) { var o = document.createElement('option'); o.value = value; o.textContent = text; sel.appendChild(o); }
    var course = document.querySelector('[data-dir-course]'), area = document.querySelector('[data-dir-area]'), type = document.querySelector('[data-dir-type]');
    if (!course || !area || !type) return;
    var cc = {}, nc = {}, tc = {}, cities = {};
    data.forEach(function (u) {
      coursesOf(u).forEach(function (k) { cc[k] = (cc[k] || 0) + 1; });
      nc[nationOf(u)] = (nc[nationOf(u)] || 0) + 1;
      tc[u.type] = (tc[u.type] || 0) + 1;
      var c = cityOf(u); cities[c] = cities[c] || { n: 0, nation: nationOf(u) }; cities[c].n++;
    });
    COURSES.slice().sort(function (a, b) { return a[1].localeCompare(b[1]); }).forEach(function (c) { if (cc[c[0]]) add(course, c[0], c[1] + ' (' + cc[c[0]] + ')'); });
    NATIONS.forEach(function (n) { if (nc[n]) add(area, 'n:' + n, 'All of ' + n + ' (' + nc[n] + ')'); });
    Object.keys(cities).filter(function (c) { return cities[c].n >= MIN_CITY; })
      .sort(function (a, b) { return cities[b].n - cities[a].n || a.localeCompare(b); })
      .forEach(function (c) { add(area, 'c:' + c, c + ', ' + cities[c].nation + ' (' + cities[c].n + ')'); });
    TYPES.forEach(function (t) { if (tc[t]) add(type, t, t + ' (' + tc[t] + ')'); });
    // now build the styled dropdowns (landing.js skipped these: data-defer-dd)
    [course, area, type].forEach(function (sel) {
      sel.removeAttribute('data-defer-dd');
      if (window.TC && window.TC.enhanceSelect) window.TC.enhanceSelect(sel);
    });
  })();

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
    var state = { q: '', course: 'all', area: 'all', type: 'all', sort: 'rank', shown: PAGE };
    var cache = {};
    var collate = window.Intl && Intl.Collator ? new Intl.Collator('en').compare : function (a, b) { return a < b ? -1 : a > b ? 1 : 0; };
    var count = $('[data-dir-count]'), progress = $('[data-dir-progress]'), more = $('[data-dir-more]'), empty = $('[data-dir-empty]');
    var tray = $('[data-sl-tray]'), trayN = $('[data-sl-n]'), trayNames = $('[data-sl-names]');

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
      // spotlight: measure the card once on enter, not on every move (a read
      // after the previous move's style write forced a layout per event)
      var box = null;
      el.addEventListener('pointerenter', function () { box = el.getBoundingClientRect(); });
      el.addEventListener('pointermove', function (e) {
        if (!box) box = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - box.left) + 'px');
        el.style.setProperty('--my', (e.clientY - box.top) + 'px');
      });
      el.addEventListener('pointerleave', function () { box = null; });
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
        if (state.course !== 'all' && coursesOf(u).indexOf(state.course) === -1) return false;
        if (state.area !== 'all') {
          var kind = state.area.slice(0, 2), val = state.area.slice(2);
          if (kind === 'n:' ? nationOf(u) !== val : cityOf(u) !== val) return false;
        }
        if (state.type !== 'all' && u.type !== state.type) return false;
        if (q && (u.name + ' ' + u.location + ' ' + (u.programs || '') + ' ' + u.type).toLowerCase().indexOf(q) === -1) return false;
        return true;
      });
      // one shared collator: localeCompare builds a new one per call (slow over 499 rows)
      if (state.sort === 'az') list.sort(function (a, b) { return collate(a.name, b.name); });
      else list.sort(function (a, b) { return (a.rank || 1e9) - (b.rank || 1e9); });
      return list;
    }

    /* Rendering. 'more' only appends the next page (nothing on screen moves);
       a filter/search/sort swap replaces the cards and fades in just the
       first screenful. Neither measures card positions: the earlier Flip
       animation did, for every card, and cost 100-750 ms per change. */
    var rendered = [];
    function render(mode) {
      var list = matches(), vis = list.slice(0, state.shown);
      var fresh = [];
      if (mode === 'more' && rendered.length && vis.slice(0, rendered.length).every(function (u, i) { return u.id === rendered[i]; })) {
        var frag = document.createDocumentFragment();
        // only the first row or two of the new page is on screen; animate just those
        vis.slice(rendered.length).forEach(function (u, k) { var c = card(u); paintHeart(u.name, $('.uni-heart', c), c); frag.appendChild(c); if (k < 8) fresh.push(c); });
        grid.appendChild(frag);
      } else {
        var frag2 = document.createDocumentFragment();
        vis.forEach(function (u) { var c = card(u); paintHeart(u.name, $('.uni-heart', c), c); frag2.appendChild(c); });
        grid.replaceChildren(frag2);
        if (mode) fresh = vis.slice(0, 12).map(function (u) { return cache[u.id]; });
      }
      rendered = vis.map(function (u) { return u.id; });
      count.textContent = list.length === data.length ? 'Showing all ' + data.length + ' institutions' : list.length + (list.length === 1 ? ' institution matches' : ' institutions match');
      progress.textContent = 'Showing ' + vis.length + ' of ' + list.length;
      more.hidden = vis.length >= list.length;
      empty.hidden = list.length > 0;
      if (fresh.length && G && !TC.reduce) {
        G.killTweensOf(fresh);
        G.fromTo(fresh, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.025, ease: 'expo.out', clearProps: 'transform,opacity' });
      }
      // The only scroll effect here is the hero backdrop above the grid, so a
      // full refresh per render (a forced layout of the whole page) isn't
      // needed; Lenis notices the new page height on its own.
    }

    // course / area / type dropdowns (native selects behind the styled ones)
    var fSels = { course: $('[data-dir-course]'), area: $('[data-dir-area]'), type: $('[data-dir-type]') };
    var clearBtn = $('[data-dir-clear]');
    function paintFilters() {
      var any = false;
      Object.keys(fSels).forEach(function (k) {
        var on = state[k] !== 'all';
        any = any || on;
        var box = fSels[k].closest('[data-dir-f]');
        if (box) box.classList.toggle('is-set', on);
      });
      if (clearBtn) clearBtn.hidden = !any;
    }
    Object.keys(fSels).forEach(function (k) {
      fSels[k].addEventListener('change', function () {
        state[k] = fSels[k].value || 'all';
        state.shown = PAGE;
        paintFilters();
        render('swap');
      });
    });
    function clearFilters() {
      Object.keys(fSels).forEach(function (k) { state[k] = 'all'; fSels[k].value = 'all'; });
      paintFilters();
    }
    if (clearBtn) clearBtn.addEventListener('click', function () { clearFilters(); state.shown = PAGE; render('swap'); });

    var qInput = $('[data-dir-q]'), sortSel = $('[data-dir-sort]'), t = 0;
    qInput.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(function () { state.q = qInput.value.trim(); state.shown = PAGE; render('swap'); }, 140);
    });
    $('[data-dir-search-form]').addEventListener('submit', function (e) {
      e.preventDefault();
      state.q = qInput.value.trim(); state.shown = PAGE; render('swap');
      var target = $('#directory');
      if (TC.lenis) TC.lenis.scrollTo(target, { offset: -140 }); else target.scrollIntoView({ behavior: TC.reduce ? 'auto' : 'smooth' });
    });
    sortSel.addEventListener('change', function () { state.sort = sortSel.value; render('swap'); });
    $('[data-dir-load]').addEventListener('click', function () { state.shown += PAGE; render('more'); });
    $('[data-dir-reset]').addEventListener('click', function () {
      state = { q: '', course: 'all', area: 'all', type: 'all', sort: state.sort, shown: PAGE };
      qInput.value = '';
      clearFilters();
      render('swap');
    });

    // ?q=… deep link (e.g. from the home page map)
    try { var q0 = new URLSearchParams(location.search).get('q'); if (q0) { qInput.value = q0; state.q = q0; } } catch (e) { /* old browser */ }

    // Supabase may deliver a fresher dataset later.
    // Usually identical to the bundled copy, so compare first; when it does
    // differ, swap it in at an idle moment rather than mid-scroll.
    function sig(list) { return list.map(function (u) { return [u.id, u.name, u.rank, u.type, u.location, u.programs].join('\u0001'); }).join('\u0002'); }
    var dataSig = sig(data);
    window.TC_applyUniversities = function (rows) {
      if (!rows || !rows.length) return;
      var next = sig(rows);
      if (next === dataSig) return;
      var apply = function () { data = rows.slice(); dataSig = next; cache = {}; stats(); render(false); warm(); };
      if (window.requestIdleCallback) requestIdleCallback(apply, { timeout: 2000 }); else setTimeout(apply, 200);
    };

    // Hero background drifts slowly.
    if (TC.hasGsap && !TC.reduce && window.ScrollTrigger) {
      G.fromTo('[data-dir-bg]', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '.dir-hero', start: 'top top', end: 'bottom top', scrub: true } });
      G.from('.dir-hero .wrap > *', { y: 30, opacity: 0, stagger: 0.08, duration: 1, ease: 'expo.out', delay: 0.1 });
    }

    stats();
    render(false);
    // Build the remaining cards a few at a time while the page is idle, so
    // "Load more", filters and sorting only place existing elements.
    function warm() {
      var queue = data.slice(), idle = window.requestIdleCallback || function (fn) { return setTimeout(function () { fn({ timeRemaining: function () { return 8; } }); }, 50); };
      idle(function step(dl) {
        while (queue.length && dl.timeRemaining() > 2) card(queue.shift());
        if (queue.length) idle(step);
      });
    }
    warm();
    if (canFlip) G.from($$(':scope > .uni-card', grid), { opacity: 0, y: 40, stagger: 0.03, duration: 0.8, ease: 'expo.out', delay: 0.3, clearProps: 'transform,opacity' });
    paintTray(false);
  }

  // landing.js boots on DOMContentLoaded and publishes window.TC; run after it.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
