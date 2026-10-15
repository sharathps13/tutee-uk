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
  function update() {
    var y = window.pageYOffset, mid = y + vh * 0.5, line = y + vh * 0.6;
    root.classList.toggle('at-top', y < 40);

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
      world.setFocus({ why: 0.4, services: 0.9, funding: 0.6, worries: 0.9 }[shot] || 0);
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
    england: ['oxford', 'The Radcliffe Camera, Oxford, England', 'Oxford, England'],
    scotland: ['edinburgh', 'Edinburgh Castle on Castle Rock, Scotland', 'Edinburgh, Scotland'],
    wales: ['cardiff', 'Cardiff Castle, Wales', 'Cardiff, Wales'],
    ni: ['belfast', 'Titanic Belfast, Northern Ireland', 'Belfast, Northern Ireland']
  };
  var nationTabs = $$('[data-nation]'), nationPanel = $('[data-nation-panel]'), nationImg = $('[data-nation-img]'), nationCap = $('[data-nation-cap]');
  var nation = 'england';
  function syncNation() { if (world) world.setNation(nation); }
  function chooseNation(id, focus) {
    nation = id;
    nationTabs.forEach(function (b) {
      var on = b.getAttribute('data-nation') === id;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
      if (on) { nationPanel.setAttribute('aria-labelledby', b.id); if (focus) b.focus(); }
    });
    var d = NATION_IMG[id], base = './assets/img/hero/' + d[0];
    nationPanel.classList.add('is-swap');
    // preload, then swap, so the panel never shows a half-loaded photo
    var img = new Image();
    img.onload = img.onerror = function () {
      nationImg.srcset = base + '-828.webp 828w, ' + base + '-1280.webp 1280w';
      nationImg.src = base + '-828.webp';
      nationImg.alt = d[1]; nationCap.textContent = d[2];
      nationPanel.classList.remove('is-swap');
    };
    img.src = base + '-828.webp';
    syncNation();
  }
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
