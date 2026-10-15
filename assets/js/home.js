/* =====================================================================
 * Tutee Connect UK — home page story ("The Flight").
 *
 * landing.js stays the functional core (form, validation, dropdowns, map
 * + shortlist, details sheet, Tutee AI, news, FAQ, Lenis, header). This
 * file adds the scroll story and the interactions specific to this page:
 *
 *   1 Departure  departures board (split-flap) + the globe (globe.js);
 *                picking a city re-routes the flight and the Arrival photo
 *   2 Take-off   the four hard parts light up in turn while the section
 *                holds (big screens); the night sky starts to lift
 *   3 Journey    the eight steps fly past sideways with the plane on its
 *                route (big screens); a vertical route everywhere else
 *   4 Arrival    the plane window opens onto the chosen city
 *   then         plane lands on the map · services told as you scroll ·
 *                tickets dealt · staircase rises · postcards drift ·
 *                a chapter rail to jump anywhere
 *
 * Rules: content is complete and readable without any of this (CSS holds
 * the finished state); nothing is pinned on phones, tablets or short
 * screens; reduced motion gets no pinning, scrubbing, rotation or loops.
 * ===================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var G = window.gsap, hasGsap = !!(G && window.ScrollTrigger);
  var motion = hasGsap && !reduce;
  root.classList.add(motion ? 'motion-ok' : 'no-motion');
  if (hasGsap && window.MotionPathPlugin) G.registerPlugin(window.MotionPathPlugin);

  // the big-screen story (pinning, sideways flight) needs room
  var BIG = '(min-width: 1024px) and (min-height: 700px)';

  /* ---------------------------------------------------------- hero intro */
  function intro() {
    var done = false;
    function go() { if (done) return; done = true; root.classList.remove('hero-wait'); }
    requestAnimationFrame(function () { requestAnimationFrame(go); });
    setTimeout(go, 120);
  }

  /* ------------------------------------------------------- split-flap */
  var CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function Flap(box, len) {
    box.textContent = '';
    var cells = [];
    for (var i = 0; i < len; i++) {
      var c = document.createElement('span');
      c.className = 'fc';
      c.innerHTML = '<span class="t"></span><span class="b"></span><span class="ft"></span><span class="fb"></span>';
      c._l = { t: c.children[0], b: c.children[1], ft: c.children[2], fb: c.children[3] };
      c._ch = ' ';
      box.appendChild(c);
      cells.push(c);
    }
    var FD = 55;
    box.style.setProperty('--fd', FD + 'ms');
    function paint(c, ch) { c._ch = ch; c._l.t.textContent = c._l.b.textContent = c._l.ft.textContent = c._l.fb.textContent = ch; c.classList.remove('is-flip'); }
    function flipOnce(c, ch, done) {
      var l = c._l;
      l.ft.textContent = c._ch; l.b.textContent = c._ch;
      l.t.textContent = ch; l.fb.textContent = ch;
      c.classList.remove('is-flip'); void c.offsetWidth; c.classList.add('is-flip');
      c._t = setTimeout(function () { paint(c, ch); done(); }, FD * 2 + 10);
    }
    function run(c, seq) { if (seq.length) flipOnce(c, seq.shift(), function () { run(c, seq); }); }
    return {
      set: function (word, animate) {
        cells.forEach(function (c, i) {
          var target = word.charAt(i) || ' ';
          clearTimeout(c._t); clearTimeout(c._d);
          if (!animate) { paint(c, target); return; }
          if (target === c._ch) return;
          var seq = [], n = 2 + Math.floor(Math.random() * 3);
          for (var k = 0; k < n; k++) seq.push(CHARS.charAt(Math.floor(Math.random() * 26)));
          seq.push(target);
          c._d = setTimeout(function () { run(c, seq); }, i * 45);
        });
      }
    };
  }

  /* --------------------------------------------- the chosen destination */
  // the Arrival photo follows the board (the same four city photos)
  var CITY = [
    { file: 'oxford', alt: 'The Radcliffe Camera, Oxford, England', place: 'Oxford, England', pos: '50% 40%' },
    { file: 'edinburgh', alt: 'Edinburgh Castle on Castle Rock, Scotland', place: 'Edinburgh, Scotland', pos: '30% 50%' },
    { file: 'cardiff', alt: 'Cardiff Castle, Wales', place: 'Cardiff, Wales', pos: '52% 45%' },
    { file: 'belfast', alt: 'Titanic Belfast, Northern Ireland', place: 'Belfast, Northern Ireland', pos: '45% 50%' }
  ];
  function setArrival(k) {
    var img = $('[data-arrival-img]'), cap = $('[data-arrival-city]'), c = CITY[k];
    if (!img || !c) return;
    var base = './assets/img/hero/' + c.file;
    img.srcset = base + '-1280.webp 1280w, ' + base + '-1920.webp 1920w, ' + base + '-2560.webp 2560w';
    img.src = base + '-1920.webp';
    img.alt = c.alt;
    img.style.objectPosition = c.pos;
    if (cap) cap.textContent = c.place;
  }

  /* ------------------------------------------------------- 1 departure */
  function initDeparture() {
    var board = $('[data-board]');
    if (!board) return;
    var rows = $$('[data-go]', board), pauseBtn = $('[data-board-pause]', board), hero = $('#home');
    var canvas = $('[data-globe]');
    var globe = canvas && window.TCGlobe ? window.TCGlobe.mount(canvas, { dest: 0 }) : null;
    var len = rows.reduce(function (m, b) { return Math.max(m, b.getAttribute('data-word').length); }, 0);
    var flap = Flap($('[data-flap]', board), len);
    flap.set(rows[0].getAttribute('data-word'), false);
    var i = 0, timer = 0, paused = false, hover = false, visible = true;

    function show(k, user) {
      k = (k + rows.length) % rows.length;
      if (k === i) return;
      i = k;
      rows.forEach(function (b, j) { b.setAttribute('aria-pressed', j === i ? 'true' : 'false'); });
      flap.set(rows[i].getAttribute('data-word'), !reduce);
      if (globe) globe.setDest(i);
      setArrival(i);
      if (user) restart();
    }
    rows.forEach(function (b, j) { b.addEventListener('click', function () { show(j, true); }); });

    // the board cycles the four nations every 7 s while the hero is on
    // screen and not hovered; Pause stops the board, the globe and the scroller
    function tick() { if (!paused && !hover && visible && !document.hidden) show(i + 1, false); }
    function restart() { clearInterval(timer); if (!reduce) timer = setInterval(tick, 7000); }
    if (!reduce) {
      pauseBtn.hidden = false;
      pauseBtn.addEventListener('click', function () {
        paused = !paused;
        pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
        $('use', pauseBtn).setAttribute('href', paused ? '#i-play' : '#i-pause');
        $('span', pauseBtn).textContent = paused ? 'Play motion' : 'Pause motion';
        hero.classList.toggle('is-still', paused);
        if (globe) globe.setPaused(paused);
      });
      if (fine) {
        board.addEventListener('pointerenter', function () { hover = true; });
        board.addEventListener('pointerleave', function () { hover = false; });
      }
      board.addEventListener('focusin', function () { hover = true; });
      board.addEventListener('focusout', function () { hover = false; });
      if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(board);
      restart();
    }

    // scrolling on: the globe turns to the UK and zooms in, the copy lifts away
    if (motion) {
      // measured from the globe itself, so on phones (where it sits lower) the descent starts when it is in view
      if (canvas) ScrollTrigger.create({ trigger: canvas, start: 'center 55%', endTrigger: hero, end: 'bottom top', onUpdate: function (s) { if (globe) globe.setScroll(s.progress); } });
      G.matchMedia().add(BIG, function () {
        G.to('.depart-copy', { yPercent: -14, opacity: 0.15, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
      });
    }
  }

  function initClock() {
    var t = $('[data-clock]'), wrap = $('[data-clock-wrap]');
    if (!t || !window.Intl) return;
    var fmt;
    try { fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false }); } catch (e) { return; }
    function draw() { var s = fmt.format(new Date()); if (t.textContent !== s) { t.textContent = s; t.dateTime = s; } }
    draw(); wrap.hidden = false;
    setInterval(draw, 15000);
  }

  function initCalling() {
    var track = $('[data-calling]');
    if (!track || reduce) return;
    $$('li', track).forEach(function (li) { var c = li.cloneNode(true); c.setAttribute('aria-hidden', 'true'); track.appendChild(c); });
    track.closest('.calling').classList.add('is-moving');
  }

  /* -------------------------------------------------------- 2 take-off */
  function initWorries() {
    var pin = $('[data-worries]');
    if (!pin) return;
    var sec = pin.closest('section'), lines = $$('.worry', pin);
    function light(n) { lines.forEach(function (l, k) { l.classList.toggle('is-lit', k < n); }); }
    if (!motion) { light(lines.length); return; }
    G.matchMedia().add({ big: BIG, small: 'not all and ' + BIG }, function (c) {
      if (c.conditions.big) {
        // hold for about one screen; each line lights in turn, the dawn rises
        ScrollTrigger.create({
          trigger: pin, start: 'top top', end: '+=100%', pin: true, anticipatePin: 1, refreshPriority: 3,
          onUpdate: function (s) { light(Math.min(lines.length, Math.floor(s.progress * (lines.length + 0.6)) + 1)); sec.style.setProperty('--dawn', s.progress.toFixed(3)); },
          onLeave: function () { light(lines.length); sec.style.setProperty('--dawn', '1'); }
        });
      } else {
        // phones / tablets: each line lights as it reaches the reading position
        lines.forEach(function (l) { ScrollTrigger.create({ trigger: l, start: 'top 78%', once: true, onEnter: function () { l.classList.add('is-lit'); } }); });
        ScrollTrigger.create({ trigger: sec, start: 'top 60%', end: 'bottom 60%', scrub: true, onUpdate: function (s) { sec.style.setProperty('--dawn', s.progress.toFixed(3)); } });
      }
      return function () { light(lines.length); };
    });
  }

  /* --------------------------------------------------------- 3 journey */
  function initJourney() {
    var pin = $('[data-journey]');
    if (!pin || !motion) return;
    var sec = pin.closest('section'), track = $('[data-track]', pin), path = $('[data-route]', pin), plane = $('[data-route-plane]', pin);
    G.matchMedia().add(BIG, function () {
      root.classList.add('hjourney');
      var svg = path.ownerSVGElement;
      // a gentle wave through the middle of the track, rebuilt on every refresh
      function buildPath() {
        var w = track.scrollWidth, h = track.offsetHeight, mid = h / 2, amp = Math.min(46, h * 0.1), seg = 320, d = 'M 0 ' + mid;
        svg.setAttribute('width', w); svg.setAttribute('height', h);
        for (var x = 0, k = 0; x < w; x += seg, k++) {
          var y = mid + (k % 2 ? amp : -amp);
          d += ' C ' + (x + seg * 0.35) + ' ' + mid + ', ' + (x + seg * 0.35) + ' ' + y + ', ' + (x + seg * 0.5) + ' ' + y + ' S ' + (x + seg) + ' ' + mid + ', ' + (x + seg) + ' ' + mid;
        }
        path.setAttribute('d', d);
      }
      buildPath();
      ScrollTrigger.addEventListener('refreshInit', buildPath);
      var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
      var tl = G.timeline({ scrollTrigger: { trigger: pin, start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 2 } });
      tl.to(track, { x: function () { return -dist(); }, ease: 'none', duration: 1 }, 0)
        .fromTo(plane, { opacity: 1 }, { motionPath: { path: path, align: path, alignOrigin: [0.5, 0.5], autoRotate: true, start: 0.02, end: 0.98 }, ease: 'none', duration: 1 }, 0)
        // night → dawn → morning, as the steps go from "before you fly" to "after graduation"
        .fromTo(sec, { backgroundColor: '#0b1d1b' }, { backgroundColor: '#3a1a22', ease: 'none', duration: 0.62 }, 0)
        .to(sec, { backgroundColor: '#4b2711', ease: 'none', duration: 0.38 }, 0.62);
      return function () {
        ScrollTrigger.removeEventListener('refreshInit', buildPath);
        root.classList.remove('hjourney');
        G.set([track, plane, sec], { clearProps: 'all' });
      };
    });
  }

  /* --------------------------------------------------------- 4 arrival */
  function initArrival() {
    var stage = $('[data-arrival]');
    if (!stage || !motion) return;
    var media = $('[data-arrival-media]', stage), img = $('img', media);
    G.matchMedia().add(BIG, function () {
      root.classList.add('harrival');
      var tl = G.timeline({ scrollTrigger: { trigger: stage, start: 'top top', end: '+=85%', pin: true, scrub: 0.6, anticipatePin: 1, refreshPriority: 1 } });
      tl.fromTo(media, { clipPath: 'inset(14% 33% 30% 33% round 240px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'power1.inOut' }, 0)
        .fromTo(img, { scale: 1.32 }, { scale: 1, ease: 'none' }, 0);
      return function () { root.classList.remove('harrival'); G.set([media, img], { clearProps: 'all' }); };
    });
  }

  /* ------------------------------------------------ the plane lands (map) */
  function initLanding() {
    var path = $('[data-flight-in]'), plane = $('[data-flight-plane]');
    if (!path || !plane || !motion || !window.DrawSVGPlugin || !window.MotionPathPlugin) return;
    G.timeline({ scrollTrigger: { trigger: '.map-box', start: 'top 72%', once: true } })
      .from(path, { drawSVG: '0%', duration: 1.6, ease: 'power2.inOut' }, 0)
      .set(plane, { opacity: 1 }, 0)
      .to(plane, { motionPath: { path: path, align: path, alignOrigin: [0.5, 0.5], autoRotate: true }, duration: 1.6, ease: 'power2.inOut' }, 0)
      .to(plane, { opacity: 0, scale: 0.4, duration: 0.35 }, '>-0.05');
  }

  /* --------------------------------------------------------- services */
  function initServices() {
    var items = $$('[data-svc-item]');
    if (!items.length) return;
    var imgs = $$('[data-stage-img]'), no = $('[data-stage-no]'), bar = $('[data-stage-bar]');
    // "Read more": the second paragraph is in the page; JavaScript folds it
    items.forEach(function (it) {
      var b = $('.svc-btn', it), x = $('.svc-extra', it);
      if (!b || !x) return;
      function set(on) { b.setAttribute('aria-expanded', on ? 'true' : 'false'); x.hidden = !on; $('span', b).textContent = on ? 'Show less' : 'Read more'; }
      set(false); b.hidden = false;
      b.addEventListener('click', function () { set(b.getAttribute('aria-expanded') !== 'true'); if (hasGsap) ScrollTrigger.refresh(); });
    });
    function active(k) {
      items.forEach(function (it, j) { it.classList.toggle('is-active', j === k); });
      imgs.forEach(function (im, j) { im.classList.toggle('is-on', j === k); });
      if (no) no.textContent = (k < 9 ? '0' : '') + (k + 1);
      if (bar) bar.style.transform = 'scaleX(' + ((k + 1) / items.length) + ')';
    }
    active(0);
    if (hasGsap) items.forEach(function (it, k) {
      ScrollTrigger.create({ trigger: it, start: 'top 55%', end: 'bottom 55%', onToggle: function (s) { if (s.isActive) active(k); } });
    });
    // fetch the stage photos as the section approaches (they swap without a wait)
    var stage = $('.svc-stage');
    if (stage && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        io.disconnect();
        imgs.forEach(function (im) { im.loading = 'eager'; if (im.decode) im.decode().catch(function () {}); });
      }, { rootMargin: '100% 0px' });
      io.observe(stage);
    }
  }

  /* -------------------------------------------------- funding: tickets */
  function initTickets() {
    var list = $('[data-tickets]');
    if (!list || !motion) return;
    var t = $$('.ticket', list);
    G.matchMedia().add('(min-width: 901px)', function () {
      // dealt from one stack in the middle into the row as the section arrives
      G.fromTo(t, {
        x: function (k, el) { return (1 - k) * (el.offsetWidth + 20); },
        y: 50, rotation: function (k) { return (k - 1) * 7; }
      }, {
        x: 0, y: 0, rotation: 0, ease: 'none',
        scrollTrigger: { trigger: list, start: 'top 92%', end: 'top 42%', scrub: 0.6 }
      });
      return function () { G.set(t, { clearProps: 'transform' }); };
    });
  }

  /* -------------------------------------------------- settle: staircase */
  function initLadder() {
    var ladder = $('[data-ladder]');
    if (!ladder || !motion) return;
    // each step rises out of the floor, lowest first (plays once, ~1.4 s)
    G.from($$('.rung', ladder), {
      clipPath: 'inset(100% 0% 0% 0% round 12px)', y: 30, duration: 0.9, stagger: 0.16, ease: 'power3.out', clearProps: 'clipPath,transform',
      scrollTrigger: { trigger: ladder, start: 'top 80%', once: true }
    });
  }

  /* -------------------------------------------------- stories: postcards */
  function initPostcards() {
    var list = $('[data-cards]'), nav = $('[data-cards-nav]');
    if (!list) return;
    if (motion) G.matchMedia().add('(min-width: 901px)', function () {
      // three depths: the columns drift at different speeds and settle
      var speeds = [36, -54, 18];
      $$('li', list).forEach(function (li, k) {
        var s = speeds[k % 3];
        G.fromTo(li, { y: s }, { y: -s, ease: 'none', scrollTrigger: { trigger: list, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    });
    if (!nav) return;
    nav.hidden = false;
    function step(d) {
      var card = list.firstElementChild, w = card ? card.getBoundingClientRect().width + 14 : list.clientWidth * 0.86;
      list.scrollBy({ left: d * w, behavior: reduce ? 'auto' : 'smooth' });
    }
    $('[data-cards-prev]', nav).addEventListener('click', function () { step(-1); });
    $('[data-cards-next]', nav).addEventListener('click', function () { step(1); });
    function sync() {
      var max = list.scrollWidth - list.clientWidth - 4;
      $('[data-cards-prev]', nav).disabled = list.scrollLeft <= 4;
      $('[data-cards-next]', nav).disabled = list.scrollLeft >= max;
    }
    list.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
  }

  /* -------------------------------------------------- chapter rail */
  function initChapters() {
    var nav = $('[data-chapters]');
    if (!nav || !('IntersectionObserver' in window)) return;
    nav.hidden = false;
    var links = $$('[data-ch]', nav), fill = $('[data-ch-fill]', nav), cur = -1, flashT = 0;
    var secs = links.map(function (a) { return document.getElementById(a.getAttribute('data-ch')); });
    function set(k) {
      if (k === cur) return;
      cur = k;
      links.forEach(function (a, j) { a.classList.toggle('is-here', j === k); a.classList.toggle('is-past', j < k); if (j === k) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current'); });
      if (fill) fill.style.transform = 'scaleY(' + (k / (links.length - 1)) + ')';
      // the new chapter's name shows for a moment
      nav.classList.add('show-here'); clearTimeout(flashT); flashT = setTimeout(function () { nav.classList.remove('show-here'); }, 1400);
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { var k = secs.indexOf(e.target); if (k !== -1) set(k); } });
    }, { rootMargin: '-48% 0px -48% 0px' });
    secs.forEach(function (s) { if (s) io.observe(s); });
    // later chapters that sit between two tracked ones (news, FAQ) keep the previous one
  }

  /* At the very top the hero carries its own calls to action, so the
     floating buttons (desktop) wait until the visitor starts scrolling. */
  function initTop() {
    var on = null;
    function sync() { var t = window.pageYOffset < 120; if (t !== on) { on = t; root.classList.toggle('at-top', t); } }
    sync();
    window.addEventListener('scroll', sync, { passive: true });
  }

  function boot() {
    intro();
    initTop();
    initDeparture();
    initClock();
    initCalling();
    initServices();
    initPostcards();
    initChapters();
    // scroll scenes, in page order (pins first, so everything below measures after them)
    setTimeout(function () {
      initWorries();
      initJourney();
      initArrival();
      initLanding();
      initTickets();
      initLadder();
      if (hasGsap) ScrollTrigger.refresh();
    }, 0);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
