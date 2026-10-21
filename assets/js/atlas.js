/* =====================================================================
 * Tutee Connect UK — "The Atlas": presentation layer.
 *
 * landing.js keeps every working feature (form, validation, /api/enquiry,
 * map data, shortlist, details sheet, FAQ, Tutee AI, news). This file adds
 * the Atlas experience on top:
 *   - the 3D world (assets/js/world.js, three.js), loaded after first paint
 *     and only where it can run well; the page is complete without it
 *   - scroll → camera: each chapter (section[data-shot]) has its own scene
 *     (desk, plinths, globe, relief map, college, workbench, bank, steps,
 *     pillar box); the camera flies to it as the chapter arrives
 *   - chapter links between HTML and 3D: the worry being read rises on its
 *     plinth, route steps fly the plane, nation tabs raise a landmark, the
 *     city chip names the college banner, each service lifts its object,
 *     each scholarship unrolls, each visa moves the graduate up a step,
 *     each story brings its postcard forward
 *   - the page wash behind the text takes its colour from the scene
 *   - "You are here" in the header, service "Read more", nation tabs
 *   - a privacy-safe dataLayer event helper (no analytics is configured)
 * ===================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var SCRIPT_URL = (document.currentScript && document.currentScript.src) || location.href;
  var PHONE_W = 760;   // below this width the world sits above the text
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /* ---------------------------------------------------------- tracking */
  // Events go to window.dataLayer for a tag manager to pick up if one is
  // ever added. Only non-personal parameters: never names, emails or phones.
  window.dataLayer = window.dataLayer || [];
  function track(event, params) {
    var e = { event: event };
    if (params) Object.keys(params).forEach(function (k) { e[k] = params[k]; });
    window.dataLayer.push(e);
  }
  window.TC_track = track;

  /* ---------------------------------------------------- sections + state */
  var sections = $$('main > section');
  var worldSecs = sections.filter(function (s) { return s.hasAttribute('data-shot'); });
  var here = $('[data-here]');
  var world = null, canvasEl = null;
  var vh = window.innerHeight, vw = window.innerWidth;
  var marks = [];   // [{el, top, bottom}]

  function measure() {
    vh = window.innerHeight; vw = window.innerWidth;
    var y = window.pageYOffset;
    marks = sections.map(function (s) { var r = s.getBoundingClientRect(); return { el: s, top: r.top + y, bottom: r.bottom + y }; });
    measureParts();
    measureCols();
  }

  /* ------------------------------------------------- per-chapter parts */
  var steps = $$('[data-steps] .step'), stepsList = $('[data-steps]');
  var svcItems = $$('[data-svc-item]');
  var rungs = $$('[data-ladder] .rung');
  var quotes = $$('.postcards .quote');
  var worries = $$('.worries-list .worry');
  var grants = $$('.ledger .gp');
  var parts = { steps: [], svcs: [], rungs: [], quotes: [], worries: [], grants: [] };
  function tops(list) { var y = window.pageYOffset; return list.map(function (el) { var r = el.getBoundingClientRect(); return { el: el, top: r.top + y, h: r.height }; }); }
  function measureParts() { parts.steps = tops(steps); parts.svcs = tops(svcItems); parts.rungs = tops(rungs); parts.quotes = tops(quotes); parts.worries = tops(worries); parts.grants = tops(grants); }

  // the item whose top has passed the reading line (60% down the screen)
  function activeIndex(list, line) {
    var k = -1;
    for (var i = 0; i < list.length; i++) if (list[i].top <= line) k = i;
    return k;
  }

  // route progress along the 3D arc for a fractional step position s (0–8):
  // steps 1–5 are waypoints on the flight, 6 is landing, 7–8 rise above London
  var WP_A = [0, 0.08, 0.26, 0.44, 0.62, 0.8, 1];
  function routeFor(s) {
    if (s <= 0) return [0, 0];
    if (s <= 6) {
      var i = Math.floor(s), from = WP_A[i], to = WP_A[Math.min(6, i + 1)];
      return [Math.min(1, from + (to - from) * (s - i)), 0];
    }
    return [1, Math.min(1, (s - 6) / 2)];
  }

  // where the subject sits: centred in the space beside the text column
  // (measured, so it holds from 1024 px to 21:9), above the text on phones
  var colEdge = new Map();
  function measureCols() {
    worldSecs.forEach(function (s) {
      var c = $('.col, .hero-copy', s);
      if (c) { var r = c.getBoundingClientRect(); colEdge.set(s, [r.left, r.right]); }
    });
  }
  function frameFor(sec) {
    var f = sec.getAttribute('data-frame'), shot = sec.getAttribute('data-shot');
    if (vw < PHONE_W) return [0, shot === 'journey' || shot === 'services' ? -0.3 : -0.2];
    var e = colEdge.get(sec);
    if (f === 'right') return e ? [clamp((e[1] + vw) / 2 / vw - 0.5, -0.32, 0.32), 0] : [0.21, 0];
    if (f === 'left') return e ? [clamp(e[0] / 2 / vw - 0.5, -0.32, 0.32), 0] : [-0.21, 0];
    return [0.04, -0.12];
  }

  /* --------------------------------------------------- scroll → story */
  var lastChapter = null, last = {};
  var hoverQuote = -1;   // a story postcard under the pointer wins over scroll
  // mark the item being read (class is-on) and tell the world once per change
  function track1(key, els, list, line, fn) {
    var i = activeIndex(list, line);
    if (last[key] === i) return;
    last[key] = i;
    els.forEach(function (el, j) { el.classList.toggle('is-on', j === i); });
    fn(i);
  }
  // The dock (Tutee AI, WhatsApp) appears from the second section on: once
  // 3/4 of the hero is behind the visitor. Its own scroll listener, not tied
  // to animation frames, so it can't lag behind on a busy device.
  // The state lives on the dock itself: toggling a class on <html> while
  // scrolling would restyle the whole page. flag.js puts in-hero on <html>
  // for the first paint; it is handed to the dock once, here, at start-up.
  var heroEl = document.querySelector('.uk-hero'), heroH = 0, dockEl = document.querySelector('.dock');
  if (dockEl) { dockEl.classList.toggle('in-hero', root.classList.contains('in-hero')); root.classList.remove('in-hero'); }
  function syncDock() {
    if (!dockEl) return;
    if (!heroEl) { dockEl.classList.remove('in-hero'); return; }
    if (!heroH) heroH = heroEl.offsetHeight;
    var on = window.pageYOffset < heroH * 0.75;
    if (on !== dockEl.classList.contains('in-hero')) dockEl.classList.toggle('in-hero', on);
  }
  window.addEventListener('scroll', syncDock, { passive: true });
  window.addEventListener('resize', function () { heroH = 0; syncDock(); });
  window.addEventListener('load', function () { heroH = 0; syncDock(); });
  syncDock();
  function update() {
    var y = window.pageYOffset, mid = y + vh * 0.5, line = y + vh * 0.6;

    // the chapter under the middle of the screen
    var cur = null;
    for (var i = 0; i < marks.length; i++) if (marks[i].top <= mid && marks[i].bottom > mid) { cur = marks[i]; break; }
    if (cur && here) {
      var name = cur.el.getAttribute('data-chapter') || '';
      if (here.textContent !== name) here.textContent = name;
    }

    // journey: steps light up; the plane flies to the step being read
    var s = 0;
    if (parts.steps.length) {
      var k = activeIndex(parts.steps, line);
      if (k >= 0) {
        var st = parts.steps[k], next = parts.steps[k + 1];
        var span = next ? next.top - st.top : st.h;
        s = k + clamp((line - st.top) / Math.max(1, span), 0, 1);
      }
      if (k !== last.step) {
        last.step = k;
        steps.forEach(function (el, j) { el.classList.toggle('is-on', j <= k); });
      }
      if (stepsList) stepsList.style.setProperty('--route', (s / steps.length).toFixed(3));
    }

    if (!world || !cur) return;
    var sec = cur.el, shot = sec.getAttribute('data-shot');
    // a solid chapter (news, FAQ) keeps the last scene; the world pauses while hidden
    if (!shot) return;
    var idx = worldSecs.indexOf(sec), prev = idx > 0 ? worldSecs[idx - 1].getAttribute('data-shot') : shot;
    var tt = clamp((mid - cur.top) / (vh * 0.7), 0, 1);
    world.setView(prev, shot, tt);
    // a short dip of the canvas while the scene changes (sets swap at the midpoint)
    var dip = world.setOf(prev) !== world.setOf(shot) && !reduce ? clamp(1 - Math.abs(tt - 0.5) / 0.16, 0, 1) : 0;
    if (canvasEl && root.classList.contains('world-live')) canvasEl.style.opacity = (1 - 0.92 * dip).toFixed(3);
    var fr = frameFor(sec); world.setFrame(fr[0], fr[1]);
    if (lastChapter !== shot) {
      lastChapter = shot;
      last = { step: last.step };
      world.setSteps([], 0);
      world.setFocus(({ why: 0.4, services: 0.9, funding: 0.6, worries: 0.9 }[shot] || 0) * (vw < PHONE_W ? 0.35 : vw < 1100 ? 0.55 : 1));
      if (shot === 'why') syncNation();
      if (shot === 'universities') syncCity();
    }

    if (shot === 'worries') track1('worry', worries, parts.worries, line, function (i) { world.setWorry(i); });
    else if (shot === 'journey') {
      var r = routeFor(s);
      world.setRoute(r[0], r[1]);
      world.setSteps(s > 0 ? [clamp(Math.floor(s), 0, 7)] : [], vw < PHONE_W ? 0.25 : 0.35);
    }
    else if (shot === 'services') track1('svc', svcItems, parts.svcs, line, function (i) { world.setService(i); });
    else if (shot === 'funding') track1('grant', grants, parts.grants, line, function (i) { world.setGrant(i); });
    else if (shot === 'settle') track1('rung', rungs, parts.rungs, line, function (i) { world.setStair(i); });
    else if (shot === 'stories') {
      var q = hoverQuote >= 0 ? hoverQuote : activeIndex(parts.quotes, line);
      if (q !== last.quote) {
        last.quote = q;
        quotes.forEach(function (el, j) { el.classList.toggle('is-on', j === q); });
        world.setStory(q);
      }
    }
  }
  var ticking = false;
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; update(); }); } }
  function remeasure() { measure(); onScroll(); }

  /* ------------------------------------------------- nation tabs (why) */
  var NATION_IMG = {
    england: ['oxford', 'The Radcliffe Camera, Oxford, England', 'Oxford, England', 'Oxford, Cambridge and London\'s world-famous universities'],
    scotland: ['edinburgh', 'Edinburgh Castle on Castle Rock, Scotland', 'Edinburgh, Scotland', 'Edinburgh, Glasgow and St Andrews; undergraduate degrees usually take four years'],
    wales: ['cardiff', 'Cardiff Castle, Wales', 'Cardiff, Wales', 'Cardiff, Swansea and Bangor, with coast and countryside close by'],
    ni: ['belfast', 'Titanic Belfast, Northern Ireland', 'Belfast, Northern Ireland', 'Queen\'s University Belfast and Ulster University']
  };
  var nationTabs = $$('[data-nation]'), nationPanel = $('[data-nation-panel]'), nationImg = $('[data-nation-img]'), nationCap = $('[data-nation-cap]'), nationLine = $('[data-nation-line]');
  var nation = 'england';
  function syncNation() { if (world) world.setNation(nation); }
  var nationReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var nationTabsBox = nationTabs.length ? nationTabs[0].parentNode : null, nationPill = null, nationToken = 0;
  // a white pill that glides to the selected tab
  function placePill(instant) {
    if (!nationTabsBox) return;
    if (!nationPill) { nationPill = document.createElement('span'); nationPill.className = 'wy-pill'; nationPill.setAttribute('aria-hidden', 'true'); nationTabsBox.insertBefore(nationPill, nationTabsBox.firstChild); nationTabsBox.classList.add('has-pill'); }
    var sel = $('[aria-selected="true"]', nationTabsBox);
    if (!sel) return;
    if (instant) nationPill.style.transition = 'none';
    nationPill.style.width = sel.offsetWidth + 'px'; nationPill.style.height = sel.offsetHeight + 'px';
    nationPill.style.transform = 'translate(' + sel.offsetLeft + 'px,' + sel.offsetTop + 'px)';
    if (instant) { void nationPill.offsetWidth; nationPill.style.transition = ''; }
  }
  function setNationText(d) {
    nationImg.alt = d[1]; nationCap.textContent = d[2];
    if (nationLine && d[3]) nationLine.textContent = d[3];
  }
  function chooseNation(id, focus) {
    if (id === nation && !focus) return;
    nation = id;
    nationTabs.forEach(function (b) {
      var on = b.getAttribute('data-nation') === id;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
      if (on) { nationPanel.setAttribute('aria-labelledby', b.id); if (focus) b.focus(); }
    });
    placePill(false);
    var d = NATION_IMG[id], base = './assets/img/hero/' + d[0], token = ++nationToken;
    var srcset = base + '-828.webp 828w, ' + base + '-1280.webp 1280w', src = base + '-828.webp';
    var cap = nationCap.closest('figcaption');
    if (nationReduce) { nationImg.srcset = srcset; nationImg.src = src; setNationText(d); syncNation(); return; }
    // caption slides out now, and back in with the new photo
    if (cap) cap.classList.add('is-out');
    // the new photo is loaded and decoded off-screen, then crossfades in over
    // the old one with a slow settle from a slight zoom; only then does the
    // base image take its place, so there is never a blank or half-drawn frame
    var next = new Image();
    next.className = 'np-next'; next.alt = ''; next.decoding = 'async';
    next.sizes = nationImg.getAttribute('sizes') || '100vw'; next.srcset = srcset; next.src = src;
    var shown = false;
    function show() {
      if (shown || token !== nationToken) return; shown = true;
      $$('.np-next', nationPanel).forEach(function (o) { o.remove(); });
      nationPanel.appendChild(next);
      void next.offsetWidth;
      next.classList.add('is-in');
      setTimeout(function () { if (token !== nationToken) return; setNationText(d); if (cap) cap.classList.remove('is-out'); }, 260);
      setTimeout(function () {
        if (token !== nationToken) return;
        nationImg.srcset = srcset; nationImg.src = src;
        var done = function () { if (token === nationToken) next.remove(); };
        if (nationImg.decode) nationImg.decode().then(done, done); else done();
      }, 950);
    }
    if (next.decode) next.decode().then(show, show); else { next.onload = next.onerror = show; }
    setTimeout(show, 1500);   // never wait longer than this for a slow photo
    syncNation();
  }
  window.addEventListener('resize', function () { placePill(true); });
  window.addEventListener('load', function () { placePill(true); });
  placePill(true);
  nationTabs.forEach(function (b, i) {
    b.addEventListener('click', function () { chooseNation(b.getAttribute('data-nation')); });
    b.addEventListener('keydown', function (e) {
      var d = 0;   // how many tabs to move by
      switch (e.key) {
        case 'ArrowRight': d = 1; break;
        case 'ArrowLeft': d = -1; break;
        case 'Home': d = -i; break;
        case 'End': d = nationTabs.length - 1 - i; break;
      }
      if (!d) return;
      e.preventDefault();
      chooseNation(nationTabs[(i + d + nationTabs.length) % nationTabs.length].getAttribute('data-nation'), true);
    });
  });

  /* ------------------------------------------- city chips ↔ 3D pins */
  function cityIdOf(text) { return String(text || '').trim().toLowerCase(); }
  function syncCity() {
    if (!world) return;
    var sel = $('[data-city-chips] [aria-selected="true"]');
    world.setCity(sel ? cityIdOf(sel.textContent) : null);
  }
  function watchChips() {
    var box = $('[data-city-chips]');
    if (!box || !('MutationObserver' in window)) return;
    new MutationObserver(syncCity).observe(box, { subtree: true, attributes: true, attributeFilter: ['aria-selected'] });
  }

  /* ------------------------------------------------ stories: hover */
  quotes.forEach(function (q, i) {
    q.addEventListener('pointerenter', function () { hoverQuote = i; onScroll(); });
    q.addEventListener('pointerleave', function () { hoverQuote = -1; onScroll(); });
  });

  /* ------------------------------------------- services: Read more */
  svcItems.forEach(function (it) {
    var btn = $('.svc-btn', it), extra = $('.svc-extra', it);
    if (!btn || !extra) return;
    btn.hidden = false;
    btn.setAttribute('aria-expanded', 'false');
    extra.hidden = true;
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      extra.hidden = !open;
      $('span', btn).textContent = open ? 'Read less' : 'Read more';
      measure(); if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
  });

  /* ------------------------------------------------------ the world */
  // flag.js decides before the first paint whether the 3D layout is used
  // (html.world-on) so the columns never jump; here it is loaded and, if
  // anything fails, the page falls back to its 2D layout.
  function fallback(reason) {
    if (world) { try { world.dispose(); } catch (e) { /* already gone */ } }
    world = null;
    root.classList.remove('world-on', 'world-ready');
    root.classList.add('world-off');
    root.setAttribute('data-world-fallback', reason || 'error');
    setTimeout(function () { measure(); update(); if (window.ScrollTrigger) ScrollTrigger.refresh(); }, 0);
  }
  function loadWorld() {
    if (!root.classList.contains('world-on')) return;
    var canvas = canvasEl = $('[data-world-canvas]'), labels = $('[data-world-labels]');
    var url = new URL('world.js', SCRIPT_URL).href;
    import(url).then(function (m) {
      if (!m.supported()) { fallback('no-webgl'); return; }
      // postcard cities, in page order, for the stories scene
      var cities = quotes.map(function (q) { var pm = $('.postmark', q); return pm ? pm.textContent.trim() : 'UK'; });
      world = m.mountWorld(canvas, { labels: labels, mobile: vw < PHONE_W, reduced: reduce, stories: cities });
      world.onLost(function () { fallback('context-lost'); });
      // the page wash behind the text column takes the scene's colour
      world.onWash(function (hex) {
        // only light washes are used behind dark text (dusk scenes have their own night wash)
        var n = parseInt(hex.slice(1), 16), lum = (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
        if (lum > 0.82) root.style.setProperty('--wash', hex);
      });
      syncNation(); syncCity();
      lastChapter = null;
      update();
      requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('world-ready'); }); });
      // after the first fade-in the canvas opacity follows the scroll directly
      setTimeout(function () { root.classList.add('world-live'); }, 1000);
      // the world only draws while a world chapter is on screen
      if ('IntersectionObserver' in window) {
        var visible = new Set();
        var syncActive = function () { if (world) world.setActive(visible.size > 0 && !document.hidden); };
        var io = new IntersectionObserver(function (es) {
          es.forEach(function (e) { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); });
          syncActive();
        }, { rootMargin: '10% 0px' });
        worldSecs.forEach(function (s) { io.observe(s); });
        document.addEventListener('visibilitychange', syncActive);
      }
      if (fine && !reduce) {
        var px = 0, py = 0, pend = false;
        window.addEventListener('pointermove', function (e) {
          px = e.clientX / vw * 2 - 1; py = e.clientY / vh * 2 - 1;
          if (!pend) { pend = true; requestAnimationFrame(function () { pend = false; if (world) world.setPointer(px, -py); }); }
        }, { passive: true });
      }
      track('world_ready', { mobile: vw < 760 });
    }).catch(function () { fallback('load-failed'); });
  }

  /* ------------------------------------------ contents: focus trap */
  // landing.js opens/closes the contents overlay (and Esc closes it); this
  // keeps Tab inside it while it is open, as a modal dialog should.
  function trapMenu() {
    var menu = $('[data-menu]');
    if (!menu) return;
    menu.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || !menu.classList.contains('is-open')) return;
      var f = $$('a[href], button:not([disabled])', menu).filter(function (el) { return el.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ------------------------------------------------- tracking hooks */
  function initTracking() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-track]');
      if (!a) return;
      var where = a.getAttribute('data-track');
      if (where === 'whatsapp') {
        var box = a.closest('section, footer, .dock');
        track('whatsapp_click', { location: box ? (box.id || box.className.split(' ')[0]) : '' });
      } else if (where === 'chat') track('chat_open', { location: 'dock' });
      else track('cta_click', { location: where, intent: a.getAttribute('data-intent') || '' });
    });
    var form = $('form[data-lead-form]');
    if (!form) return;
    var started = false;
    form.addEventListener('focusin', function () { if (!started) { started = true; track('form_start'); } });
    var step2 = $('[data-wiz="2"]', form), done = $('[data-form-done]', form), err = $('[data-form-err]', form);
    if ('MutationObserver' in window) {
      if (step2) new MutationObserver(function () { if (step2.classList.contains('is-on')) track('form_step2'); }).observe(step2, { attributes: true, attributeFilter: ['class'] });
      if (done) new MutationObserver(function () { if (!done.hidden) track('form_submit_success'); }).observe(done, { attributes: true, attributeFilter: ['hidden'] });
      if (err) new MutationObserver(function () { if (err.classList.contains('is-on')) track('form_submit_error'); }).observe(err, { attributes: true, attributeFilter: ['class'] });
    }
  }

  /* ------------------------------------------------------------ boot */
  function boot() {
    measure();
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', remeasure);
    window.addEventListener('load', remeasure);
    if (window.ScrollTrigger) ScrollTrigger.addEventListener('refresh', remeasure);
    if ('ResizeObserver' in window) { var t = 0; new ResizeObserver(function () { clearTimeout(t); t = setTimeout(remeasure, 120); }).observe($('main')); }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);
    watchChips();
    trapMenu();
    initTracking();
    // the world waits for the page to be idle after load, so it never
    // competes with the first paint or the form
    var go = function () { (window.requestIdleCallback || function (f) { setTimeout(f, 200); })(loadWorld, { timeout: 2500 }); };
    if (document.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

/* Funding section: route tabs (arrow keys move between them) and the
 * "free funding check" picker, which updates the button label and the
 * topic the form is opened with. */
(function () {
  'use strict';
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-fd-tab]'));
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function show(i, focus) {
    tabs.forEach(function (t, j) {
      var on = j === i, p = document.getElementById(t.getAttribute('aria-controls'));
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      if (p) {
        p.hidden = !on;
        if (on && !reduce) { p.classList.remove('is-in'); void p.offsetWidth; p.classList.add('is-in'); }
      }
    });
    if (focus) tabs[i].focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { show(i); });
    t.addEventListener('keydown', function (e) {
      var d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (e.key === 'Home') d = -i; else if (e.key === 'End') d = tabs.length - 1 - i;
      if (!d) return;
      e.preventDefault();
      show((i + d + tabs.length) % tabs.length, true);
    });
  });

  var pick = document.querySelector('[data-fd-pick]'), cta = document.querySelector('[data-fd-cta]'), ctaT = document.querySelector('[data-fd-cta-t]');
  if (!pick || !cta) return;
  var btns = Array.prototype.slice.call(pick.querySelectorAll('button'));
  function sync() {
    var on = btns.filter(function (b) { return b.getAttribute('aria-pressed') === 'true'; }).map(function (b) { return b.getAttribute('data-need'); });
    var label = on.length > 1 ? 'Get my funding plan' : ({ scholarships: 'Check my scholarships', grants: 'Match me to grants', loan: 'Check loan eligibility' })[on[0]];
    var intent = on.length === 1 && on[0] === 'loan' ? 'Education Loan' : 'Scholarships & Grants';
    ctaT.textContent = label;
    cta.setAttribute('data-intent', intent);
  }
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      var pressed = b.getAttribute('aria-pressed') === 'true';
      var count = btns.filter(function (x) { return x.getAttribute('aria-pressed') === 'true'; }).length;
      if (pressed && count === 1) return; // always keep one choice
      b.setAttribute('aria-pressed', pressed ? 'false' : 'true');
      sync();
    });
  });
  sync();
})();

/* How it works: the journey wheel. Segments are tabs; the marker turns to
 * the chosen segment and the centre shows its step. While the wheel is on
 * screen it advances every 6 s, until the visitor clicks, hovers, focuses
 * or uses the keyboard. Off with reduced motion. */
(function () {
  'use strict';
  var dial = document.querySelector('[data-wh]');
  if (!dial) return;
  var segs = Array.prototype.slice.call(dial.querySelectorAll('[data-wh-seg]'));
  var marker = dial.querySelector('[data-wh-marker]');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cur = 0, turns = 0, auto = !reduce, visible = false, timer = 0;
  function go(i, focus) {
    var prev = cur;
    cur = (i + segs.length) % segs.length;
    // keep the marker turning forwards when wrapping 8 → 1
    if (cur < prev && prev === segs.length - 1 && cur === 0) turns++;
    segs.forEach(function (g, j) {
      var on = j === cur, p = document.getElementById(g.getAttribute('aria-controls'));
      g.setAttribute('aria-selected', on ? 'true' : 'false');
      g.setAttribute('tabindex', on ? '0' : '-1');
      if (p) { p.hidden = !on; if (on && !reduce) { p.classList.remove('is-in'); void p.offsetWidth; p.classList.add('is-in'); } }
    });
    if (marker) marker.style.transform = 'rotate(' + (turns * 360 + cur * 45 + 22.5) + 'deg)';
    var mid = dial.querySelector('[data-wh-mid]'); if (mid) mid.textContent = (cur < 9 ? '0' : '') + (cur + 1);
    if (focus) segs[cur].focus();
  }
  function stop() { auto = false; clearInterval(timer); dial.classList.add('is-manual'); }
  segs.forEach(function (g, i) {
    g.addEventListener('click', function () { stop(); go(i); });
    g.addEventListener('keydown', function (e) {
      var d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stop(); go(i); return; }
      if (e.key === 'Home') d = -i; else if (e.key === 'End') d = segs.length - 1 - i;
      if (!d) return;
      e.preventDefault(); stop(); go(i + d, true);
    });
  });
  Array.prototype.forEach.call(dial.querySelectorAll('[data-wh-next]'), function (b) {
    b.addEventListener('click', function () { stop(); go(cur + 1); });
  });
  dial.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') stop(); });
  dial.addEventListener('focusin', stop);
  if (auto && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }, { threshold: 0.5 }).observe(dial);
    timer = setInterval(function () { if (auto && visible && !document.hidden) go(cur + 1); }, 6000);
  }
  go(0);
})();

/* Services: cinematic gallery. The service articles are frames in a
 * sideways reel: drag with the mouse, swipe, or use the arrows; a counter
 * and progress line follow, and the frame nearest the left edge is "on". */
(function () {
  'use strict';
  var root = document.querySelector('[data-cg]'), reel = document.querySelector('[data-cg-reel]');
  if (!root || !reel) return;
  var frames = Array.prototype.slice.call(reel.querySelectorAll('[data-svc-item]'));
  var iEl = root.querySelector('[data-cg-i]'), prog = root.querySelector('[data-cg-prog]');
  var prev = root.querySelector('[data-cg-prev]'), next = root.querySelector('[data-cg-next]');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function current() {
    var left = reel.getBoundingClientRect().left, best = 0, bd = 1e9;
    frames.forEach(function (f, i) { var d = Math.abs(f.getBoundingClientRect().left - left); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  function state() {
    var c = current(), max = reel.scrollWidth - reel.clientWidth;
    frames.forEach(function (f, i) { f.classList.toggle('is-on', i === c); });
    if (iEl) iEl.textContent = (c < 9 ? '0' : '') + (c + 1);
    if (prog) prog.style.transform = 'scaleX(' + (max > 0 ? Math.max(.08, reel.scrollLeft / max) : 1).toFixed(3) + ')';
    if (prev) prev.disabled = reel.scrollLeft <= 8;
    if (next) next.disabled = reel.scrollLeft >= max - 8;
  }
  function go(d) {
    var c = Math.max(0, Math.min(frames.length - 1, current() + d));
    reel.scrollTo({ left: frames[c].offsetLeft - frames[0].offsetLeft, behavior: reduce ? 'auto' : 'smooth' });
  }
  if (prev) prev.addEventListener('click', function () { go(-1); });
  if (next) next.addEventListener('click', function () { go(1); });
  reel.addEventListener('keydown', function (e) { if (e.target !== reel) return; if (e.key === 'ArrowRight') { e.preventDefault(); go(1); } if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } });
  reel.addEventListener('scroll', state, { passive: true });
  window.addEventListener('resize', state);
  // mouse drag (touch scrolls natively); a drag never counts as a click
  var drag = null, moved = false;
  reel.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('a, button')) return; drag = { x: e.clientX, left: reel.scrollLeft, v: 0, lx: e.clientX, t: performance.now() }; moved = false; });
  window.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x;
    if (!moved && Math.abs(dx) > 5) { moved = true; reel.classList.add('is-dragging'); }
    if (!moved) return;
    var now = performance.now(); drag.v = (e.clientX - drag.lx) / Math.max(now - drag.t, 1); drag.lx = e.clientX; drag.t = now;
    reel.scrollLeft = drag.left - dx; e.preventDefault();
  });
  function end() {
    if (!drag) return; var v = drag.v; drag = null;
    if (!moved) return;
    reel.classList.remove('is-dragging');
    if (Math.abs(v) > .2) reel.scrollBy({ left: -v * 360, behavior: reduce ? 'auto' : 'smooth' });
    setTimeout(function () { moved = false; }, 0);
  }
  window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
  reel.addEventListener('click', function (e) { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
  reel.addEventListener('dragstart', function (e) { e.preventDefault(); });
  root.classList.add('is-ready');
  state();
})();

/* Services pop-up: "Read more" on a reel frame opens a cinema-style dialog
 * with the photo, full text (including the extra detail) and the Request
 * button; arrows browse the other services. Built on <dialog>, so focus,
 * Escape and the backdrop behave natively. */
(function () {
  'use strict';
  var reel = document.querySelector('[data-cg-reel]');
  if (!reel || !window.HTMLDialogElement) return;
  var frames = Array.prototype.slice.call(reel.querySelectorAll('[data-svc-item]'));
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var dlg = document.createElement('dialog');
  dlg.className = 'sp'; dlg.setAttribute('aria-labelledby', 'sp-title');
  dlg.innerHTML = '<span class="sp-bar sp-bar-t" aria-hidden="true"></span><span class="sp-bar sp-bar-b" aria-hidden="true"></span>' +
    '<div class="sp-box"><figure class="sp-fig"><img alt="" data-sp-img><span class="sp-n" data-sp-n></span></figure>' +
    '<div class="sp-body"><p class="sp-k" data-sp-k>Service</p><h3 id="sp-title" data-sp-title></h3><p class="sp-tag" data-sp-tag></p>' +
    '<div class="sp-text" data-sp-text></div>' +
    '<div class="sp-actions"><a class="btn btn-red btn-lg" href="#contact" data-goto data-sp-req><span>Request this service</span><svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></a></div>' +
    '<div class="sp-nav"><button type="button" class="sp-arrow" data-sp-prev aria-label="Previous service"><svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></button>' +
    '<span class="sp-count" data-sp-count></span>' +
    '<button type="button" class="sp-arrow" data-sp-next aria-label="Next service"><svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></button></div></div>' +
    '<button type="button" class="sp-x" data-sp-close aria-label="Close"><svg class="icon" aria-hidden="true"><use href="#i-x"/></svg></button></div>';
  document.body.appendChild(dlg);
  var $d = function (s) { return dlg.querySelector(s); };
  var cur = 0;
  function fill(i) {
    cur = (i + frames.length) % frames.length;
    var f = frames[cur], name = f.querySelector('.svc-name'), img = f.querySelector('.svc-img-inline');
    $d('[data-sp-img]').src = img ? (img.currentSrc || img.src) : '';
    $d('[data-sp-n]').textContent = (cur < 9 ? '0' : '') + (cur + 1);
    $d('[data-sp-title]').textContent = name.firstChild.textContent.trim();
    $d('[data-sp-tag]').textContent = name.querySelector('small') ? name.querySelector('small').textContent : '';
    $d('[data-sp-k]').textContent = 'Service ' + (cur + 1) + ' of ' + frames.length;
    var text = $d('[data-sp-text]'); text.innerHTML = '';
    var p = f.querySelector('.svc-text > p'), x = f.querySelector('.svc-extra');
    if (p) text.appendChild(p.cloneNode(true));
    if (x) Array.prototype.forEach.call(x.querySelectorAll('p'), function (q) { text.appendChild(q.cloneNode(true)); });
    var req = f.querySelector('.svc-req');
    $d('[data-sp-req]').setAttribute('data-intent', req ? req.getAttribute('data-intent') : 'Career Consultation');
    $d('[data-sp-count]').textContent = (cur + 1) + ' / ' + frames.length;
    var box = $d('.sp-box');
    if (!reduce) { box.classList.remove('is-swap'); void box.offsetWidth; box.classList.add('is-swap'); }
    text.scrollTop = 0;
  }
  var opener = null;
  function open(i, from) {
    opener = from || null;
    fill(i);
    dlg.showModal();
    document.documentElement.classList.add('sp-open');
    if (!reduce) { dlg.classList.remove('is-in'); void dlg.offsetWidth; dlg.classList.add('is-in'); }
  }
  function close() {
    if (!dlg.open) return;
    if (reduce) { dlg.close(); return; }
    dlg.classList.add('is-out');
    setTimeout(function () { dlg.classList.remove('is-out', 'is-in'); dlg.close(); }, 320);
  }
  dlg.addEventListener('close', function () { document.documentElement.classList.remove('sp-open'); if (opener) opener.focus(); });
  dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
  $d('[data-sp-close]').addEventListener('click', close);
  $d('[data-sp-prev]').addEventListener('click', function () { fill(cur - 1); });
  $d('[data-sp-next]').addEventListener('click', function () { fill(cur + 1); });
  dlg.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight' && !e.target.closest('a')) fill(cur + 1); if (e.key === 'ArrowLeft' && !e.target.closest('a')) fill(cur - 1); });
  // the Request button closes the pop-up before the page moves to the form
  $d('[data-sp-req]').addEventListener('click', function () { opener = null; dlg.classList.remove('is-in'); dlg.close(); });
  // take over the frames' "Read more" buttons (capture, before the old toggle)
  reel.addEventListener('click', function (e) {
    var b = e.target.closest('.svc-btn');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    open(frames.indexOf(b.closest('[data-svc-item]')), b);
  }, true);
  frames.forEach(function (f) {
    var b = f.querySelector('.svc-btn'), x = f.querySelector('.svc-extra');
    if (x) x.hidden = true;
    if (b) { b.hidden = false; b.setAttribute('aria-haspopup', 'dialog'); b.removeAttribute('aria-expanded'); var s = b.querySelector('span'); if (s) s.textContent = 'Read more'; }
  });
})();

/* Settle: the house builds itself (floors drop in from the ground up,
 * windows light, roof lands) when it comes into view. A timer check backs
 * up the observer so it can never stay unbuilt. */
(function () {
  'use strict';
  var hs = document.querySelector('[data-hs]');
  if (!hs) return;
  var root = document.documentElement;
  if (!root.classList.contains('motion')) { hs.classList.add('is-built'); return; }
  hs.classList.add('is-waiting');
  function build() { if (hs.classList.contains('is-built')) return; hs.classList.remove('is-waiting'); hs.classList.add('is-built'); clearInterval(t); }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { if (es[0].isIntersecting) build(); }, { threshold: 0.3 }).observe(hs);
  var t = setInterval(function () { var r = hs.getBoundingClientRect(); if (r.top < window.innerHeight * 0.8 && r.bottom > 0) build(); }, 700);
})();

/* Settle: the four storeys are buttons; choosing one shows its rules in
 * the panel beside the house. Arrow keys move between storeys. */
(function () {
  'use strict';
  var picks = Array.prototype.slice.call(document.querySelectorAll('[data-hs-pick]'));
  if (!picks.length) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cur = 1;
  function show(n, focus) {
    cur = Math.max(1, Math.min(4, n));
    picks.forEach(function (b) { var on = +b.getAttribute('data-hs-pick') === cur; b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.classList.toggle('is-on', on); var row = b.closest('.hs-row'); if (row) row.classList.toggle('is-on', on); if (on && focus) b.focus(); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-hs-panel]'), function (p) {
      var on = +p.getAttribute('data-hs-panel') === cur;
      p.hidden = !on;
      if (on && !reduce) { p.classList.remove('is-in'); void p.offsetWidth; p.classList.add('is-in'); }
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-hs-step]'), function (b) { var d = +b.getAttribute('data-hs-step'); b.disabled = (d < 0 && cur === 1) || (d > 0 && cur === 4); });
  }
  picks.forEach(function (b) {
    b.addEventListener('click', function () { show(+b.getAttribute('data-hs-pick')); });
    b.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(+b.getAttribute('data-hs-pick')); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); show(cur + 1, true); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(cur - 1, true); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); show(cur + 1, true); }
      if (e.key === 'ArrowDown') { e.preventDefault(); show(cur - 1, true); }
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-hs-step]'), function (b) {
    b.addEventListener('click', function () { show(cur + (+b.getAttribute('data-hs-step'))); });
  });
  show(1);
})();

/* Settle game: levels you open become "explored" (gold), the XP bar
 * fills, and exploring all four shows the achievement. Listens to the
 * level buttons' aria-pressed, which the stage picker sets. */
(function () {
  'use strict';
  var gm = document.querySelector('[data-gm]');
  if (!gm) return;
  var lvls = Array.prototype.slice.call(gm.querySelectorAll('.gm-lvl'));
  var xp = gm.querySelector('[data-gm-xp]'), nEl = gm.querySelector('[data-gm-n]'), win = gm.querySelector('[data-gm-win]');
  var seen = {};
  // the travelling route: a gold trail drawn along the path up to the chosen
  // level, with a glowing comet that runs between levels
  var trail = gm.querySelector('[data-gm-trail]'), glow = gm.querySelector('[data-gm-glow]'), comet = gm.querySelector('[data-gm-comet]');
  var reduceG = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var STOPS = { 1: [22, 86], 2: [70, 66], 3: [30, 44], 4: [70, 22], 5: [44, 7] };
  var total = 0, at = {}, pos = 0, raf = 0;
  // where each level sits along the trail. Measured once from the path below
  // (sampling getPointAtLength 2,000 times on load cost ~0.6s of main thread
  // on a phone); recomputed only if the path is ever edited.
  var PATH_D = 'M22 86 C 46 86, 46 66, 70 66 C 94 66, 54 44, 30 44 C 6 44, 46 22, 70 22 C 92 22, 64 7, 44 7';
  var AT = { 1: 0, 2: 53.36, 3: 114.72, 4: 176.04, 5: 222.49 };
  if (trail && trail.getTotalLength) {
    total = trail.getTotalLength();
    if (trail.getAttribute('d') === PATH_D) at = AT;
    else Object.keys(STOPS).forEach(function (k) {   // nearest point on the path to each level
      var best = 0, bd = 1e9, p = STOPS[k];
      for (var L = 0; L <= total; L += total / 120) { var q = trail.getPointAtLength(L), d = (q.x - p[0]) * (q.x - p[0]) + (q.y - p[1]) * (q.y - p[1]); if (d < bd) { bd = d; best = L; } }
      at[k] = best;
    });
  }
  function place(L) {
    var f = total ? L / total : 0;
    [trail, glow].forEach(function (p) { if (p) p.style.strokeDashoffset = (1000 * (1 - f)).toFixed(1); });
    if (comet && trail && total) { var q = trail.getPointAtLength(L); comet.style.left = q.x + '%'; comet.style.top = q.y + '%'; }
  }
  function travel(k) {
    if (!total || at[k] == null) return;
    gm.classList.remove('is-reached');
    var from = pos, to = at[k], t0 = 0, dur = Math.min(1400, 450 + Math.abs(to - from) * 9);
    cancelAnimationFrame(raf);
    if (reduceG) { pos = to; place(to); gm.classList.toggle('is-reached', k === 5); return; }
    gm.classList.add('is-moving');
    function step(ts) {
      if (!t0) t0 = ts;
      var e = Math.min(1, (ts - t0) / dur), k2 = e < .5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2;
      pos = from + (to - from) * k2; place(pos);
      if (e < 1) raf = requestAnimationFrame(step); else { gm.classList.remove('is-moving'); gm.classList.toggle('is-reached', k === 5); }
    }
    raf = requestAnimationFrame(step);
    setTimeout(function () { if (Math.abs(pos - to) > .5) { pos = to; place(to); gm.classList.remove('is-moving'); gm.classList.toggle('is-reached', k === 5); } }, dur + 400);
  }
  place(0);
  function mark(b) {
    // ILR (level 4) always runs on past the level to the medal at the top
    var lv = +b.getAttribute('data-hs-pick');
    travel(lv === 4 ? 5 : lv);
    var n = b.getAttribute('data-hs-pick');
    if (!seen[n]) {
      seen[n] = true;
      b.classList.add('is-done');
      b.classList.remove('is-pop'); void b.offsetWidth; b.classList.add('is-pop');
    }
    var c = Object.keys(seen).length;
    if (xp) xp.style.transform = 'scaleX(' + (c / lvls.length) + ')';
    if (nEl) nEl.textContent = c;
    if (c === lvls.length && win && win.hidden) { win.hidden = false; gm.classList.add('is-won'); }
  }
  lvls.forEach(function (b) {
    // a click marks it straight away; the observer catches Previous/Next and keyboard moves
    b.addEventListener('click', function () { mark(b); });
    new MutationObserver(function () { if (b.getAttribute('aria-pressed') === 'true') mark(b); }).observe(b, { attributes: true, attributeFilter: ['aria-pressed'] });
    if (b.getAttribute('aria-pressed') === 'true') mark(b);
  });
})();

/* Student stories: moving reviews. Two rows of review cards drifting in
 * opposite directions; they pause on hover/focus and can be paused with a
 * button. Each row's set is repeated once (aria-hidden) for a seamless loop.
 * Built from the quote figures, which stay as the no-JS fallback. */
(function () {
  'use strict';
  var rl = document.querySelector('[data-rl]');
  if (!rl) return;
  var grid = document.querySelector('.uk-quote-grid');
  var figs = Array.prototype.slice.call(document.querySelectorAll('.uk-quote-grid .quote'));
  if (!figs.length) return;
  var TONES = ['#0b1b3a', '#c8102e', '#3a5a8c', '#7a1f2b', '#1f4e5f'];
  function card(f, i) {
    var li = document.createElement('li'); li.className = 'rl-card';
    var name = ((f.querySelector('figcaption b') || {}).textContent || '').trim();
    var st = f.querySelector('.stars');
    li.innerHTML = '<span class="rl-stars" role="img"></span><blockquote class="rl-q"></blockquote>' +
      '<p class="rl-who"><span class="rl-av" aria-hidden="true"></span><span><b></b><small></small></span></p>';
    var s = li.querySelector('.rl-stars'); s.textContent = st ? st.textContent : '\u2605\u2605\u2605\u2605\u2605';
    s.setAttribute('aria-label', st ? st.getAttribute('aria-label') : '5 out of 5 stars');
    li.querySelector('.rl-q').textContent = '\u201C' + ((f.querySelector('blockquote') || {}).textContent || '').trim().replace(/^"|"$/g, '') + '\u201D';
    var av = li.querySelector('.rl-av'); av.textContent = name.charAt(0); av.style.background = TONES[i % TONES.length];
    li.querySelector('b').textContent = name;
    li.querySelector('small').textContent = ((f.querySelector('figcaption span') || {}).textContent || '').trim();
    return li;
  }
  var rows = [figs.slice(0, 5), figs.slice(5)];
  rows.forEach(function (set, r) {
    var wrap = document.createElement('div'); wrap.className = 'rl-row' + (r ? ' rl-rev' : '');
    var track = document.createElement('div'); track.className = 'rl-track';
    // Cards alternate white / navy. The repeating unit must hold an even
    // number of cards or two of the same colour meet at the loop seam, so an
    // odd set is doubled (the repeat is hidden from screen readers).
    var unit = set.length % 2 ? set.concat(set) : set;
    for (var copy = 0; copy < 2; copy++) {
      var ul = document.createElement('ul'); ul.className = 'rl-set';
      if (copy) { ul.setAttribute('aria-hidden', 'true'); ul.inert = true; }
      unit.forEach(function (f, k) {
        var li = card(f, r * 5 + (k % set.length));
        if ((k + r) % 2) li.classList.add('rl-dark');
        if (!copy && k >= set.length) li.setAttribute('aria-hidden', 'true');
        ul.appendChild(li);
      });
      track.appendChild(ul);
    }
    wrap.appendChild(track); rl.appendChild(wrap);
  });
  var btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'rl-toggle'; btn.setAttribute('aria-pressed', 'false'); btn.textContent = 'Pause reviews';
  btn.addEventListener('click', function () { var p = rl.classList.toggle('is-paused'); btn.setAttribute('aria-pressed', p); btn.textContent = p ? 'Play reviews' : 'Pause reviews'; });
  rl.appendChild(btn);
  rl.hidden = false; if (grid) grid.hidden = true;
})();

/* UK news ticker: pause / play button (hover and keyboard focus also pause). */
(function () {
  'use strict';
  var sec = document.querySelector('.nt'), btn = sec && sec.querySelector('[data-nt-toggle]');
  if (!btn) return;
  btn.addEventListener('click', function () {
    var p = sec.classList.toggle('is-paused');
    btn.setAttribute('aria-pressed', p); btn.textContent = p ? 'Play' : 'Pause';
  });
})();

/* FAQ: flip tiles. Each question is a tile (number, icon, question); choosing
 * it flips the tile in 3D to show the answer on the back. One tile open at a
 * time. Built from the .faq-item markup, which stays as the no-JS fallback;
 * answers are copied from that same static markup. */
(function () {
  'use strict';
  var main = document.querySelector('#faq .faq-main');
  var items = Array.prototype.slice.call(document.querySelectorAll('#faq .faq-item'));
  if (!main || !items.length) return;
  var ICONS = ['i-cap', 'i-book', 'i-shield', 'i-clock', 'i-briefcase', 'i-award', 'i-trend', 'i-bank', 'i-key'];
  var grid = document.createElement('ul'); grid.className = 'ft-grid';
  var tiles = items.map(function (it, i) {
    var q = it.querySelector('.faq-t').textContent.trim(), tag = (it.querySelector('.faq-tag') || {}).textContent || '';
    var n = (i < 9 ? '0' : '') + (i + 1), id = 'ft-b' + i;
    var li = document.createElement('li'); li.className = 'ft';
    li.innerHTML = '<div class="ft-in">' +
      '<button type="button" class="ft-face ft-front" aria-expanded="false" aria-controls="' + id + '">' +
        '<span class="ft-top"><span class="ft-n">' + n + '</span><span class="ft-ic" aria-hidden="true"><svg class="icon"><use href="#' + (ICONS[i] || 'i-msg') + '"/></svg></span></span>' +
        '<span class="ft-tag"></span><span class="ft-q"></span>' +
        '<span class="ft-cue">See the answer<svg class="icon icon-sm" aria-hidden="true"><use href="#i-refresh"/></svg></span></button>' +
      '<div class="ft-face ft-back" id="' + id + '" role="region">' +
        '<div class="ft-body"><p class="ft-bq"></p><div class="ft-a"></div>' +
        '<div class="ft-actions"><a class="ft-cta" href="#contact" data-goto data-track="faq-tile">Talk to a counsellor<svg class="icon icon-sm" aria-hidden="true"><use href="#i-arrow"/></svg></a>' +
        '</div></div></div></div>';
    li.querySelector('.ft-tag').textContent = tag;
    li.querySelector('.ft-q').textContent = q;
    li.querySelector('.ft-bq').textContent = q;
    li.querySelector('.ft-back').setAttribute('aria-label', 'Answer: ' + q);
    var box = li.querySelector('.ft-a');
    Array.prototype.slice.call(it.querySelector('.faq-a').childNodes).forEach(function (c) { box.appendChild(c.cloneNode(true)); });
    li.querySelector('.ft-front').addEventListener('click', function () { flip(i, true); });
    // a clear close (×) in the corner of the answer flips the tile back
    var x = document.createElement('button'); x.type = 'button'; x.className = 'ft-x'; x.setAttribute('aria-label', 'Close answer');
    x.innerHTML = '<svg class="icon icon-sm" aria-hidden="true"><use href="#i-x"/></svg>';
    x.addEventListener('click', function () { flip(i, false); });
    li.querySelector('.ft-body').appendChild(x);
    grid.appendChild(li); return li;
  });
  // Each tile flips over in place to show a short answer on its back.
  // One tile turned at a time; the grid itself never moves.
  var backs = tiles.map(function (t) { return t.querySelector('.ft-back'); });
  items.forEach(function (it, i) {
    var short = it.getAttribute('data-short');
    if (!short) return;
    var box = backs[i].querySelector('.ft-a'); box.innerHTML = '';
    var p = document.createElement('p'); p.textContent = short; box.appendChild(p);
  });
  // Phones show the questions as stacked strips instead: exactly one strip is
  // open at a time (the first to begin with) and opening another closes it.
  var strip = window.matchMedia('(max-width: 759px)');
  function setTurn(i, on) {
    var li = tiles[i];
    li.classList.toggle('is-turned', on);
    li.querySelector('.ft-front').setAttribute('aria-expanded', on);
    backs[i].inert = !on; li.querySelector('.ft-front').tabIndex = on && !strip.matches ? -1 : 0;
  }
  function openIndex() { return tiles.findIndex(function (t) { return t.classList.contains('is-turned'); }); }
  function flip(i, on) {
    var k = openIndex();
    if (strip.matches) {
      if (!on || k === i) return;
      if (k > -1) setTurn(k, false);
      setTurn(i, true); return;
    }
    if (on && k > -1 && k !== i) setTurn(k, false);
    setTurn(i, on);
    var f = on ? backs[i].querySelector('.ft-x') : tiles[i].querySelector('.ft-front');
    setTimeout(function () { f.focus({ preventScroll: true }); }, 80);
  }
  function reset() { tiles.forEach(function (t, i) { setTurn(i, false); }); if (strip.matches) setTurn(0, true); }
  reset();
  if (strip.addEventListener) strip.addEventListener('change', reset);
  // tapping anywhere outside the turned tile flips it back (not for strips,
  // where one always stays open)
  document.addEventListener('click', function (e) {
    if (strip.matches) return;
    var k = openIndex(); if (k > -1 && !tiles[k].contains(e.target)) flip(k, false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || strip.matches) return; var k = openIndex(); if (k > -1) flip(k, false);
  });
  // phones: the cards sit in a swipe row; dots show where you are
  var dotsEl = document.createElement('div'); dotsEl.className = 'ft-dots'; dotsEl.setAttribute('aria-hidden', 'true');
  tiles.forEach(function () { dotsEl.appendChild(document.createElement('i')); });
  function syncDots() {
    var r = grid.getBoundingClientRect(), mid = r.left + r.width / 2, best = 0, bd = 1e9;
    tiles.forEach(function (t, k) { var b = t.getBoundingClientRect(), d = Math.abs(b.left + b.width / 2 - mid); if (d < bd) { bd = d; best = k; } });
    Array.prototype.forEach.call(dotsEl.children, function (el, k) { el.classList.toggle('on', k === best); });
  }
  var dotRaf = 0;
  grid.addEventListener('scroll', function () { if (!dotRaf) dotRaf = requestAnimationFrame(function () { dotRaf = 0; syncDots(); }); }, { passive: true });
  grid.addEventListener('scrollend', function () { var k = openIndex(); if (k > -1) { var b = tiles[k].getBoundingClientRect(), r = grid.getBoundingClientRect(); if (b.right < r.left || b.left > r.right) flip(k, false); } });
  main.hidden = true; main.parentNode.insertBefore(grid, main.nextSibling); grid.parentNode.insertBefore(dotsEl, grid.nextSibling); syncDots();
  // navy / white checkerboard for whatever column count the layout has
  function paint() {
    var cols = getComputedStyle(grid).gridTemplateColumns.split(' ').filter(Boolean).length || 1;
    tiles.forEach(function (t, i) { t.classList.toggle('is-dark', ((i % cols) + Math.floor(i / cols)) % 2 === 1); });
  }
  paint(); window.addEventListener('resize', paint);
})();

/* Contact ticket: the route starts in Dubai for a UAE (+971) number and in
 * India for everything else; it always ends in the UK. */
(function () {
  'use strict';
  var sel = document.getElementById('f-code'), froms = document.querySelectorAll('[data-tk-from]'), sr = document.querySelector('[data-tk-sr]');
  if (!sel || !froms.length) return;
  function paint() {
    var dubai = sel.value === '+971';
    Array.prototype.forEach.call(froms, function (from) {
      from.querySelector('img').src = 'https://flagcdn.com/' + (dubai ? 'ae' : 'in') + '.svg';
      from.querySelector('b').textContent = dubai ? 'Dubai' : 'India';
    });
    if (sr) sr.textContent = 'From ' + (dubai ? 'Dubai' : 'India') + ' to the United Kingdom';
  }
  sel.addEventListener('change', paint); paint();
})();

/* Universities on phones: a ranked leaderboard. The city chips become one
 * dropdown (it drives the existing filter buttons), only the first six rows
 * of the current filter show until "Show all", and tapping a row opens the
 * existing details sheet. Desktop keeps the rail. */
(function () {
  'use strict';
  var sec = document.getElementById('universities');
  var grid = sec && sec.querySelector('.ug-grid'), filter = sec && sec.querySelector('.ug-filter');
  if (!grid || !filter) return;
  var phone = window.matchMedia('(max-width: 759px)'), LIMIT = 6, open = false;
  // the chips and rows are built by landing.js after this runs: wait for them
  if (!filter.querySelector('button[data-f]') || !grid.children.length) {
    var mo = new MutationObserver(function () {
      if (filter.querySelector('button[data-f]') && grid.children.length) { mo.disconnect(); setup(); }
    });
    mo.observe(sec, { childList: true, subtree: true });
    return;
  }
  setup();
  function setup() {
  var btns = Array.prototype.slice.call(filter.querySelectorAll('button[data-f]'));
  // phone rows: city · first two "known for" subjects (desktop hides this line)
  Array.prototype.slice.call(grid.children).forEach(function (li) {
    var city = li.querySelector('.ug-place b'), tags = li.querySelectorAll('.ug-tags li');
    if (!city || li.querySelector('.ug-subj')) return;
    var s = document.createElement('span'); s.className = 'ug-subj';
    s.textContent = [city.textContent.trim()].concat(Array.prototype.slice.call(tags, 0, 2).map(function (t) { return t.textContent.trim(); })).join(' · ');
    li.appendChild(s);
  });
  // dropdown mirroring the chips
  var wrap = document.createElement('label'); wrap.className = 'ug-select';
  wrap.innerHTML = '<span class="sr-only">Filter universities by city</span><select></select><svg class="icon icon-sm" aria-hidden="true"><use href="#i-down"/></svg>';
  var sel = wrap.querySelector('select');
  btns.forEach(function (b) {
    var o = document.createElement('option'), n = b.querySelector('span');
    o.value = b.getAttribute('data-f');
    o.textContent = b.firstChild.textContent.trim() + (n ? ' (' + n.textContent.trim() + ')' : '');
    if (b.getAttribute('aria-pressed') === 'true') o.selected = true;
    sel.appendChild(o);
  });
  sel.addEventListener('change', function () {
    var b = filter.querySelector('button[data-f="' + sel.value + '"]'); if (b) b.click();
    open = false; setTimeout(paint, 30);
  });
  filter.parentNode.insertBefore(wrap, filter);
  // "Show all" under the list
  var more = document.createElement('button'); more.type = 'button'; more.className = 'ug-more-btn';
  more.addEventListener('click', function () { open = !open; paint(); if (!open) sec.querySelector('.ug-bar').scrollIntoView({ block: 'start', behavior: 'smooth' }); });
  grid.parentNode.insertBefore(more, grid.nextSibling);
  function paint() {
    var vis = Array.prototype.slice.call(grid.children).filter(function (li) { return !li.hidden; });
    // rows shown before "Show all": as many as fit the phone's screen
    LIMIT = innerHeight < 620 ? 3 : innerHeight < 720 ? 4 : innerHeight < 800 ? 5 : 6;
    vis.forEach(function (li, i) { li.classList.toggle('ug-extra', phone.matches && !open && i >= LIMIT); });
    Array.prototype.slice.call(grid.children).forEach(function (li) { if (li.hidden) li.classList.remove('ug-extra'); });
    more.hidden = !phone.matches || vis.length <= LIMIT;
    more.textContent = open ? 'Show fewer' : 'Show all ' + vis.length;
    var on = filter.querySelector('button[aria-pressed="true"]'); if (on) sel.value = on.getAttribute('data-f');
  }
  filter.addEventListener('click', function () { open = false; setTimeout(paint, 30); });
  if (phone.addEventListener) phone.addEventListener('change', paint);
  window.addEventListener('resize', function () { if (!open) paint(); });
  // the whole row opens the details sheet on phones
  grid.addEventListener('click', function (e) {
    if (!phone.matches || e.target.closest('button, a')) return;
    var li = e.target.closest('.ug-card'), d = li && li.querySelector('.ug-open'); if (d) d.click();
  });
  paint();
  }
})();

/* Settle in the UK on phones: each stage panel shows its summary, and a
 * "See the rules" button opens the full rules, help and next step in place
 * (CSS hides them on phones until .is-open). Desktop shows everything. */
(function () {
  'use strict';
  var panels = Array.prototype.slice.call(document.querySelectorAll('#relocate .hs-panel'));
  panels.forEach(function (p, i) {
    if (p.querySelector('.hs-more')) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'hs-more'; b.setAttribute('aria-expanded', 'false');
    var id = p.id || ('hs-panel-' + i); p.id = id; b.setAttribute('aria-controls', id);
    b.innerHTML = '<span>See the rules &amp; how we help</span><svg class="icon icon-sm" aria-hidden="true"><use href="#i-down"/></svg>';
    b.addEventListener('click', function () {
      var on = !p.classList.contains('is-open');
      panels.forEach(function (q) { q.classList.toggle('is-open', on); var qb = q.querySelector('.hs-more'); if (qb) { qb.setAttribute('aria-expanded', on); qb.querySelector('span').textContent = on ? 'Show less' : 'See the rules & how we help'; } });
    });
    var lead = p.querySelector('.hs-p-lead');
    (lead && lead.nextSibling) ? p.insertBefore(b, lead.nextSibling) : p.appendChild(b);
  });
})();

/* Settle game on phones: each level shows one word (Study, Work, Career,
 * Settle) taken from its "Level n · Word" line; the full name stays for
 * screen readers and in the stage card below. */
(function () {
  'use strict';
  Array.prototype.slice.call(document.querySelectorAll('#relocate .gm-txt')).forEach(function (t) {
    var k = t.querySelector('small'); if (!k || t.querySelector('.gm-short')) return;
    var w = k.textContent.split('·').pop().trim();
    var s = document.createElement('span'); s.className = 'gm-short'; s.setAttribute('aria-hidden', 'true'); s.textContent = w;
    t.appendChild(s);
  });
})();
