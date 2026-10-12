/* =====================================================================
 * Tutee Connect — UK landing page.
 *
 * Motion: GSAP 3.15 (+ ScrollTrigger, SplitText, DrawSVG, MotionPath, Flip)
 * and Lenis 1.3 smooth scrolling, all vendored in /assets/vendor (CSP is
 * `script-src 'self'`). Effects marked "after React Bits <Name>" are vanilla
 * re-implementations of those React Bits components' ideas.
 *
 * Device strategy
 *   - The CSS describes every section's final state. Animations only run
 *     "from" something else, so missing JS / reduced motion = complete page.
 *   - gsap.matchMedia splits work by capability:
 *       big    (≥1024 wide AND ≥600 tall): pinned zoom + horizontal services
 *       small  (everything else): no pinning, lighter reveals, native swipe
 *       motion (no reduced-motion preference): anything that moves at all
 *   - Lenis smooths wheel scrolling only; touch keeps native momentum.
 *   - Every <select> is upgraded to a custom listbox (initDropdowns).
 *
 * Lead flow: the hero boarding pass (level / intake / funding), map
 * shortlist and the CTA used are carried into the two-step form and POSTed
 * to /api/enquiry with the enquiry.
 * ===================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js');

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var G = window.gsap;
  var hasGsap = !!(G && window.ScrollTrigger);
  var ENQUIRY_ENDPOINT = '/api/enquiry';
  var ctx = { study_level: '', intake: '', funding: '', shortlist: [] };
  var lenis = null;

  function enquiryPage() { try { return location.host + location.pathname; } catch (e) { return ''; } }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  if (hasGsap) {
    ['ScrollTrigger', 'SplitText', 'DrawSVGPlugin', 'MotionPathPlugin', 'Flip'].forEach(function (n) { if (window[n]) G.registerPlugin(window[n]); });
    root.classList.add('gsap-on');
    ScrollTrigger.config({ ignoreMobileResize: true });
  }

  /* ================================================================= *
   * Smooth scroll (Lenis) wired into GSAP's ticker.
   * ================================================================= */
  function initLenis() {
    if (!hasGsap || !window.Lenis || reduce) return;
    lenis = new window.Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    G.ticker.add(function (t) { lenis.raf(t * 1000); });
    G.ticker.lagSmoothing(0);
  }
  function scrollToEl(el, offset) {
    if (!el) return;
    var off = offset === undefined ? -70 : offset;
    if (lenis) lenis.scrollTo(el, { offset: off, duration: 1.4 });
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }
  function lockScroll(on) {
    document.body.classList.toggle('is-locked', on);
    if (lenis) { if (on) lenis.stop(); else lenis.start(); }
  }

  /* In-page anchors go through Lenis so the motion stays consistent. */
  function initAnchors() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href^="#"]');
      if (!a || a.hasAttribute('data-goto')) return;
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var target = $(id);
      if (!target) return;
      e.preventDefault();
      scrollToEl(target, id === '#home' ? 0 : -70);
      try { history.replaceState(null, '', id); } catch (x) { /* file:// */ }
    });
  }

  /* ================================================================= *
   * Hero entrance — no loader: content is readable immediately and the
   * motion layers on top of it.
   * ================================================================= */
  function heroEntrance() {
    var hero = $('.hero');
    if (!hero) return;
    // flag.js holds the hero copy (.hero-wait) until now. If it already let
    // go (slow connection) the copy is on screen: don't hide it to re-animate.
    var held = root.classList.contains('hero-wait');
    if (!hasGsap || reduce || !held) { root.classList.remove('hero-wait'); hero.classList.add('is-ready'); return; }
    var tl = G.timeline({ defaults: { ease: 'expo.out' }, delay: 0.1, onStart: function () { hero.classList.add('is-ready'); } });
    var title = $('[data-hero-title]');
    if (title && window.SplitText) {
      // words rise slowly out of their masks, like a title card
      var split = SplitText.create(title, { type: 'words', mask: 'words', aria: 'auto' });
      tl.from(split.words, { yPercent: 115, duration: 1.6, stagger: 0.08, ease: 'expo.out' }, 0.35);
    }
    tl.from('[data-hero-in]', { y: 24, opacity: 0, duration: 1.4, stagger: 0.12 }, 0.6);
    var sub = $('[data-blur-in]');
    if (sub && window.SplitText) {
      // after React Bits BlurText
      var s2 = SplitText.create(sub, { type: 'words', aria: 'auto' });
      tl.from(s2.words, { filter: 'blur(8px)', opacity: 0, y: 10, duration: 1, stagger: 0.015, ease: 'power2.out' }, 0.8);
    }
    var img = $('[data-hero-img]');
    if (img) tl.from(img, { scale: 1.12, opacity: 0, duration: 2.6, ease: 'power3.out' }, 0);
    // every from-state above is already applied, so the copy can show now
    root.classList.remove('hero-wait');
  }

  /* ================================================================= *
   * Hero tour: HD photos of the four nations crossfade behind the
   * welcome. The tour list's progress bar is a CSS animation, so its
   * animationend advances the slide; that also means it pauses for free
   * while the hero is off screen (.is-off) or hovered. Each next photo's
   * srcset is filled in just before it is shown, so only one loads up front.
   * ================================================================= */
  function initTour() {
    var hero = $('[data-tour]');
    if (!hero) return;
    var slides = $$('.hs', hero), items = $$('.hero-tour-list li', hero), tour = $('.hero-tour', hero);
    var credit = $('[data-hero-credit]', hero), tpl = $('template[data-credits]', hero);
    var credits = tpl ? tpl.innerHTML.split('|') : [], i = 0;
    function prime(n) {
      var src = $('source[data-srcset]', slides[n]);
      if (src) { src.srcset = src.getAttribute('data-srcset'); src.removeAttribute('data-srcset'); }
    }
    function show(n) {
      i = (n + slides.length) % slides.length;
      prime(i); prime((i + 1) % slides.length);
      slides.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
      items.forEach(function (li, k) { li.classList.toggle('is-active', k === i); });
      if (credit && credits[i]) credit.textContent = credits[i];
    }
    items.forEach(function (li, k) {
      $('button', li).addEventListener('click', function () { show(k); });
      $('.ht-bar', li).addEventListener('animationend', function () { if (k === i) show(i + 1); });
    });
    tour.addEventListener('pointerenter', function () { tour.classList.add('is-paused'); });
    tour.addEventListener('pointerleave', function () { tour.classList.remove('is-paused'); });
    // reduced motion: no autoplay (the bars never run), clicks still work
    if (reduce) $$('.ht-bar', hero).forEach(function (b) { b.style.animation = 'none'; });
    idle(function () { prime(1); });
  }

  /* after React Bits RotatingText */
  function initRotator() {
    var el = $('[data-rotator]');
    if (!el) return;
    var words = el.getAttribute('data-words').split(','), i = 0, word = $('.rotator-word', el);
    if (!hasGsap || reduce) return;
    var timer = null;
    function next() {
      i = (i + 1) % words.length;
      G.to(word, { yPercent: -110, opacity: 0, duration: 0.35, ease: 'power2.in', onComplete: function () {
        word.textContent = words[i];
        G.fromTo(word, { yPercent: 110, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.6)' });
      } });
    }
    ScrollTrigger.create({
      trigger: '#home', start: 'top bottom', end: 'bottom top',
      onToggle: function (s) { clearInterval(timer); if (s.isActive) timer = setInterval(next, 2400); }
    });
  }

  /* ================================================================= *
   * Pointer niceties (fine pointers only): cursor, magnet, tilt, spotlight.
   * ================================================================= */
  function initPointer() {
    $$('[data-spot]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
    if (!fine || reduce || !hasGsap) return;
    root.classList.add('has-cursor');
    var heroImg = $('[data-hero-img]');
    if (heroImg) {
      var hx = G.quickTo(heroImg, 'x', { duration: 1, ease: 'power3' }), hy = G.quickTo(heroImg, 'y', { duration: 1, ease: 'power3' });
      $('.hero').addEventListener('pointermove', function (e) { hx((e.clientX / innerWidth - 0.5) * -18); hy((e.clientY / innerHeight - 0.5) * -12); });
    }
    var dot = $('.cursor-dot'), ring = $('.cursor-ring'), cur = $('[data-cursor]');
    // set directly on every pointer event (no easing), so it never trails the mouse
    var dx = G.quickSetter(dot, 'x', 'px'), dy = G.quickSetter(dot, 'y', 'px');
    var rx = G.quickSetter(ring, 'x', 'px'), ry = G.quickSetter(ring, 'y', 'px');
    function follow(e) { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); }
    window.addEventListener('onpointerrawupdate' in window ? 'pointerrawupdate' : 'pointermove', follow, { passive: true });
    document.addEventListener('pointerover', function (e) {
      cur.classList.toggle('is-hover', !!e.target.closest('a, button, .pin, .dd-opt, .gp, input, textarea, [data-tilt]'));
    });

    // after React Bits Magnet
    $$('[data-magnet]').forEach(function (el) {
      var mx = G.quickTo(el, 'x', { duration: 0.5, ease: 'power3' }), my = G.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        mx((e.clientX - r.left - r.width / 2) * 0.3); my((e.clientY - r.top - r.height / 2) * 0.4);
      });
      el.addEventListener('pointerleave', function () { mx(0); my(0); });
    });

    // after React Bits TiltedCard
    $$('[data-tilt]').forEach(function (el) {
      var tx = G.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' }), ty = G.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' });
      var sc = G.quickTo(el, 'scale', { duration: 0.6, ease: 'power3' });
      G.set(el, { transformPerspective: 900 });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        tx(((e.clientX - r.left) / r.width - 0.5) * 16);
        ty(-((e.clientY - r.top) / r.height - 0.5) * 12);
        sc(1.03);
      });
      el.addEventListener('pointerleave', function () { tx(0); ty(0); sc(1); });
    });
  }

  /* after React Bits ClickSpark — lines burst from every click */
  function initSparks() {
    var cv = $('[data-sparks]');
    if (!cv || reduce) return;
    var c = cv.getContext('2d'), dpr = Math.min(2, window.devicePixelRatio || 1), sparks = [], raf = 0;
    function size() { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size(); window.addEventListener('resize', size);
    function draw(now) {
      c.clearRect(0, 0, innerWidth, innerHeight);
      sparks = sparks.filter(function (s) {
        var p = (now - s.t) / 420;
        if (p >= 1) return false;
        var e = 1 - Math.pow(1 - p, 3), d = 6 + e * 26, len = 10 * (1 - e);
        c.strokeStyle = s.col; c.lineWidth = 2; c.globalAlpha = 1 - p;
        c.beginPath();
        c.moveTo(s.x + Math.cos(s.a) * d, s.y + Math.sin(s.a) * d);
        c.lineTo(s.x + Math.cos(s.a) * (d + len), s.y + Math.sin(s.a) * (d + len));
        c.stroke();
        return true;
      });
      c.globalAlpha = 1;
      raf = sparks.length ? requestAnimationFrame(draw) : 0;
    }
    document.addEventListener('pointerdown', function (e) {
      var now = performance.now();
      for (var i = 0; i < 8; i++) sparks.push({ x: e.clientX, y: e.clientY, a: (Math.PI * 2 * i) / 8, t: now, col: i % 2 ? '#f5a524' : '#b8312a' });
      if (!raf) raf = requestAnimationFrame(draw);
    }, { passive: true });
  }

  /* ================================================================= *
   * Chrome: header, progress, nav highlight, to-top, mobile CTA, menu.
   * ================================================================= */
  function initChrome() {
    var header = $('[data-header]'), bar = $('[data-progress]'), ring = $('[data-to-top-bar]'), toTop = $('[data-to-top]'), mcta = $('[data-mobile-cta]');
    var contact = $('#contact'), vh = window.innerHeight, max = 1, contactOn = false;
    // measured only on resize / refresh, never inside the scroll handler
    function measure() { vh = window.innerHeight; max = Math.max(1, document.documentElement.scrollHeight - vh); }
    function update() {
      var y = window.pageYOffset, p = Math.min(1, y / max);
      header.classList.toggle('is-solid', y > 40);
      if (bar) bar.style.transform = 'scaleX(' + p + ')';
      if (ring) ring.style.strokeDashoffset = 132 - 132 * p;
      if (toTop) toTop.classList.toggle('is-on', y > vh);
      if (mcta) mcta.classList.toggle('is-on', y > vh * 0.8 && !contactOn);
    }
    if (contact && 'IntersectionObserver' in window) new IntersectionObserver(function (es) { contactOn = es[0].isIntersecting; update(); }, { rootMargin: '0px 0px -15% 0px' }).observe(contact);
    if (lenis) lenis.on('scroll', update); else window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', function () { measure(); update(); });
    window.addEventListener('load', measure);
    if (hasGsap) ScrollTrigger.addEventListener('refresh', measure);
    measure(); update();
    if (toTop) toTop.addEventListener('click', function () { if (lenis) lenis.scrollTo(0, { duration: 1.6 }); else window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });

    var nav = $$('[data-nav]');
    var map = { welcome: '', 'why-uk': 'journey', 'financial-aid': 'scholarships', testimonials: 'relocate', contact: '' };
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          var id = e.target.id in map ? map[e.target.id] : e.target.id;
          nav.forEach(function (a) { a.classList.toggle('is-here', a.getAttribute('data-nav') === id); });
        });
      }, { rootMargin: '-45% 0px -50% 0px' });
      $$('[data-section]').forEach(function (s) { io.observe(s); });
    }
  }

  function initMenu() {
    var menu = $('[data-menu]'), open = $('[data-menu-open]');
    if (!menu || !open) return;
    function set(on) {
      menu.classList.toggle('is-open', on);
      menu.setAttribute('aria-hidden', on ? 'false' : 'true');
      open.setAttribute('aria-expanded', on ? 'true' : 'false');
      lockScroll(on);
      if (on && hasGsap && !reduce) G.from($$('nav a', menu), { y: 40, opacity: 0, stagger: 0.05, duration: 0.7, ease: 'expo.out', delay: 0.15 });
      if (on) setTimeout(function () { $('[data-menu-close]', menu).focus(); }, 300); else open.focus({ preventScroll: true });
    }
    open.addEventListener('click', function () { set(true); });
    $('[data-menu-close]', menu).addEventListener('click', function () { set(false); });
    $$('[data-menu-link]', menu).forEach(function (a) { a.addEventListener('click', function () { set(false); }, true); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('is-open')) set(false); });
  }

  /* ================================================================= *
   * Scroll choreography (gsap.matchMedia so it adapts per device).
   * ================================================================= */
  function initScrollFx() {
    if (!hasGsap) return;
    var mm = G.matchMedia();
    mm.add({
      big: '(min-width: 1024px) and (min-height: 600px)',
      motion: '(prefers-reduced-motion: no-preference)'
    }, function (c) {
      var big = c.conditions.big, motion = c.conditions.motion, alive = true;
      if (!motion) return;
      function later(fn) { idle(function () { if (alive) c.add(fn); }); }

      /* Section headlines: lines rise out of masks. */
      if (window.SplitText) {
        $$('[data-split]').forEach(function (h) {
          later(function () { SplitText.create(h, {
            type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true, aria: 'auto',
            onSplit: function (self) {
              return G.from(self.lines, { yPercent: 105, duration: 1.1, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: h, start: 'top 85%', once: true } });
            }
          }); });
        });
      }

      /* Generic staggered rise. */
      ScrollTrigger.batch('[data-rise]', {
        start: 'top 88%', once: true,
        onEnter: function (els) { G.from(els, { y: 50, opacity: 0, duration: 1, stagger: 0.1, ease: 'expo.out' }); }
      });

      /* Counters (after React Bits CountUp). */
      $$('[data-count]').forEach(function (el) {
        var end = +el.getAttribute('data-count'), o = { v: 0 }, shown = -1;
        // text changes cost a layout, so only write when the number actually changes
        G.to(o, { v: end, duration: 1.8, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true }, onUpdate: function () { var n = Math.round(o.v); if (n !== shown) { shown = n; el.textContent = n; } } });
      });

      /* Welcome: the photo grows from a framed card to full bleed. */
      var welcome = $('[data-welcome]');
      if (welcome) {
        var frame = $('[data-welcome-frame]', welcome), img = $('img', frame), copy = $('[data-welcome-copy]', welcome);
        if (big) {
          var wt = G.timeline({ scrollTrigger: { trigger: welcome, start: 'top top', end: '+=75%', pin: true, scrub: 1, anticipatePin: 1 } });
          wt.fromTo(frame, { clipPath: 'inset(16% 28% 16% 28% round 36px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', duration: 1 })
            .fromTo(img, { scale: 1.35 }, { scale: 1, ease: 'none', duration: 1 }, 0)
            .from(copy.children, { y: 80, opacity: 0, stagger: 0.12, duration: 0.5, ease: 'power2.out' }, 0.55);
        } else {
          G.from(copy.children, { y: 40, opacity: 0, stagger: 0.12, duration: 0.9, ease: 'expo.out', scrollTrigger: { trigger: welcome, start: 'top 70%', once: true } });
          G.fromTo(img, { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: welcome, start: 'top bottom', end: 'bottom top', scrub: true } });
        }
      }

      /* Journey: the spine fills as you scroll, the plane rides its tip, and
         each step lights up and slides in from its side. */
      var spine = $('[data-spine]');
      if (spine) {
        var fill = $('[data-spine-fill]', spine), plane = $('[data-spine-plane]', spine), line = $('.spine', spine), lineH = line.offsetHeight;
        G.fromTo(fill, { scaleY: 0 }, {
          scaleY: 1, ease: 'none',
          scrollTrigger: {
            trigger: spine, start: 'top 60%', end: 'bottom 60%', scrub: 0.6,
            onRefresh: function () { lineH = line.offsetHeight; },
            onUpdate: function (s) { if (plane) G.set(plane, { y: s.progress * lineH }); }
          }
        });
        $$('.step', spine).forEach(function (st) {
          ScrollTrigger.create({ trigger: st, start: 'top 62%', toggleClass: { targets: st, className: 'is-on' } });
          var fromRight = st.classList.contains('step-r') || window.innerWidth <= 760;
          G.from($('.step-card', st), { x: fromRight ? 70 : -70, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: st, start: 'top 85%', once: true } });
        });
        G.from($$('.phase span', spine), { scale: 0.6, opacity: 0, duration: 0.7, ease: 'back.out(2)', stagger: 0.1, scrollTrigger: { trigger: spine, start: 'top 80%', once: true } });
      }

      /* Hero photo drifts slower than the page; Why-UK photo parallax. */
      var heroImg = $('[data-hero-img]');
      if (heroImg) G.fromTo(heroImg, { yPercent: 0 }, { yPercent: -7, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
      // big screens: the hero content lifts away and fades as the page takes over
      var heroBody = $('[data-hero-body]');
      if (heroBody && big) {
        var heroOut = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
        G.to(heroBody, { yPercent: -10, opacity: 0, ease: 'none', scrollTrigger: heroOut });
      }
      var whyBg = $('[data-why-bg]');
      if (whyBg) G.fromTo(whyBg, { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.why', start: 'top bottom', end: 'bottom top', scrub: true } });

      /* Why UK / Loans: words come into focus as you read (after React Bits ScrollReveal). */
      if (window.SplitText) {
        $$('[data-scroll-reveal]').forEach(function (p) { later(function () {
          var s = SplitText.create(p, { type: 'words', aria: 'auto' });
          var from = { opacity: 0.14 }, to = { opacity: 1 };
          to.stagger = 0.06; to.ease = 'none';
          to.scrollTrigger = { trigger: p, start: 'top 82%', end: 'bottom 50%', scrub: true };
          G.fromTo(s.words, from, to);
        }); });
      }

      /* Services: horizontal track pinned on big screens. */
      var svcSec = $('[data-services]'), track = $('[data-services-track]'), sbar = $('[data-services-bar]');
      if (svcSec && big) {
        svcSec.classList.add('is-hpin');
        var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
        G.to(track, {
          x: function () { return -dist(); }, ease: 'none',
          scrollTrigger: {
            trigger: svcSec, start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
            onUpdate: function (s) { if (sbar) sbar.style.transform = 'scaleX(' + s.progress + ')'; }
          }
        });
        G.from($$('.svc', track), { y: 120, rotation: 4, opacity: 0, stagger: 0.06, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: svcSec, start: 'top 75%', once: true } });
      } else if (svcSec) {
        var rail = $('[data-services-rail]');
        rail.addEventListener('scroll', function () {
          var m = rail.scrollWidth - rail.clientWidth;
          if (sbar) sbar.style.transform = 'scaleX(' + (m > 0 ? rail.scrollLeft / m : 0) + ')';
        }, { passive: true });
      }

      /* Map: the coastline draws itself, then the pins drop in. */
      var mapBox = $('.map-box');
      if (mapBox && window.DrawSVGPlugin) {
        G.timeline({ scrollTrigger: { trigger: mapBox, start: 'top 75%', once: true } })
          .from('.uk-land', { drawSVG: '0%', fillOpacity: 0, duration: 2.4, ease: 'power2.inOut', stagger: 0.3 })
          .from('.pin', { scale: 0, transformOrigin: '50% 50%', opacity: 0, stagger: 0.08, duration: 0.6, ease: 'back.out(2)' }, '-=0.8');
      }

      /* Image reveals + parallax. */
      $$('[data-clip]').forEach(function (el, i) {
        G.from(el, { clipPath: 'inset(100% 0% 0% 0% round 28px)', duration: 1.4, delay: i * 0.15, ease: 'expo.inOut', scrollTrigger: { trigger: el.parentElement, start: 'top 75%', once: true } });
      });
      $$('[data-parallax]').forEach(function (img) {
        G.fromTo(img, { yPercent: -8 }, { yPercent: 4, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
      });

      return function () { alive = false; if (svcSec) svcSec.classList.remove('is-hpin'); };
    });
  }

  /* after React Bits ScrollVelocity — the university ticker always glides
     gently on its own; scrolling speeds it up and flips its direction.
     Pauses while hovered/focused so names can be read, and off-screen. */
  function initVelocity() {
    if (!hasGsap) return; // CSS keyframes keep it moving without GSAP
    var rows = $$('[data-velocity] .velocity-row');
    if (!rows.length) return;
    rows.forEach(function (row) {
      var track = $('.velocity-track', row);
      $$(':scope > *', track).forEach(function (n) { var c = n.cloneNode(true); c.setAttribute('aria-hidden', 'true'); track.appendChild(c); });
    });
    var vel = 0, flip = 1;
    if (!reduce) ScrollTrigger.create({ start: 0, end: 'max', onUpdate: function (s) { vel = s.getVelocity(); if (Math.abs(vel) > 50) flip = vel < 0 ? -1 : 1; } });
    var base = reduce ? 0.025 : 0.045; // px per ms — subtle
    rows.forEach(function (row) {
      var track = $('.velocity-track', row), dir = +row.getAttribute('data-dir') || 1, x = 0, visible = true, held = false;
      var setX = G.quickSetter(track, 'x', 'px'), half = track.scrollWidth / 2;
      if ('ResizeObserver' in window) new ResizeObserver(function () { half = track.scrollWidth / 2; }).observe(track);
      if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(row);
      row.addEventListener('pointerenter', function () { held = true; });
      row.addEventListener('pointerleave', function () { held = false; });
      G.ticker.add(function (t, dt) {
        if (!visible || held) return;
        if (!half) return;
        var boost = Math.min(6, Math.abs(vel) / 350);
        x -= dir * flip * (base + boost * 0.12) * Math.min(dt, 50);
        x = ((x % half) - half) % half; // wrap into (-half, 0]
        setX(x);
      });
    });
    G.ticker.add(function () { vel *= 0.9; });
  }

  /* ================================================================= *
   * Services detail panel — the card expands into it with GSAP Flip.
   * ================================================================= */
  function initServicePanel() {
    var panel = $('[data-svc-panel]'), card = $('[data-svc-card]');
    if (!panel || !card || !$('template[data-svc-data]')) return;
    var data = Array.prototype.slice.call($('template[data-svc-data]').content.children); // :scope doesn't apply to fragments
    var opener = null;
    function open(btn) {
      opener = btn;
      var d = data[+btn.getAttribute('data-svc')];
      $('[data-svc-p-icon]', card).innerHTML = '<svg class="icon"><use href="#' + d.getAttribute('data-icon') + '"/></svg>';
      $('[data-svc-p-title]', card).textContent = $('h3', d).textContent;
      $('[data-svc-p-tag]', card).textContent = $('.t', d).textContent;
      $('[data-svc-p-body]', card).innerHTML = $$('p:not(.t)', d).map(function (p) { return p.outerHTML; }).join('');
      $('[data-svc-p-cta]', card).setAttribute('data-intent', d.getAttribute('data-intent'));
      card.style.setProperty('--c1', btn.style.getPropertyValue('--c1'));
      card.style.setProperty('--c2', btn.style.getPropertyValue('--c2'));
      var canFlip = hasGsap && window.Flip && !reduce;
      var state = null;
      if (canFlip) { btn.setAttribute('data-flip-id', 'svc'); card.setAttribute('data-flip-id', 'svc'); state = Flip.getState(btn); }
      panel.hidden = false;
      lockScroll(true);
      card.scrollTop = 0;
      if (canFlip) {
        Flip.from(state, { targets: card, duration: 0.7, ease: 'expo.inOut', scale: true, absolute: false });
        G.from($$('h3, .svc-tag, .svc-panel-body > *, .btn', card), { y: 24, opacity: 0, stagger: 0.05, duration: 0.6, delay: 0.35, ease: 'expo.out' });
        G.from('.svc-panel-bg', { opacity: 0, duration: 0.4 });
        btn.removeAttribute('data-flip-id');
      }
      $('.svc-panel-x', card).focus({ preventScroll: true });
    }
    function close() {
      if (panel.hidden) return;
      function hide() { panel.hidden = true; G && G.set(card, { clearProps: 'all' }); lockScroll(false); if (opener) opener.focus({ preventScroll: true }); }
      if (hasGsap && !reduce) {
        G.to(card, { y: 40, opacity: 0, scale: 0.94, duration: 0.35, ease: 'power2.in', onComplete: hide });
        G.to('.svc-panel-bg', { opacity: 0, duration: 0.35, onComplete: function () { G.set('.svc-panel-bg', { clearProps: 'opacity' }); } });
      } else hide();
    }
    $$('[data-svc]').forEach(function (b) { b.addEventListener('click', function () { open(b); }); });
    $$('[data-svc-close]', panel).forEach(function (b) { b.addEventListener('click', close); });
    $('[data-svc-p-cta]', card).addEventListener('click', function () { panel.hidden = true; G && G.set(card, { clearProps: 'all' }); lockScroll(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  }

  /* ================================================================= *
   * Confetti for the form success state.
   * ================================================================= */
  function confetti(canvas) {
    if (!canvas || reduce) return;
    var c = canvas.getContext('2d'), w = canvas.width = canvas.offsetWidth, h = canvas.height = canvas.offsetHeight;
    var cols = ['#f5a524', '#8e1b1b', '#14706a', '#ffcb6b', '#0e2422'], parts = [];
    for (var i = 0; i < 110; i++) parts.push({ x: w / 2, y: h / 3, vx: (Math.random() - .5) * 13, vy: Math.random() * -11 - 3, s: Math.random() * 6 + 4, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: cols[i % cols.length] });
    var t = 0;
    (function f() {
      c.clearRect(0, 0, w, h);
      parts.forEach(function (p) { p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr; c.save(); c.translate(p.x, p.y); c.rotate(p.r); c.fillStyle = p.c; c.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); c.restore(); });
      if (++t < 130) requestAnimationFrame(f); else c.clearRect(0, 0, w, h);
    })();
  }

  /* ================================================================= *
   * UK map.
   * ================================================================= */
  var GB = [[-5.0,58.62],[-4.75,58.57],[-3.5,58.6],[-3.03,58.64],[-3.09,58.44],[-3.65,58.12],[-4.0,57.85],[-4.2,57.5],[-3.87,57.59],[-3.28,57.72],[-2.0,57.69],[-1.78,57.5],[-2.08,57.15],[-2.47,56.71],[-2.9,56.45],[-2.58,56.28],[-3.0,56.08],[-3.2,56.0],[-2.52,56.0],[-2.13,55.9],[-2.0,55.77],[-1.6,55.6],[-1.42,55.02],[-1.2,54.69],[-0.61,54.49],[-0.08,54.12],[0.12,53.58],[0.34,53.14],[0.2,52.9],[0.5,52.95],[1.3,52.93],[1.73,52.6],[1.75,52.47],[1.35,51.96],[1.15,51.79],[0.7,51.53],[1.44,51.38],[1.33,51.12],[0.97,50.91],[0.25,50.73],[-0.14,50.82],[-0.79,50.73],[-1.1,50.8],[-1.5,50.75],[-1.88,50.71],[-2.45,50.58],[-2.94,50.72],[-3.4,50.62],[-3.64,50.22],[-4.14,50.36],[-5.2,49.96],[-5.71,50.07],[-5.48,50.21],[-5.07,50.42],[-4.53,51.02],[-4.12,51.21],[-3.47,51.2],[-2.98,51.35],[-2.7,51.5],[-3.0,51.55],[-3.17,51.45],[-3.94,51.6],[-4.32,51.56],[-4.7,51.67],[-5.3,51.88],[-4.98,52.0],[-4.66,52.1],[-4.08,52.41],[-4.06,52.72],[-4.77,52.79],[-4.3,53.13],[-4.68,53.31],[-4.33,53.41],[-3.83,53.33],[-3.49,53.32],[-3.1,53.38],[-3.05,53.45],[-3.02,53.65],[-3.05,53.82],[-2.87,54.07],[-3.23,54.11],[-3.64,54.49],[-3.57,54.64],[-3.3,54.95],[-4.05,54.8],[-4.86,54.64],[-5.12,54.84],[-5.05,54.95],[-4.86,55.24],[-4.63,55.46],[-4.87,55.8],[-4.76,55.95],[-5.6,55.43],[-5.8,55.29],[-5.65,55.8],[-5.47,56.41],[-5.7,56.7],[-6.22,56.73],[-5.83,57.0],[-5.71,57.28],[-5.82,57.45],[-5.7,57.73],[-5.16,57.9],[-5.24,58.15]];
  var NI = [[-7.3,55.0],[-6.95,55.17],[-6.66,55.21],[-6.15,55.23],[-5.8,54.85],[-5.9,54.65],[-5.45,54.45],[-5.55,54.3],[-5.88,54.2],[-6.2,54.05],[-6.6,54.05],[-7.0,54.3],[-7.6,54.15],[-8.15,54.45],[-7.75,54.6],[-7.55,54.75]];
  var CITIES = [
    { id: 'london', name: 'London', nation: 'England', ll: [-0.13, 51.51], lx: 12, ly: 16, unis: [[3, 'Imperial College London'], [4, 'University College London'], [5, 'London School of Economics and Political Science'], [7, "King's College London"]] },
    { id: 'oxford', name: 'Oxford', nation: 'England', ll: [-1.26, 51.75], lx: -52, ly: 4, unis: [[1, 'University of Oxford']] },
    { id: 'cambridge', name: 'Cambridge', nation: 'England', ll: [0.12, 52.2], lx: 12, ly: 0, unis: [[2, 'University of Cambridge']] },
    { id: 'edinburgh', name: 'Edinburgh', nation: 'Scotland', ll: [-3.19, 55.95], lx: 12, ly: 4, unis: [[6, 'University of Edinburgh']] },
    { id: 'manchester', name: 'Manchester', nation: 'England', ll: [-2.24, 53.48], lx: 12, ly: 4, unis: [[8, 'University of Manchester']] },
    { id: 'coventry', name: 'Coventry', nation: 'England', ll: [-1.56, 52.38], lx: -66, ly: 4, unis: [[10, 'University of Warwick']] },
    { id: 'bristol', name: 'Bristol', nation: 'England', ll: [-2.59, 51.45], lx: -50, ly: 12, unis: [[9, 'University of Bristol']] },
    { id: 'glasgow', name: 'Glasgow', nation: 'Scotland', ll: [-4.25, 55.86], lx: -56, ly: 16, unis: [[11, 'University of Glasgow']] },
    { id: 'durham', name: 'Durham', nation: 'England', ll: [-1.57, 54.78], lx: 12, ly: 4, unis: [[12, 'Durham University']] }
  ];
  // details for the map's universities (same as universities-data.js)
  var UNI_INFO = {
    'University of Oxford': ['Oxford, England', 'Medicine, PPE, Computer Science'],
    'University of Cambridge': ['Cambridge, England', 'Mathematics, Natural Sciences, Engineering'],
    'Imperial College London': ['London, England', 'Engineering, Medicine, Computing'],
    'University College London': ['London, England', 'Architecture, Education, Neuroscience'],
    'London School of Economics and Political Science': ['London, England', 'Economics, Law, Politics'],
    'University of Edinburgh': ['Edinburgh, Scotland', 'Informatics, Medicine, Veterinary Science'],
    "King's College London": ['London, England', 'Medicine, Dentistry, War Studies'],
    'University of Manchester': ['Manchester, England', 'Materials Science, Engineering, Business'],
    'University of Bristol': ['Bristol, England', 'Aerospace Engineering, Law, Veterinary Science'],
    'University of Warwick': ['Coventry, England', 'Mathematics, Economics, Business'],
    'University of Glasgow': ['Glasgow, Scotland', 'Medicine, Law, Engineering'],
    'Durham University': ['Durham, England', 'Law, Theology, Physics']
  };
  function uniInfo(u) { var i = UNI_INFO[u[1]] || []; return { name: u[1], rank: u[0], ranked: true, type: 'Russell Group', location: i[0] || '', programs: i[1] || '' }; }
  function proj(p) { return [((p[0] + 8.4) * 34.8).toFixed(1), ((59 - p[1]) * 60).toFixed(1)]; }
  function pathOf(pts) { return 'M' + pts.map(function (p) { return proj(p).join(' '); }).join('L') + 'Z'; }

  function initMap() {
    var svg = $('[data-map]');
    if (!svg) return;
    $('[data-map-gb]', svg).setAttribute('d', pathOf(GB));
    $('[data-map-ni]', svg).setAttribute('d', pathOf(NI));
    var pinsG = $('[data-map-pins]', svg), chips = $('[data-city-chips]'), card = $('[data-city-card]'), NS = 'http://www.w3.org/2000/svg';
    CITIES.forEach(function (c) {
      var xy = proj(c.ll), g = document.createElementNS(NS, 'g');
      g.setAttribute('class', 'pin'); g.setAttribute('tabindex', '0'); g.setAttribute('role', 'button'); g.setAttribute('aria-label', c.name + ': show universities');
      g.innerHTML = '<circle class="pulse" cx="' + xy[0] + '" cy="' + xy[1] + '" r="15"/><circle class="core" cx="' + xy[0] + '" cy="' + xy[1] + '" r="7"/><text x="' + (+xy[0] + c.lx) + '" y="' + (+xy[1] + c.ly) + '">' + c.name + '</text>';
      g.addEventListener('click', function () { select(c.id, true); });
      g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(c.id, true); } });
      pinsG.appendChild(g); c.pin = g;
      var b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'tab'); b.textContent = c.name;
      b.addEventListener('click', function () { select(c.id, true); });
      chips.appendChild(b); c.chip = b;
    });
    function select(id, animate) {
      var c = CITIES.filter(function (x) { return x.id === id; })[0];
      CITIES.forEach(function (x) { x.pin.classList.toggle('is-active', x === c); x.chip.setAttribute('aria-selected', x === c ? 'true' : 'false'); });
      $('[data-city-name]', card).textContent = c.name;
      $('[data-city-meta]', card).textContent = c.nation + ' · ' + c.unis.length + (c.unis.length === 1 ? ' top-ranked university' : ' top-ranked universities');
      var list = $('[data-uni-list]', card);
      list.innerHTML = '';
      c.unis.forEach(function (u) {
        var on = isShort(u[1]), li = document.createElement('li');
        li.innerHTML = '<span class="uni-rank">#' + u[0] + '</span>' +
          '<button class="uni-open" type="button" aria-label="Details: ' + esc(u[1]) + '"><span class="uni-name">' + esc(u[1]) + '</span><span class="uni-more">Details <svg class="icon icon-sm"><use href="#i-arrow"/></svg></span></button>' +
          '<button class="heart" type="button" aria-pressed="' + on + '" aria-label="Shortlist ' + esc(u[1]) + '"><svg class="icon icon-sm"><use href="#i-heart"/></svg></button>';
        var h = $('.heart', li);
        h._uni = u[1];
        $('.uni-open', li).addEventListener('click', function () { openUni(uniInfo(u), this); });
        h.addEventListener('click', function () {
          setShort(u[1], !isShort(u[1]));
          if (hasGsap && !reduce) G.fromTo(h, { scale: 0.6 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
        });
        list.appendChild(li);
      });
      if (animate && hasGsap && !reduce) {
        G.from([$('.city-head', card)].concat($$('li', list)), { y: 16, opacity: 0, stagger: 0.06, duration: 0.5, ease: 'expo.out' });
        G.fromTo($('.core', c.pin), { attr: { r: 12 } }, { attr: { r: 7 }, duration: 0.6, ease: 'elastic.out(1, .4)' });
      }
    }
    select('london', false);
    paintShortlist();
    onShortlist(function () { $$('[data-uni-list] .heart').forEach(function (h) { h.setAttribute('aria-pressed', isShort(h._uni) ? 'true' : 'false'); }); });
  }
  function paintShortlist() {
    var bar = $('[data-shortlist-bar]');
    if (!bar) return;
    $('[data-sl-count]', bar).textContent = ctx.shortlist.length;
    bar.hidden = ctx.shortlist.length === 0;
  }

  /* ================================================================= *
   * Shared shortlist. Every heart (map, directory, details sheet, form
   * chips) goes through setShort(), and anything showing the shortlist
   * subscribes with onShortlist() so all views stay in step.
   * ================================================================= */
  var slSubs = [];
  function onShortlist(fn) { slSubs.push(fn); }
  function isShort(name) { return ctx.shortlist.indexOf(name) !== -1; }
  function setShort(name, on) {
    var i = ctx.shortlist.indexOf(name);
    if (on && i === -1) ctx.shortlist.push(name);
    else if (!on && i !== -1) ctx.shortlist.splice(i, 1);
    else return;
    if (ctx.shortlist.length) setInterest('University Selection');
    paintShortlist();
    renderCarry();
    slSubs.forEach(function (fn) { fn(name, on); });
  }

  /* ================================================================= *
   * University details sheet: facts, what it's known for, how we help,
   * a shortlist toggle, the live shortlist and a straight route to the
   * free consultation with the shortlist attached. Shared by the home
   * page map and the universities directory (TC.openUni).
   * ================================================================= */
  var TYPE_INFO = {
    'Russell Group': 'Russell Group — one of 24 leading research-intensive UK universities',
    Public: 'Public university',
    Specialist: 'Specialist institution focused on particular subjects',
    Private: 'Private higher-education provider',
    College: 'Higher-education college'
  };
  var uniSheet = null;
  function buildSheet() {
    var el = document.createElement('div');
    el.className = 'uni-sheet';
    el.hidden = true;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'us-title');
    el.innerHTML =
      '<div class="us-bg" data-us-close></div>' +
      '<aside class="us-panel" data-lenis-prevent>' +
        '<button class="us-x" type="button" aria-label="Close details" data-us-close><svg class="icon"><use href="#i-x"/></svg></button>' +
        '<div class="us-head">' +
          '<div class="us-badges" data-us-badges></div>' +
          '<h3 id="us-title" data-us-name></h3>' +
          '<p class="us-loc"><svg class="icon icon-sm"><use href="#i-pin"/></svg><span data-us-loc></span></p>' +
        '</div>' +
        '<div class="us-body">' +
          '<dl class="us-facts" data-us-facts></dl>' +
          '<section class="us-block" data-us-prog-wrap><h4>Known for</h4><div class="us-chips" data-us-prog></div></section>' +
          '<section class="us-block"><h4>How we help you get in</h4><ul class="us-help">' +
            '<li><svg class="icon icon-sm"><use href="#i-check"/></svg>Course and entry-requirement check against your profile</li>' +
            '<li><svg class="icon icon-sm"><use href="#i-check"/></svg>Personal Statement, references and documents</li>' +
            '<li><svg class="icon icon-sm"><use href="#i-check"/></svg>Scholarships, bursaries and education-loan options</li>' +
            '<li><svg class="icon icon-sm"><use href="#i-check"/></svg>CAS, Student visa and credibility-interview prep</li>' +
          '</ul></section>' +
          '<section class="us-block us-sl"><h4>Your shortlist <span data-us-count></span></h4><div class="us-sl-list" data-us-list></div><p class="us-sl-empty" data-us-empty>Nothing yet — add this university to start your list.</p></section>' +
        '</div>' +
        '<div class="us-foot">' +
          '<button class="btn btn-line us-heart" type="button" aria-pressed="false" data-us-heart><svg class="icon icon-sm"><use href="#i-heart"/></svg><span data-us-heart-label>Add to shortlist</span></button>' +
          '<button class="btn btn-maroon" type="button" data-us-apply><span data-us-apply-label>Get free guidance</span><svg class="icon"><use href="#i-arrow"/></svg></button>' +
        '</div>' +
      '</aside>';
    document.body.appendChild(el);
    var cur = null, opener = null, closeT = 0;
    function paintHeart() {
      var on = cur && isShort(cur.name), h = $('[data-us-heart]', el);
      h.setAttribute('aria-pressed', on ? 'true' : 'false');
      $('[data-us-heart-label]', el).textContent = on ? 'Shortlisted' : 'Add to shortlist';
      var n = ctx.shortlist.length;
      $('[data-us-apply-label]', el).textContent = n > 1 || (n === 1 && !on) ? 'Apply with my shortlist (' + (on ? n : n + 1) + ')' : 'Get free guidance';
    }
    function paintList() {
      var list = $('[data-us-list]', el);
      list.innerHTML = '';
      ctx.shortlist.forEach(function (name) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'us-sl-item' + (cur && name === cur.name ? ' is-cur' : '');
        b.setAttribute('aria-label', 'Remove ' + name + ' from shortlist');
        b.innerHTML = '<svg class="icon icon-sm"><use href="#i-heart"/></svg><span>' + esc(name) + '</span><svg class="icon icon-sm us-rm"><use href="#i-x"/></svg>';
        b.addEventListener('click', function () { setShort(name, false); });
        list.appendChild(b);
      });
      $('[data-us-count]', el).textContent = ctx.shortlist.length ? '(' + ctx.shortlist.length + ')' : '';
      $('[data-us-empty]', el).hidden = ctx.shortlist.length > 0;
    }
    function fill(u) {
      cur = u;
      var parts = String(u.location || '').split(','), city = parts[0].trim(), nation = (parts[parts.length - 1] || '').trim();
      $('[data-us-name]', el).textContent = u.name;
      $('[data-us-loc]', el).textContent = u.location || '';
      $('[data-us-badges]', el).innerHTML = (u.ranked ? '<span class="us-rank">#' + u.rank + ' in the UK</span>' : '') + (u.type ? '<span class="us-type">' + esc(u.type) + '</span>' : '');
      var facts = [['City', city], ['Nation', nation], ['Type', TYPE_INFO[u.type] || u.type || '—'], ['Ranking', u.ranked ? '#' + u.rank + ' — a general blend of widely used league tables' : 'Not ranked in national league tables']];
      $('[data-us-facts]', el).innerHTML = facts.map(function (f) { return '<div><dt>' + f[0] + '</dt><dd>' + esc(f[1]) + '</dd></div>'; }).join('');
      var progs = String(u.programs || '').split(',').map(function (p) { return p.trim(); }).filter(Boolean);
      $('[data-us-prog]', el).innerHTML = progs.map(function (p) { return '<span>' + esc(p) + '</span>'; }).join('');
      $('[data-us-prog-wrap]', el).hidden = !progs.length;
      paintHeart(); paintList();
      $('.us-panel', el).scrollTop = 0;
    }
    function open(u, from) {
      clearTimeout(closeT);
      opener = from || document.activeElement;
      fill(u);
      el.hidden = false;
      lockScroll(true);
      void el.offsetWidth; // let the hidden → shown change land before the transition
      el.classList.add('is-open');
      if (hasGsap && !reduce) G.from($$('.us-head > *, .us-block', el), { y: 18, opacity: 0, stagger: 0.05, duration: 0.5, delay: 0.12, ease: 'expo.out', clearProps: 'transform,opacity' });
      setTimeout(function () { $('.us-x', el).focus({ preventScroll: true }); }, 60);
    }
    function close() {
      if (el.hidden) return;
      el.classList.remove('is-open');
      lockScroll(false);
      closeT = setTimeout(function () { el.hidden = true; }, reduce ? 0 : 420);
      if (opener && opener.focus) opener.focus({ preventScroll: true });
    }
    $$('[data-us-close]', el).forEach(function (b) { b.addEventListener('click', close); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !el.hidden) close(); });
    $('[data-us-heart]', el).addEventListener('click', function () {
      if (!cur) return;
      setShort(cur.name, !isShort(cur.name));
      if (hasGsap && !reduce) G.fromTo($('[data-us-heart] .icon', el), { scale: 0.5 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
    });
    $('[data-us-apply]', el).addEventListener('click', function () {
      if (cur) setShort(cur.name, true);
      opener = null;
      close();
      goToForm('University Selection');
    });
    onShortlist(function () { if (!el.hidden) { paintHeart(); paintList(); } });
    return { open: open, close: close };
  }
  function openUni(u, from) { if (!uniSheet) uniSheet = buildSheet(); uniSheet.open(u, from); }

  /* ================================================================= *
   * Student stories — a "wall of love": two columns of quote cards drift
   * past each other (rows on phones). The tracks are duplicated once so
   * the CSS loop (translate -50%) is seamless. Motion pauses on hover /
   * focus (CSS), off-screen, in background tabs and via the button; with
   * reduced motion the wall is a still grid.
   * ================================================================= */
  function initStories() {
    var wall = $('[data-wall]');
    if (!wall) return;
    var toggle = $('[data-wall-toggle]'), icon = $('[data-wall-icon] use'), label = $('[data-wall-label]');
    if (reduce) { if (toggle) toggle.hidden = true; return; }
    $$('.wall-track', wall).forEach(function (track) {
      $$('.quote', track).forEach(function (q) { var c = q.cloneNode(true); c.setAttribute('aria-hidden', 'true'); track.appendChild(c); });
    });
    wall.classList.add('is-moving');
    var paused = false, onscreen = true;
    function sync() { wall.classList.toggle('is-paused', paused || !onscreen || document.hidden); }
    if (toggle) toggle.addEventListener('click', function () {
      paused = !paused;
      toggle.setAttribute('aria-pressed', paused ? 'true' : 'false');
      icon.setAttribute('href', paused ? '#i-play' : '#i-pause');
      label.textContent = paused ? 'Play stories' : 'Pause stories';
      sync();
    });
    document.addEventListener('visibilitychange', sync);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { onscreen = es[0].isIntersecting; sync(); }).observe(wall);
    if (hasGsap) G.from($$('.wall-col', wall), { y: 60, opacity: 0, stagger: 0.15, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: wall, start: 'top 85%', once: true } });
  }

  /* ================================================================= *
   * FAQ: GSAP height accordion + topic tabs (sliding pill) + live search.
   * Filtering only shows/hides questions — answers open on tap.
   * ================================================================= */
  function initFaq() {
    var items = $$('[data-faq] .faq-item'), input = $('[data-faq-search]'), empty = $('[data-faq-empty]');
    if (!items.length) return;
    var tabs = $('[data-faq-topics]'), pill = $('[data-faq-pill]'), topics = $$('[data-topic]', tabs), topic = 'all';
    var anim = hasGsap && !reduce;
    function setOpen(it, on, instant) {
      var a = $('.faq-a', it), q = $('.faq-q', it);
      if (on === it.classList.contains('is-open')) return;
      it.classList.toggle('is-open', on);
      q.setAttribute('aria-expanded', on ? 'true' : 'false');
      if (anim && !instant) G.fromTo(a, { height: on ? 0 : a.offsetHeight }, { height: on ? 'auto' : 0, duration: 0.5, ease: 'expo.out', onComplete: function () { if (hasGsap) ScrollTrigger.refresh(); } });
      else if (hasGsap) G.set(a, { clearProps: 'height' });
    }
    function movePill(instant) {
      var b = $('[aria-pressed="true"]', tabs);
      if (!pill || !b) return;
      if (instant) pill.style.transition = 'none';
      pill.style.width = b.offsetWidth + 'px';
      pill.style.transform = 'translateX(' + b.offsetLeft + 'px)';
      if (instant) { void pill.offsetWidth; pill.style.transition = ''; }
    }
    items.forEach(function (it) {
      var q = $('.faq-q', it);
      it._q = $('.faq-t', it).textContent; it._a = $('.faq-a p', it).textContent;
      it._topics = (it.getAttribute('data-topic') || '').split(/\s+/);
      q.addEventListener('click', function () {
        var on = !it.classList.contains('is-open');
        items.forEach(function (o) { if (o !== it) setOpen(o, false); });
        setOpen(it, on);
      });
    });
    function filter(collapse) {
      var t = input ? input.value.trim() : '', shown = [], re = t ? new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig') : null;
      items.forEach(function (it) {
        var okTopic = topic === 'all' || it._topics.indexOf(topic) !== -1;
        var okText = !t || (it._q + ' ' + it._a).toLowerCase().indexOf(t.toLowerCase()) !== -1;
        it.hidden = !(okTopic && okText);
        if (it.hidden || collapse) setOpen(it, false, true);
        if (!it.hidden) shown.push(it);
        $('.faq-t', it).innerHTML = re ? esc(it._q).replace(re, '<mark>$1</mark>') : esc(it._q);
        $('.faq-a p', it).innerHTML = re ? esc(it._a).replace(re, '<mark>$1</mark>') : esc(it._a);
      });
      if (anim && collapse) G.from(shown, { y: 16, opacity: 0, stagger: 0.04, duration: 0.45, ease: 'expo.out' });
      empty.hidden = shown.length > 0;
      if (hasGsap) ScrollTrigger.refresh();
    }
    topics.forEach(function (b) {
      b.addEventListener('click', function () {
        topic = b.getAttribute('data-topic');
        topics.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
        movePill(false);
        if (b.scrollIntoView && tabs.scrollWidth > tabs.clientWidth) tabs.scrollTo({ left: b.offsetLeft - 40, behavior: reduce ? 'auto' : 'smooth' });
        filter(true);
      });
    });
    if (input) input.addEventListener('input', function () { filter(false); });
    movePill(true);
    window.addEventListener('resize', function () { movePill(true); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { movePill(true); });
  }

  /* ================================================================= *
   * Custom dropdowns — every native <select> becomes a styled listbox
   * (button + floating panel). The native select stays in the form as the
   * source of truth: picking an option sets it and fires "change", and code
   * that sets select.value repaints the button. Long lists get a filter
   * box. Keyboard: arrows, Home/End, Enter, Esc, Tab, type-ahead. The panel
   * lives on <body> (position: fixed) so no parent's overflow can clip it,
   * and it opens upwards when there's no room below.
   * ================================================================= */
  var ddOpen = null, ddSeq = 0;
  function initDropdowns() {
    $$('select:not([data-native])').forEach(enhanceSelect);
    window.addEventListener('resize', function () { if (ddOpen) ddOpen.close(false); });
    window.addEventListener('scroll', function () { if (ddOpen) ddOpen.place(true); }, { passive: true });
    document.addEventListener('pointerdown', function (e) { if (ddOpen && !e.target.closest('.dd-panel, .dd-btn')) ddOpen.close(false); });
  }
  function enhanceSelect(sel) {
    var id = 'dd' + (++ddSeq);
    var wrap = document.createElement('div');
    wrap.className = 'dd';
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    sel.classList.add('dd-native');
    sel.tabIndex = -1;
    sel.setAttribute('aria-hidden', 'true');

    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'dd-btn'; btn.id = id + '-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', id + '-list');
    btn.innerHTML = '<span class="dd-val" id="' + id + '-val"></span><svg class="icon icon-sm dd-chev" aria-hidden="true"><use href="#i-down"/></svg>';
    wrap.insertBefore(btn, sel);

    // label: <label for=…> moves to the button; a wrapping <label> already labels it
    var label = sel.id ? $('label[for="' + sel.id + '"]') : null, labelId = '';
    if (label) {
      label.id = label.id || id + '-label'; labelId = label.id;
      label.setAttribute('for', btn.id);
      btn.setAttribute('aria-labelledby', labelId + ' ' + id + '-val');
    } else if (sel.closest('label')) {
      var lab = sel.closest('label');
      btn.setAttribute('aria-label', (lab.firstChild && lab.firstChild.textContent.trim()) || 'Choose');
    }

    var opts = Array.prototype.slice.call(sel.options);
    var long = opts.length > 12;
    var panel = document.createElement('div');
    panel.className = 'dd-panel'; panel.hidden = true;
    panel.setAttribute('data-lenis-prevent', '');
    panel.innerHTML = (long ? '<div class="dd-search"><svg class="icon icon-sm" aria-hidden="true"><use href="#i-search"/></svg><input type="text" placeholder="Type to search" aria-label="Search options" autocomplete="off" spellcheck="false"></div>' : '') +
      '<ul class="dd-list" role="listbox" id="' + id + '-list" tabindex="-1"></ul><p class="dd-empty">No matches</p>';
    document.body.appendChild(panel);
    var list = $('.dd-list', panel), search = $('input', panel), host = search || list;
    if (labelId) list.setAttribute('aria-labelledby', labelId); else list.setAttribute('aria-label', btn.getAttribute('aria-label') || 'Options');
    if (search) { search.setAttribute('role', 'combobox'); search.setAttribute('aria-controls', list.id); search.setAttribute('aria-expanded', 'true'); }

    var items = opts.map(function (o, i) {
      var li = document.createElement('li');
      li.id = id + '-o' + i; li.className = 'dd-opt'; li.setAttribute('role', 'option');
      li.innerHTML = '<span>' + esc(o.text) + '</span><svg class="icon icon-sm" aria-hidden="true"><use href="#i-check"/></svg>';
      if (o.hasAttribute('data-placeholder')) { li.hidden = true; li._ph = true; }
      li.addEventListener('click', function () { pick(i); close(true); });
      li.addEventListener('pointermove', function () { if (active !== i) setActive(i, false); });
      list.appendChild(li);
      return li;
    });

    var active = -1, isOpen = false, buf = '', bufT = 0;
    function sync() {
      var o = sel.options[sel.selectedIndex];
      $('.dd-val', btn).textContent = o ? o.text : '';
      wrap.classList.toggle('is-placeholder', !!(o && o.hasAttribute('data-placeholder')));
      items.forEach(function (li, i) { li.setAttribute('aria-selected', i === sel.selectedIndex ? 'true' : 'false'); });
    }
    function pick(i) {
      if (sel.selectedIndex !== i) { sel.selectedIndex = i; sel.dispatchEvent(new Event('change', { bubbles: true })); }
      sync();
    }
    function visible() { return items.map(function (li, i) { return li.hidden ? -1 : i; }).filter(function (i) { return i >= 0; }); }
    function setActive(i, scroll) {
      active = i;
      items.forEach(function (li, k) { li.classList.toggle('is-active', k === i); });
      if (i >= 0) host.setAttribute('aria-activedescendant', items[i].id); else host.removeAttribute('aria-activedescendant');
      if (scroll && i >= 0) {
        var li = items[i], top = li.offsetTop - list.offsetTop, bottom = top + li.offsetHeight;
        if (top < list.scrollTop) list.scrollTop = top;
        else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
      }
    }
    function place(onScroll) {
      var r = btn.getBoundingClientRect(), vh = window.innerHeight, vw = document.documentElement.clientWidth;
      if (onScroll && (r.bottom < 0 || r.top > vh)) { close(false); return; }
      var below = vh - r.bottom - 12, above = r.top - 12, up = below < 220 && above > below;
      var w = Math.max(r.width, 230);
      panel.style.width = w + 'px';
      panel.style.left = Math.max(8, Math.min(r.left, vw - w - 8)) + 'px';
      panel.style.maxHeight = Math.max(150, Math.min(long ? 340 : 320, up ? above : below)) + 'px';
      if (up) { panel.style.top = 'auto'; panel.style.bottom = (vh - r.top + 6) + 'px'; }
      else { panel.style.bottom = 'auto'; panel.style.top = (r.bottom + 6) + 'px'; }
      panel.classList.toggle('is-up', up);
    }
    function filter(q) {
      q = q.trim().toLowerCase();
      items.forEach(function (li, i) { li.hidden = li._ph || (!!q && opts[i].text.toLowerCase().indexOf(q) === -1); });
      var v = visible();
      panel.classList.toggle('is-empty', !v.length);
      setActive(v.length ? v[0] : -1, true);
    }
    function open() {
      if (ddOpen && ddOpen !== api) ddOpen.close(false);
      isOpen = true; ddOpen = api;
      if (search) { search.value = ''; filter(''); }
      panel.hidden = false;
      wrap.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      place();
      setActive(items[sel.selectedIndex] && !items[sel.selectedIndex].hidden ? sel.selectedIndex : (visible()[0] === undefined ? -1 : visible()[0]), true);
      host.focus({ preventScroll: true });
    }
    function close(focusBtn) {
      if (!isOpen) return;
      isOpen = false;
      if (ddOpen === api) ddOpen = null;
      panel.hidden = true;
      wrap.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      if (focusBtn) btn.focus({ preventScroll: true });
    }
    var api = { close: close, place: place };

    btn.addEventListener('click', function () { if (isOpen) close(true); else open(); });
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(); }
    });
    panel.addEventListener('keydown', function (e) {
      var v = visible(), k = v.indexOf(active);
      if (e.key === 'ArrowDown') { e.preventDefault(); if (v.length) setActive(v[Math.min(v.length - 1, k + 1)], true); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (v.length) setActive(v[Math.max(0, k - 1)], true); }
      else if ((e.key === 'Home' || e.key === 'End') && e.target === list) { e.preventDefault(); if (v.length) setActive(e.key === 'Home' ? v[0] : v[v.length - 1], true); }
      else if (e.key === 'Enter' || (e.key === ' ' && e.target === list)) { e.preventDefault(); if (active >= 0) { pick(active); close(true); } }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }
      else if (e.key === 'Tab') { e.preventDefault(); close(true); }
      else if (e.target === list && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // type-ahead
        clearTimeout(bufT); buf += e.key.toLowerCase(); bufT = setTimeout(function () { buf = ''; }, 600);
        var hit = v.filter(function (i) { return opts[i].text.toLowerCase().indexOf(buf) === 0; })[0];
        if (hit !== undefined) setActive(hit, true);
      }
    });
    panel.addEventListener('focusout', function (e) { if (isOpen && !panel.contains(e.relatedTarget) && e.relatedTarget !== btn && e.relatedTarget) close(false); });
    if (search) search.addEventListener('input', function () { filter(search.value); });

    // keep the button in step with the native select
    var desc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    if (desc && desc.set) Object.defineProperty(sel, 'value', { configurable: true, get: function () { return desc.get.call(this); }, set: function (v) { desc.set.call(this, v); sync(); } });
    sel.addEventListener('change', sync);
    if (sel.form) sel.form.addEventListener('reset', function () { setTimeout(sync, 0); });
    sync();
  }

  /* ================================================================= *
   * Hero boarding pass: three picks are added to the enquiry, then the
   * visitor lands on step 2 of the form (their details).
   * ================================================================= */
  function initHeroPass() {
    var pass = $('[data-hero-pass]');
    if (!pass) return;
    var sels = $$('[data-pass]', pass);
    sels.forEach(function (s) { s.addEventListener('change', function () { ctx[s.getAttribute('data-pass')] = s.value; renderCarry(); }); });
    pass.addEventListener('submit', function (e) {
      e.preventDefault();
      sels.forEach(function (s) { ctx[s.getAttribute('data-pass')] = s.value; });
      renderCarry();
      if (wiz) wiz.go(ctx.study_level || ctx.intake || ctx.funding ? 2 : 1, true);
      goToForm('Eligibility check');
    });
  }

  /* Scholarships: hover, focus or tap a panel to open it. */
  function initGrants() {
    var box = $('[data-grants]');
    if (!box) return;
    var panels = $$('.gp', box);
    function open(p) { panels.forEach(function (o) { o.classList.toggle('is-active', o === p); }); }
    panels.forEach(function (p, i) {
      p.addEventListener('click', function () { open(p); });
      p.addEventListener('focus', function () { open(p); });
      if (fine) p.addEventListener('pointerenter', function () { open(p); });
      p.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        panels[(i + d + panels.length) % panels.length].focus();
      });
    });
  }

  /* ================================================================= *
   * Consultation form: two steps (your plans → your details). Without JS
   * both steps show one after the other.
   * ================================================================= */
  var wiz = null, bpPaint = function () {};

  /* Consultation boarding pass: the stub mirrors the form as it's filled in. */
  function initBoardingPass() {
    var form = $('form[data-lead-form]'), box = $('[data-bp]');
    if (!form || !box) return;
    var map = { name: '#f-name', study_level: '#f-level', intake: '#f-intake', funding: '#f-funding', interest: '#f-interest' };
    var dds = $$('[data-bp-k]', box);
    function text(k) {
      if (k === 'shortlist') return ctx.shortlist.length ? ctx.shortlist.length + ' — ' + ctx.shortlist.join(', ') : '';
      var el = $(map[k], form);
      if (!el) return '';
      if (el.tagName === 'SELECT') {
        var o = el.options[el.selectedIndex];
        return o && o.value && o.value !== 'General UK Inquiry' ? o.text : '';
      }
      return el.value.trim();
    }
    function paint() {
      dds.forEach(function (dd) {
        var empty = dd.getAttribute('data-empty'), t = text(dd.getAttribute('data-bp-k')) || empty;
        if (dd.textContent === t) return;
        dd.textContent = t;
        dd.classList.toggle('is-empty', t === empty);
        if (!reduce) { dd.classList.remove('is-pop'); void dd.offsetWidth; dd.classList.add('is-pop'); }
      });
    }
    dds.forEach(function (dd) { dd.classList.toggle('is-empty', dd.textContent === dd.getAttribute('data-empty')); });
    form.addEventListener('input', paint);
    form.addEventListener('change', paint);
    form.addEventListener('reset', function () { setTimeout(paint, 0); });
    bpPaint = paint;
    paint();
  }

  function initWizard() {
    var form = $('form[data-lead-form]');
    if (!form || !$('[data-wiz="2"]', form)) return;
    var steps = $$('[data-wiz]', form), dots = $$('[data-wiz-dot]', form), bar = $('[data-wiz-bar]', form), cur = 1;
    function go(n, instant) {
      var from = steps[cur - 1], to = steps[n - 1], dir = n > cur ? 1 : -1;
      cur = n; wiz.step = n;
      dots.forEach(function (d) { var k = +d.getAttribute('data-wiz-dot'); d.classList.toggle('is-on', k === n); d.classList.toggle('is-done', k < n); });
      if (bar) bar.style.transform = 'scaleX(' + n / steps.length + ')';
      steps.forEach(function (s) { s.classList.toggle('is-on', s === to); });
      if (hasGsap && !reduce && !instant && from !== to) G.fromTo(to, { x: 40 * dir, opacity: 0 }, { x: 0, opacity: 1, duration: 0.55, ease: 'expo.out', clearProps: 'x,opacity' });
      if (hasGsap) ScrollTrigger.refresh();
    }
    function focusFirst() {
      var f = $('.wiz-step.is-on .dd-btn, .wiz-step.is-on input:not([type="hidden"]):not([tabindex="-1"])', form);
      if (f) f.focus({ preventScroll: true });
    }
    wiz = { go: go, focus: focusFirst, step: 1 };
    $('[data-wiz-next]', form).addEventListener('click', function () { go(2); if (fine) focusFirst(); });
    $('[data-wiz-back]', form).addEventListener('click', function () { go(1); if (fine) focusFirst(); });
    $$('select[data-ctx]', form).forEach(function (s) { s.addEventListener('change', function () { ctx[s.getAttribute('data-ctx')] = s.value; }); });
    go(1, true);
  }

  /* ================================================================= *
   * Lead form + "go to form" links.
   * ================================================================= */
  function setInterest(intent) {
    var sel = $('[data-interest]');
    if (!sel || !intent) return;
    if (Array.prototype.some.call(sel.options, function (o) { return (o.value || o.text) === intent; })) sel.value = intent;
    bpPaint();
  }
  /* The consultation form lives on the home page only. Elsewhere
     (universities.html) "go to form" carries the shortlist and the chosen
     topic over to it: saved for the next page, with a URL fallback when
     storage is blocked. The home page picks them up in initForm(). */
  var HANDOFF = 'tcHandoff';
  function handOffToHome(intent) {
    var data = { shortlist: ctx.shortlist.slice(), intent: intent || '' }, q = '';
    try { localStorage.setItem(HANDOFF, JSON.stringify(data)); }
    catch (e) { q = '?handoff=' + encodeURIComponent(JSON.stringify(data)); }
    location.href = './index.html' + q + '#contact';
  }
  function goToForm(intent) {
    if (!$('form[data-lead-form]')) { handOffToHome(intent); return; }
    setInterest(intent);
    var target = $('#contact'), card = $('[data-form-card]');
    scrollToEl(target, -40);
    setTimeout(function () {
      if (hasGsap && !reduce) G.fromTo(card, { scale: 0.97 }, { scale: 1, duration: 0.9, ease: 'elastic.out(1, .5)' });
      if (fine && wiz) wiz.focus();
    }, reduce ? 0 : 1200);
    try { history.replaceState(null, '', '#contact'); } catch (e) { /* file:// */ }
  }
  /* Arriving with #contact (e.g. from universities.html): land on the form
     once the layout has settled — images, fonts and pin spacers all change
     heights after load, which would leave a smooth scroll short of it. */
  function arriveAtForm() {
    var target = $('#contact');
    if (!target) return;
    function jump() {
      if (hasGsap) ScrollTrigger.refresh();
      var y = target.getBoundingClientRect().top + window.pageYOffset - 40;
      if (lenis) lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y);
    }
    function settle() {
      jump();
      setTimeout(jump, 350);
      if (fine && wiz) setTimeout(function () { wiz.focus(); }, 450);
    }
    if (document.readyState === 'complete') settle(); else window.addEventListener('load', settle, { once: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { setTimeout(jump, 0); });
  }
  function initGoto() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-goto]');
      if (!a) return;
      e.preventDefault();
      goToForm(a.getAttribute('data-intent'));
    });
  }
  function renderCarry() {
    var form = $('form[data-lead-form]');
    if (!form) return;
    ['study_level', 'intake', 'funding'].forEach(function (k) { var f = $('[data-ctx="' + k + '"]', form); if (f && ctx[k] && f.value !== ctx[k]) f.value = ctx[k]; });
    $('[data-ctx="shortlist"]', form).value = ctx.shortlist.join(', ');
    var list = $('[data-carry-list]', form);
    list.innerHTML = '';
    ctx.shortlist.forEach(function (u) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'carry-chip';
      b.setAttribute('aria-label', 'Remove ' + u + ' from shortlist');
      b.innerHTML = '♥ ' + esc(u) + '<svg class="icon icon-sm" aria-hidden="true"><use href="#i-x"/></svg>';
      b.addEventListener('click', function () { setShort(u, false); });
      list.appendChild(b);
    });
    $('[data-carry]', form).classList.toggle('is-on', ctx.shortlist.length > 0);
    bpPaint();
  }
  function initForm() {
    var form = $('form[data-lead-form]');
    if (!form) return;
    var body = $('[data-form-body]', form), done = $('[data-form-done]', form), btn = $('[data-submit]', form), btnHTML = btn.innerHTML, err = $('[data-form-err]', form);
    function fail(msg, input) {
      err.textContent = msg; err.classList.add('is-on');
      if (input) {
        var fl = input.closest('.fl'); fl.classList.add('is-invalid'); input.focus();
        if (hasGsap && !reduce) G.fromTo(fl, { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, .3)' });
      }
    }
    $$('input', form).forEach(function (i) { i.addEventListener('input', function () { var fl = i.closest('.fl'); if (fl) fl.classList.remove('is-invalid'); }); });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (wiz && wiz.step === 1) { wiz.go(2); if (fine) wiz.focus(); return; }
      err.classList.remove('is-on');
      var name = $('#f-name'), phone = $('#f-phone'), email = $('#f-email'), interest = $('#f-interest');
      if (name.value.trim().length < 2) return fail('Enter your full name so your counsellor knows who to ask for.', name);
      if (!/^[0-9]{7,15}$/.test(phone.value.replace(/\D/g, ''))) return fail('Enter a phone number with 7 to 15 digits.', phone);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) return fail('Enter an email address like you@example.com.', email);
      $('[data-destination]', form).value = interest.value === 'General UK Inquiry' ? 'General UK Inquiry' : 'UK – ' + interest.value;
      var data = {};
      new FormData(form).forEach(function (v, k) { if (v !== '') data[k] = v; });
      data.phone = (data.country_code || '') + ' ' + (data.phone_number || '');
      delete data.country_code; delete data.phone_number; delete data.interest;
      data.page = enquiryPage();
      btn.disabled = true; btn.innerHTML = '<span>Submitting…</span>';
      fetch(ENQUIRY_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().catch(function () { return { success: false }; }); })
        .then(function (res) {
          if (res && res.success) {
            form.reset(); body.hidden = true; done.hidden = false; done.focus();
            if (hasGsap && !reduce && window.DrawSVGPlugin) {
              G.timeline().from('[data-check-c]', { drawSVG: '0%', duration: 0.8, ease: 'power2.inOut' }).from('[data-check-p]', { drawSVG: '0%', duration: 0.5, ease: 'power2.out' }).from($$('h3, p, .done-row', done), { y: 20, opacity: 0, stagger: 0.08, duration: 0.5 }, '-=0.3');
            }
            confetti($('[data-confetti]', done));
          } else fail((res && res.message) || 'Your details were not sent. Try again, or email info@tuteeconnect.com.');
        })
        .catch(function () { fail('Your details were not sent because the connection dropped. Check your internet and try again.'); })
        .then(function () { btn.disabled = false; btn.innerHTML = btnHTML; });
    });
    $('[data-form-again]', form).addEventListener('click', function () { done.hidden = true; body.hidden = false; if (wiz) wiz.go(1, true); renderCarry(); if (wiz) wiz.focus(); });
    // shortlist + topic handed over from universities.html (see handOffToHome)
    var hand = null;
    try { hand = JSON.parse(localStorage.getItem(HANDOFF) || 'null'); localStorage.removeItem(HANDOFF); } catch (e2) { /* storage unavailable */ }
    if (!hand) {
      try {
        var qs = new URLSearchParams(location.search).get('handoff');
        if (qs) { hand = JSON.parse(qs); history.replaceState(null, '', location.pathname + location.hash); }
      } catch (e3) { /* old browser / bad data */ }
    }
    if (hand && hand.shortlist) {
      hand.shortlist.forEach(function (u) { if (u && typeof u === 'string' && ctx.shortlist.indexOf(u) === -1) ctx.shortlist.push(u); });
      setInterest(hand.intent || (ctx.shortlist.length ? 'University Selection' : ''));
      paintShortlist();
    }
    renderCarry();
  }

  /* ================================================================= *
   * Tutee AI — answers questions from this page's own content.
   *
   *  1. KB: curated answers written from the page copy (each with the
   *     section it comes from, so "Show me" can scroll there).
   *  2. Universities: names and cities are looked up in the same data the
   *     map / directory use.
   *  3. Page search: anything else is matched against the page text itself
   *     (FAQs, service details, steps, cards…), and the most relevant
   *     sentences are quoted.
   *  Only when none of these finds the answer does it point to an advisor;
   *  when a question asks for figures the page deliberately leaves out
   *  (fees, scores, deadlines…) it answers what the page says and adds that
   *  an advisor confirms the exact details. It never asks for personal data.
   * ================================================================= */
  var WA_URL = 'https://wa.me/917358364959';
  var WELCOME = "Hi! 👋 I'm **Tutee AI**.\n\nAsk me anything about this page — studying in the UK, the Student visa, the Graduate Route, scholarships and loans, universities, bringing your family, or how Tutee Connect helps.";
  var STOP = ('a an the and or but if of to in on at for with by from is are was were be been am do does did can could would should will shall may might ' +
    'i me my we our you your it its this that these those there here what which who whom how when where whats hows tell about please ' +
    'get got give know want need like also just any some more most much many very really uk tutee connect').split(' ');
  var STOPSET = {}; STOP.forEach(function (w) { STOPSET[w] = 1; });
  // words people use for the same thing on the page
  var SYN = {
    fee: 'cost', fees: 'cost', price: 'cost', expensive: 'cost', afford: 'cost', budget: 'cost', tuition: 'cost tuition', money: 'cost', charges: 'cost', charge: 'cost',
    psw: 'graduate route', poststudy: 'graduate route', 'post-study': 'graduate route', postwork: 'graduate route',
    pr: 'settlement ilr', ilr: 'settlement ilr', permanent: 'settlement', residency: 'settlement', citizenship: 'settlement',
    wife: 'family dependant partner', husband: 'family dependant partner', spouse: 'family dependant partner', partner: 'family dependant partner', kids: 'family dependant children', children: 'family dependant children', child: 'family dependant children', dependent: 'dependant family', dependents: 'dependant family', dependants: 'dependant family',
    job: 'work', jobs: 'work', employment: 'work', working: 'work', parttime: 'part-time work',
    ielts: 'english test ielts', pte: 'english test pte', toefl: 'english test', duolingo: 'english test', languagecert: 'english test languagecert', english: 'english test',
    sop: 'personal statement', lor: 'references', statement: 'personal statement',
    loan: 'loan', loans: 'loan', bank: 'loan', finance: 'loan funding', financing: 'loan funding', collateral: 'loan collateral',
    scholarship: 'scholarship', scholarships: 'scholarship', grant: 'scholarship grant', grants: 'scholarship grant', bursary: 'scholarship bursary', bursaries: 'scholarship bursary', waiver: 'scholarship',
    hostel: 'accommodation', housing: 'accommodation', stay: 'accommodation', rent: 'accommodation',
    phone: 'contact', number: 'contact', call: 'contact', email: 'contact', mail: 'contact', whatsapp: 'contact', reach: 'contact',
    masters: 'master', msc: 'master', ma: 'master', mres: 'research phd', doctorate: 'phd', bachelors: 'undergraduate', ug: 'undergraduate', pg: 'postgraduate',
    refused: 'refusal', rejected: 'refusal', rejection: 'refusal', denied: 'refusal'
  };
  function stem(w) { return w.length > 4 ? w.replace(/(ings|ing|ies|es|s)$/, function (m) { return m === 'ies' ? 'y' : ''; }) : w; }
  function tokens(text) {
    var out = [];
    String(text).toLowerCase().replace(/[’']/g, '').replace(/part-time/g, 'parttime').replace(/[^a-z0-9+ ]+/g, ' ').split(/\s+/).forEach(function (w) {
      if (!w || STOPSET[w]) return;
      var sw = SYN[w] || SYN[stem(w)];
      (sw ? (w + ' ' + sw) : w).split(' ').forEach(function (x) { if (x && !STOPSET[x]) { x = stem(x); if (out.indexOf(x) === -1) out.push(x); } });
    });
    return out;
  }

  // ---- 1. curated answers (wording taken from the page) -------------------
  var KB = [
    { id: 'shortlist', k: 'shortlist shortlisted heart save compare favourite', sec: '#universities',
      a: 'Tap a city on the map (or open the universities page), open any university to see its details, and tap the **heart** to shortlist it. Then choose **Apply with my shortlist** — your shortlist follows you to the free consultation form and is sent with your enquiry, so your counsellor can check your chances for each one.' },
    { id: 'career', k: 'career consultation counselling counseling guidance pathway pathways', sec: '#services',
      a: 'Our **Career Consultation is free of cost**. It builds your self-awareness about your profile and shows the pathways for career advancement in the UK, and our consultants stay with you through each phase of the application. We also brief you on the UK — one-year Master\'s degrees, the two-year Graduate Route and the pathway onward to the Skilled Worker visa and settlement.' },
    { id: 'select', k: 'choose select selection pick suit suitable match course courses college', sec: '#services',
      a: 'Our **College Selection** service: based on your interests and previous academics, our process experts suggest the most suitable **courses and universities** across England, Scotland, Wales and Northern Ireland, from 200+ institutions in our network.\n\nWe explain module structures, credit requirements, placement years and post-graduation scope, so you can make the right decision.' },
    { id: 'services', k: 'services service offer offering provide what-we-do end-to-end', sec: '#services',
      a: 'Tutee Connect offers **nine services**, end to end:\n• Career Consultation (the first consultation is free)\n• Language Test — IELTS, PTE and LanguageCert prep\n• College Selection from 200+ UK institutions\n• Documentation — Personal Statements, references, transcripts\n• Student Visa & credibility-interview prep\n• E2E Settlement — Graduate Route, Skilled Worker, ILR\n• Financial Aid — loans and UK scholarships\n• Post-Landing support\n• Family Migration' },
    { id: 'consult', k: 'consultation free evaluation profile assess eligible eligibility book appointment counsellor advisor route map apply start', sec: '#contact', form: true,
      a: 'Your **free consultation** includes:\n• **Profile evaluation** — your marks, tests and goals, checked the way UKVI officers look at them\n• **University shortlist** — courses that fit your profile, from our 200+ UK tie-ups\n• **Visa route map** — every step from your CAS to the credibility interview\n• **Funding options** — scholarships, bursaries and education-loan partners\n\nIt\'s free with no obligation — the form takes under a minute.' },
    { id: 'require', k: 'requirement requirements documents need eligible eligibility admission criteria passport transcripts apply application qualify', sec: '#faq',
      a: 'Generally you need a **valid passport**, strong **academic transcripts**, proof of **English language proficiency** (IELTS, PTE or an accepted equivalent), **academic references** and a compelling **Personal Statement**. Some postgraduate courses — MBAs in particular — may also ask for a **GMAT** score or work experience.' },
    { id: 'visa', k: 'visa student-visa student cas biometrics credibility interview ukvi immigration health surcharge', sec: '#faq',
      a: 'Once you accept an offer, your university issues a **CAS** (Confirmation of Acceptance for Studies). You then apply online for the **Student visa**, pay the visa fee and the Immigration Health Surcharge, show the required funds, and attend a **biometrics** appointment — plus a **credibility interview** if one is requested.\n\nWe guide every step, including one-on-one **mock interviews**, and have a **99% UK Student visa success rate**.' },
    { id: 'refusal', k: 'refusal refused previous reject complicated difficult gap backlog low marks', sec: '#testimonials',
      a: 'Yes — we have successfully managed many **complicated cases**. Every document is reviewed multiple times before submission, and one-on-one **mock credibility interviews** help you explain your goals clearly to UKVI officers. One of our students, Sneha, had a previous visa refusal; her coordinator turned it around and guided her through the whole documentation process successfully.' },
    { id: 'success', k: 'success rate 99 percent record result track approval chances', sec: '#welcome',
      a: 'Tutee Connect has a **99% UK Student visa success rate**, **200+ UK university tie-ups** and has guided **5,000+ students**. We scrutinise every profile from the view of UKVI officers to choose the right pathway.' },
    { id: 'graduate', k: 'graduate route after graduation graduating post-study stay two years psw', sec: '#relocate',
      a: 'The **Graduate Route** lets you stay and work — or look for work — in the UK for **two years** after your degree (**three years after a PhD**). No sponsor is required, which makes it the ideal bridge into a **Skilled Worker visa**.' },
    { id: 'settle', k: 'settlement settle ilr indefinite leave remain permanent skilled worker long term career pathway', sec: '#relocate',
      a: 'The pathway to settling in the UK has four steps:\n1. **UK Student Visa** — complete your programme (we help you choose courses that lead into the Graduate Route)\n2. **Graduate Route** — two years to work after graduation (three after a PhD), no sponsor\n3. **Skilled Worker visa** — employer-sponsored, for long-term work\n4. **Indefinite Leave to Remain** — after five continuous years on a qualifying work visa' },
    { id: 'family', k: 'family dependant partner children bring relocate spouse together mres phd research', sec: '#relocate',
      a: 'We help **MRes and PhD students** relocate to the UK with their families. Since January 2024 only students on **postgraduate research** courses (PhD or equivalent) or **government-sponsored** courses can bring dependants — a partner and children under 18 — on a Student visa.\n\nOnce you move onto the Graduate Route and then a **Skilled Worker visa**, your partner and children can join you, and Skilled Worker dependants have **full work rights**. We prepare the dependant visa applications, documents and interview prep.' },
    { id: 'loan', k: 'loan collateral non-collateral bank banks funding finance lender lenders partners emi', sec: '#financial-aid',
      a: 'We have exclusive tie-ups with reputed national banks and private finance sectors, offering both **collateral and non-collateral education loans**. Loans can cover **tuition fees, accommodation and living expenses**.\n\nLending partners on the page include ICICI Bank, HDFC Credila, IDFC First Bank, InCred, Auxilo, Avanse, Union Bank, Prodigy Finance, Axis Bank and MPOWER Financing — and many more.' },
    { id: 'scholar', k: 'scholarship grant bursary merit waiver funding aid', sec: '#scholarships',
      a: 'We identify and secure international student **scholarships, departmental grants and bursaries**:\n• **Merit-based scholarships** directly from prestigious UK universities, for strong academic profiles\n• **Full & partial grants** — institutional bursaries and department-specific scholarships that can cover part or all of your tuition\n• **Application support** — winning scholarship essays and the supplementary documents for financial aid' },
    { id: 'cost', k: 'cost tuition living expense afford budget cheap', sec: '#contact', form: true, specific: true,
      a: 'This page doesn\'t list costs — they depend on the university, course and city, so your counsellor prepares a **personalised plan** during your free consultation.\n\nWhat the page does cover: **scholarships and grants** (which can cover part or all of tuition) and **collateral and non-collateral education loans** that cover tuition, accommodation and living expenses.' },
    { id: 'english', k: 'english test ielts pte languagecert selt toefl duolingo language exam gmat score band', sec: '#services',
      a: 'We prepare you for the UK English tests — **IELTS for UKVI**, **PTE Academic UKVI** and **LanguageCert Academic SELT** — plus admission tests such as the **GMAT** where a course needs one. That includes expert training, **free study materials** and several **mock tests**, and we then book your official UKVI-approved SELT.' },
    { id: 'docs', k: 'personal statement documents documentation references lor sop transcripts essay', sec: '#services',
      a: 'We share samples, clear requirements and the formatting for every crucial document — **Personal Statement, academic references and transcripts** — and review everything **multiple times** at the pre-apply stage, so nothing holds up your university or visa application.' },
    { id: 'accom', k: 'accommodation housing pre-departure briefing arrive arrival land landing post-landing gp national insurance brp evisa', sec: '#faq',
      a: 'Yes. We partner with top student housing providers to secure safe, comfortable accommodation near your campus, and run **pre-departure briefings** on UK culture, academic expectations, packing and immigration.\n\nAfter you land, your consultant helps with **accommodation, your eVisa/BRP, GP registration (NHS), National Insurance number, a UK bank account** and finding permitted **part-time work**.' },
    { id: 'work', k: 'work part-time job while studying earn hours', sec: '#journey', specific: true,
      a: 'After you land, our **post-landing support** helps you find **permitted term-time part-time work** (it\'s part of step 6 of your journey). After graduation, the **Graduate Route** gives you two years to work in the UK (three after a PhD), with no sponsor needed.\n\nThe exact weekly hours you may work aren\'t listed on this page — they depend on your visa conditions, so an advisor confirms them for your case.' },
    { id: 'journey', k: 'journey steps stages timeline step roadmap', sec: '#journey',
      a: 'Your UK journey in 8 steps:\n**Before you fly** — 1. Free profile evaluation · 2. English test · 3. University offer · 4. Documents & CAS · 5. Student visa\n**When you land** — 6. Accommodation, eVisa, GP, NI number, bank account and part-time work\n**After graduation** — 7. Graduate Route · 8. Settlement (Skilled Worker, then ILR, with your family alongside you)' },
    { id: 'whyuk', k: 'why britain study united kingdom benefit benefits advantage advantages', sec: '#why-uk',
      a: 'Why the UK:\n• **One-year Master\'s degrees** — finish faster than most countries\n• **Two-year Graduate Route** work visa after you graduate (three after a PhD)\n• **4 nations** to choose from — England, Scotland, Wales and Northern Ireland\n• World\'s best universities, a distinctive and diverse curriculum, and a high level of practical instruction' },
    { id: 'master', k: 'master duration one year 1 long length postgraduate', sec: '#why-uk', specific: true,
      a: 'UK **Master\'s degrees are typically one year** — you finish faster than in most countries — and the two-year Graduate Route follows. UK MBAs are listed as an option too, and some ask for work experience or a GMAT.' },
    { id: 'unis', k: 'university universities college institutions top ranked list tie-ups', sec: '#universities',
      a: 'We have **200+ UK university tie-ups**. On the map you can explore top-ranked universities in London, Oxford, Cambridge, Edinburgh, Manchester, Coventry, Bristol, Glasgow and Durham, and the universities page lists **all 499 UK institutions** (24 in the Russell Group) with search and filters.\n\nOpen any university for its details, heart it to shortlist, then apply for a free consultation with your shortlist attached.' },
    { id: 'russell', k: 'russell group', sec: '#universities',
      a: 'The **Russell Group** is a group of **24 leading research-intensive UK universities**. All the top-ranked universities on our map — Oxford, Cambridge, Imperial, UCL, LSE, Edinburgh, King\'s, Manchester, Bristol, Warwick, Glasgow and Durham — are Russell Group members.' },
    { id: 'intake', k: 'intake january september when start deadline semester session', sec: '#home', specific: true,
      a: 'You can plan for a **January 2027**, **September 2027** or **2028-or-later** start (or "not sure yet") — pick it in the "Plan your UK journey" bar. Application deadlines differ by university and course, so your counsellor confirms the exact dates for your intake.' },
    { id: 'levels', k: 'undergraduate bachelor postgraduate master mba phd research level course', sec: '#home',
      a: 'We guide students for **Undergraduate**, **Master\'s**, **MBA** and **PhD / research** study. Choose your level in the "Plan your UK journey" bar and it\'s carried into your free consultation.' },
    { id: 'contact', k: 'contact phone number call email whatsapp website talk speak reach advisor human office', sec: '.site-footer',
      a: 'You can reach Tutee Connect on:\n• **Call / WhatsApp:** +91 73583 64959\n• **Email:** info@tuteeconnect.com\n• **Website:** www.tuteeconnect.com\n\nWe reply within one working day.' },
    { id: 'office', k: 'office address location visit branch located headquarters walk', sec: '.site-footer',
      a: 'The office address isn\'t listed on this page. Call or WhatsApp **+91 73583 64959** or email **info@tuteeconnect.com** and an advisor will share it — or book a free consultation and we\'ll arrange a meeting.' },
    { id: 'about', k: 'tutee connect company who are you about experience students guided trust', sec: '#welcome',
      a: '**Tutee Connect** gives study-abroad and immigration advice for students who want to study, work and settle overseas. For the UK: a **99% Student visa success rate**, **200+ UK university tie-ups** and **5,000+ students guided** — one expert team from your first consultation to settlement.' },
    { id: 'reviews', k: 'review reviews testimonial stories feedback experience students say genuine', sec: '#testimonials',
      a: 'A few things our students say:\n• Priya K. (Master\'s, London): her Student visa was approved on the first attempt after credibility-interview prep.\n• Vishal M. (Manchester): the post-landing support for accommodation was "a lifesaver".\n• Rahul V. (Leeds): the non-collateral loan help connected him directly with banking partners.\n• Siddharth J. (PhD, Sheffield): profile building helped him secure a full tuition waiver.' },
    { id: 'dest', k: 'other countries destinations usa canada australia ireland germany singapore abroad', sec: '.site-footer',
      a: 'Besides the UK, Tutee Connect covers **Singapore, the USA, Canada, Australia, New Zealand, Ireland, Germany, France, Finland, Poland, Malaysia, the UAE and Mauritius** — see "Destinations" at the bottom of the page.' }
  ];
  // questions that ask for figures this page deliberately leaves out
  var SPECIFIC = /\b(how much|cost|fees?|price|amount|charges?|salary|stipend|band|score|marks? required|minimum|cut.?off|deadline|last date|how many hours|hours per week|percentage|gpa|cgpa|interest rate)\b/i;
  var ADVISOR_NOTE = 'For the exact figures for your case, an advisor can confirm them in your free consultation.';

  function kbIndex() {
    KB.forEach(function (e) { e._k = tokens(e.k); e._t = tokens(e.a); });
  }
  function scoreKB(qt) {
    return KB.map(function (e) {
      var s = 0;
      qt.forEach(function (t) { if (e._k.indexOf(t) !== -1) s += WEAK[t] ? 1 : 2; else if (e._t.indexOf(t) !== -1) s += 0.5; });
      return { e: e, s: s };
    }).sort(function (a, b) { return b.s - a.s; });
  }

  // ---- 2. universities ----------------------------------------------------
  var GENERIC = { university: 1, univ: 1, of: 1, the: 1, college: 1, and: 1, school: 1, institute: 1, london: 1, for: 1, at: 1, arts: 1, uk: 1, royal: 1, city: 1, science: 1, technology: 1 };
  var ALIAS = { lse: 'London School of Economics and Political Science', 'london school of economics': 'London School of Economics and Political Science', ucl: 'University College London', 'university college london': 'University College London', kcl: "King's College London", kings: "King's College London", 'kings college': "King's College London", imperial: 'Imperial College London' };
  // names whose only distinctive word is an ordinary word ('University of Law') must be typed in full
  var COMMON = { law: 1, open: 1, west: 1, east: 1, north: 1, south: 1, central: 1, creative: 1, music: 1, design: 1, business: 1, sport: 1, film: 1, art: 1, drama: 1, health: 1, agriculture: 1, english: 1, global: 1, international: 1, new: 1, metropolitan: 1, buckingham: 0 };
  function uniData() {
    if (window.UK_UNIVERSITIES && window.UK_UNIVERSITIES.length) return window.UK_UNIVERSITIES;
    var out = [];
    CITIES.forEach(function (c) { c.unis.forEach(function (u) { out.push(uniInfo(u)); }); });
    return out;
  }
  function findUni(q) {
    var low = ' ' + q.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9 ]+/g, ' ') + ' ', data = uniData(), best = null, bestLen = 0;
    Object.keys(ALIAS).forEach(function (a) { if (low.indexOf(' ' + a + ' ') !== -1) { var u = data.filter(function (x) { return x.name === ALIAS[a]; })[0]; if (u && 99 > bestLen) { best = u; bestLen = 99; } } });
    if (best) return best;
    data.forEach(function (u) {
      var words = u.name.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(function (w) { return w.length > 2 && !GENERIC[w]; });
      var full = u.name.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
      if (!words.length) { if (low.indexOf(' ' + full + ' ') !== -1 && full.length > bestLen) { best = u; bestLen = full.length; } return; }
      if (words.length === 1 && COMMON[words[0]] && low.indexOf(' ' + full + ' ') === -1) return;
      var all = words.every(function (w) { return low.indexOf(' ' + w + ' ') !== -1; });
      var len = words.join(' ').length;
      if (all && len > bestLen) { best = u; bestLen = len; }
    });
    return best;
  }
  var PLACES = ['london', 'oxford', 'cambridge', 'edinburgh', 'manchester', 'coventry', 'bristol', 'glasgow', 'durham', 'birmingham', 'leeds', 'sheffield', 'liverpool', 'nottingham', 'cardiff', 'belfast', 'newcastle', 'aberdeen', 'dundee', 'southampton', 'york', 'bath', 'exeter', 'leicester', 'scotland', 'wales', 'england', 'northern ireland'];
  function findPlace(q) {
    var low = q.toLowerCase();
    for (var i = PLACES.length - 1; i >= 0; i--) if (new RegExp('\\b' + PLACES[i] + '\\b').test(low)) return PLACES[i];
    return null;
  }
  function unisIn(place) {
    var p = place.toLowerCase();
    return uniData().filter(function (u) {
      var parts = String(u.location || '').toLowerCase().split(',').map(function (x) { return x.trim(); });
      return parts.indexOf(p) !== -1;
    }).sort(function (a, b) { return (a.ranked ? a.rank : 1e9) - (b.ranked ? b.rank : 1e9); });
  }
  function uniAnswer(u) {
    var parts = String(u.location || '').split(',');
    var lines = ['**' + u.name + '**' + (u.location ? ' — ' + u.location : '')];
    if (u.ranked) lines.push('• Ranked **#' + u.rank + ' in the UK** (a general blend of widely used league tables)');
    if (u.type) lines.push('• Type: ' + (TYPE_INFO[u.type] || u.type));
    if (u.programs) lines.push('• Known for: ' + u.programs);
    lines.push('\nWe help with course and entry-requirement checks, your Personal Statement and documents, scholarships and loans, and your CAS and Student visa. Exact entry requirements depend on the course — an advisor confirms them for your profile.');
    return { text: lines.join('\n'), uni: u, city: parts[0] };
  }

  // subjects come from the universities' "known for" lists
  var subjects = null;
  function findSubject(q) {
    if (!/\b(univ\w*|colleges?|best|top|good|study|studying|where|which|known)\b/i.test(q)) return null;
    if (!subjects) {
      var seen = {};
      uniData().forEach(function (u) { String(u.programs || '').split(',').forEach(function (p) { p = p.trim().toLowerCase(); if (p.length > 2) seen[p] = 1; }); });
      subjects = Object.keys(seen).sort(function (a, b) { return b.length - a.length; });
    }
    var low = ' ' + q.toLowerCase().replace(/[^a-z ]+/g, ' ') + ' ';
    for (var i = 0; i < subjects.length; i++) if (low.indexOf(' ' + subjects[i] + ' ') !== -1) return subjects[i];
    return null;
  }

  // generic words that alone don't identify a topic
  var WEAK = {}; ['offer', 'provide', 'service', 'help', 'support', 'available', 'apply', 'start', 'list', 'top', 'process', 'student', 'study', 'course', 'college', 'university', 'universiti', 'good', 'best', 'free'].forEach(function (w) { WEAK[stem(w)] = 1; });
  var vocabCache = null;
  function pageVocab() {
    if (vocabCache) return vocabCache;
    var v = {};
    function addAll(arr) { arr.forEach(function (t) { v[t] = 1; }); }
    KB.forEach(function (e) { addAll(e._k); addAll(e._t); });
    if (!passages) passages = harvest();
    passages.forEach(function (p) { addAll(p._t); });
    uniData().forEach(function (u) { addAll(tokens(u.name + ' ' + (u.location || '') + ' ' + (u.programs || '') + ' ' + (u.type || ''))); });
    vocabCache = v;
    return v;
  }

  // ---- 3. page search -----------------------------------------------------
  var passages = null;
  function harvest() {
    var out = [];
    function add(title, text, el) { text = String(text || '').replace(/\s+/g, ' ').trim(); if (text.length > 30) out.push({ title: title, text: text, el: el, _t: tokens(title + ' ' + text) }); }
    $$('.faq-item').forEach(function (it) { add($('.faq-t', it).textContent, $('.faq-a p', it).textContent, it); });
    var tpl = $('template[data-svc-data]');
    if (tpl) Array.prototype.forEach.call(tpl.content.children, function (d) { add($('h3', d).textContent, d.textContent.replace($('h3', d).textContent, ''), $('#services')); });
    $$('.step-card, .why-stat, .gp, .rung, .proof, .family-copy, .loans-grid, .quote, .tilt-card, .perks-row li, .welcome-copy, .hero-copy, .grants-intro, .settle-head, .why-copy').forEach(function (el) {
      var h = $('h2, h3, b', el); add(h ? h.textContent : '', el.textContent, el);
    });
    $$('section[data-section]').forEach(function (s) { var h = $('h2', s), l = $('.lead', s); if (h && l) add(h.textContent, l.textContent, s); });
    return out;
  }
  function searchPage(qt) {
    if (!passages) passages = harvest();
    var N = passages.length || 1, df = {};
    passages.forEach(function (p) { var seen = {}; p._t.forEach(function (t) { if (!seen[t]) { seen[t] = 1; df[t] = (df[t] || 0) + 1; } }); });
    var best = null;
    passages.forEach(function (p) {
      var s = 0, hit = 0;
      qt.forEach(function (t) { if (p._t.indexOf(t) !== -1) { hit++; s += Math.log(1 + N / (df[t] || 1)); } });
      if (hit && (!best || s > best.s)) best = { p: p, s: s, hit: hit };
    });
    if (!best) return null;
    var need = Math.min(2, qt.length);
    if (best.hit < need) return null;
    // quote the most relevant sentences
    var sents = best.p.text.match(/[^.!?]+[.!?]*/g) || [best.p.text], scored = sents.map(function (x, i) { var t = tokens(x); return { x: x, i: i, s: qt.filter(function (q) { return t.indexOf(q) !== -1; }).length }; });
    var top = scored.filter(function (o) { return o.s > 0; }).sort(function (a, b) { return b.s - a.s; }).slice(0, 3).sort(function (a, b) { return a.i - b.i; }).map(function (o) { return o.x; });
    if (!top.length) top = sents.slice(0, 2);
    return { title: best.p.title, text: top.join(' '), el: best.p.el };
  }

  // ---- answer -------------------------------------------------------------
  var SMALL = [
    [/^(hi|hello|hey|hii+|good (morning|afternoon|evening)|namaste)\b/i, 'Hello! 👋 What would you like to know about studying in the UK? You can ask about visas, universities, scholarships, loans, family relocation or our services.'],
    [/\b(thanks|thank you|thx|great|awesome|cool|ok(ay)?)\b[.!]*$/i, 'You\'re welcome! Anything else you\'d like to know?'],
    [/\b(bye|goodbye|see you)\b/i, 'Good luck with your UK plans! You can come back and ask anything any time.']
  ];
  function answer(text) {
    var q = text.trim(), qt = tokens(q), specific = SPECIFIC.test(q);
    for (var i = 0; i < SMALL.length; i++) if (SMALL[i][0].test(q) && qt.length <= 3) return { text: SMALL[i][1] };
    // "universities in <place>" (checked first: "in Oxford" is a place, not the university)
    var place = findPlace(q);
    if (place && /\b(universities|unis|colleges|institutions|options)\b|\b(univ\w*|colleges?)\s+(in|near|at|around)\b/i.test(q)) {
      var list = unisIn(place);
      if (list.length) {
        var name = place.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
        var shown = list.slice(0, 6).map(function (x) { return '• ' + (x.ranked ? '#' + x.rank + ' ' : '') + x.name; }).join('\n');
        return { text: 'Universities in **' + name + '** on this site:\n' + shown + (list.length > 6 ? '\n…and ' + (list.length - 6) + ' more on the universities page.' : '') + '\n\nAsk me about any of them, or open one to see its details.', more: list.length > 6 || !window.UK_UNIVERSITIES ? place : null };
      }
    }
    // a named university
    var u = findUni(q);
    if (u) {
      var ua = uniAnswer(u);
      if (specific) ua.text = 'Fees and exact entry requirements for ' + u.name + ' aren\'t listed on this page — an advisor can give you those for your course.\n\n' + ua.text;
      return ua;
    }
    // "best universities for <subject>"
    var subj = findSubject(q);
    if (subj) {
      var exact = function (x) { return String(x.programs || '').toLowerCase().split(',').some(function (p) { return p.trim() === subj; }) ? 0 : 1; };
      var by = uniData().filter(function (x) { return String(x.programs || '').toLowerCase().indexOf(subj) !== -1; }).sort(function (a, b) { return (exact(a) - exact(b)) || ((a.ranked ? a.rank : 1e9) - (b.ranked ? b.rank : 1e9)); });
      if (by.length) return { text: 'Universities on this site known for **' + subj + '**:\n' + by.slice(0, 6).map(function (x) { return '• ' + (x.ranked ? '#' + x.rank + ' ' : '') + x.name; }).join('\n') + (by.length > 6 ? '\n…and ' + (by.length - 6) + ' more.' : '') + '\n\nEntry requirements depend on the course — an advisor checks them against your profile.', more: (by.length > 6 || !window.UK_UNIVERSITIES) ? subj : null };
    }
    var ranked = scoreKB(qt);
    if (/\b(cost|costs|fees?|price|tuition|expens\w*|afford\w*|money|budget)\b/i.test(q) && !/\b(scholarship|grant|bursar|waiver|loan)/i.test(q)) ranked.forEach(function (r) { if (r.e.id === 'cost') r.s += 2.5; });
    ranked.sort(function (a, b) { return b.s - a.s; });
    var top = ranked[0], second = ranked[1];
    // "Do you offer GRE coaching?": the only overlap is a generic word and the
    // real subject never appears on the page → say so instead of guessing
    if (top && top.s >= 2) {
      var vocab = pageVocab(), unknownWords = qt.filter(function (t) { return !vocab[t] && t.length > 1; });
      var hits = qt.filter(function (t) { return top.e._k.indexOf(t) !== -1; });
      if (unknownWords.length && hits.every(function (t) { return WEAK[t]; })) top = null;
    }
    if (top && top.s >= 2) {
      var txt = top.e.a;
      // two topics in one question ("visa and loans") get both answers
      if (/\band\b|\balso\b|,/i.test(q)) ranked.slice(1, 3).forEach(function (r) { if (r.s >= 2 && r.s >= top.s * 0.5) txt += '\n\n' + r.e.a; });
      if (specific && !top.e.specific) txt += '\n\n' + ADVISOR_NOTE;
      return { text: txt, sec: top.e.sec, form: top.e.form };
    }
    var hit = qt.length ? searchPage(qt) : null;
    if (hit) return { text: (hit.title ? '**' + hit.title.trim() + '**\n' : '') + hit.text + (specific ? '\n\n' + ADVISOR_NOTE : ''), el: hit.el };
    return { unknown: true, text: 'I couldn\'t find that on this page. For anything beyond what\'s here, our advisors can help — message us on WhatsApp, or book a free consultation and a counsellor will answer it for your profile.' };
  }

  function md(s) {
    return esc(s).split(/\n{2,}/).map(function (p) { return '<p>' + p.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>') + '</p>'; }).join('');
  }
  function initChat() {
    var panel = $('[data-chat]'), launcher = $('[data-chat-open]');
    if (!panel || !launcher) return;
    var list = $('[data-chat-list]', panel), chips = $('[data-chat-chips]', panel), typing = $('[data-chat-typing]', panel);
    var form = $('[data-chat-form]', panel), input = $('[data-chat-input]', panel), send = $('[data-chat-send]', panel);
    var seeded = false, small = window.matchMedia('(max-width: 640px)');
    kbIndex();
    function clock() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    function push(who, content, actions) {
      var m = document.createElement('div');
      m.className = 'msg ' + who;
      m.innerHTML = md(content) + '<time>' + clock() + '</time>';
      if (actions && actions.length) {
        var row = document.createElement('div');
        row.className = 'msg-actions';
        actions.forEach(function (a) {
          var b = document.createElement(a.href ? 'a' : 'button');
          if (a.href) { b.href = a.href; if (/^https?:/.test(a.href)) { b.target = '_blank'; b.rel = 'noopener'; } } else b.type = 'button';
          b.className = 'msg-act' + (a.hot ? ' hot' : '');
          b.textContent = a.label;
          if (a.fn) b.addEventListener('click', a.fn);
          row.appendChild(b);
        });
        m.insertBefore(row, $('time', m));
      }
      list.insertBefore(m, who === 'ai' && !seeded ? chips : typing);
      if (hasGsap && !reduce) G.from(m, { y: 14, opacity: 0, duration: 0.4, ease: 'expo.out' });
      list.scrollTop = list.scrollHeight;
    }
    function typingOn(on) { typing.classList.toggle('is-on', on); list.scrollTop = list.scrollHeight; }
    function seed() { if (!seeded) { push('ai', WELCOME); seeded = true; } }
    function open() { seed(); panel.classList.add('is-open'); panel.setAttribute('aria-hidden', 'false'); launcher.setAttribute('aria-expanded', 'true'); launcher.classList.add('is-hidden'); setTimeout(function () { input.focus(); }, 250); }
    function close() { panel.classList.remove('is-open'); panel.setAttribute('aria-hidden', 'true'); launcher.setAttribute('aria-expanded', 'false'); launcher.classList.remove('is-hidden'); }
    function reset() { $$('.msg', list).forEach(function (n) { n.remove(); }); seeded = false; chips.hidden = false; input.value = ''; sync(); typingOn(false); seed(); }
    function sync() { send.disabled = !input.value.trim(); }
    function showMe(target) {
      return function () {
        var el = typeof target === 'string' ? $(target) : target;
        if (!el) { location.href = './index.html' + (typeof target === 'string' && target.charAt(0) === '#' ? target : ''); return; }
        if (small.matches) close();
        scrollToEl(el, -90);
        if (el.classList && el.classList.contains('faq-item') && !el.classList.contains('is-open')) { var b = $('.faq-q', el); if (b) setTimeout(function () { b.click(); }, 900); }
      };
    }
    function actionsFor(r) {
      var a = [];
      if (r.unknown) {
        a.push({ label: 'Message an advisor', href: WA_URL, hot: true });
        a.push({ label: 'Book a free consultation', fn: function () { close(); goToForm(); } });
        return a;
      }
      if (r.uni) {
        a.push({ label: 'Open details', fn: function () { openUni(r.uni, launcher); } });
        a.push({ label: isShort(r.uni.name) ? 'Shortlisted ♥' : 'Shortlist ♥', fn: function (e) { setShort(r.uni.name, true); e.currentTarget.textContent = 'Shortlisted ♥'; } });
        a.push({ label: 'Ask an advisor', fn: function () { setShort(r.uni.name, true); close(); goToForm('University Selection'); } });
        return a;
      }
      if (r.more) a.push({ label: 'See them all', href: './universities.html?q=' + encodeURIComponent(r.more) });
      if (r.sec && r.sec !== '#contact') a.push({ label: 'Show me', fn: showMe(r.sec) });
      if (r.el) a.push({ label: 'Show me', fn: showMe(r.el) });
      if (r.form) a.push({ label: 'Book a free consultation', hot: true, fn: function () { close(); goToForm(); } });
      if (/advisor can confirm/.test(r.text)) a.push({ label: 'Ask an advisor', href: WA_URL });
      return a;
    }
    function say(text) {
      text = (text || '').trim();
      if (!text) return;
      push('me', text); input.value = ''; sync(); chips.hidden = true;
      typingOn(true);
      setTimeout(function () {
        typingOn(false);
        var r = answer(text);
        push('ai', r.text, actionsFor(r));
      }, reduce ? 0 : 450 + Math.min(500, text.length * 6));
    }
    launcher.addEventListener('click', open);
    $$('[data-chat-open-inline]').forEach(function (b) { b.addEventListener('click', open); });
    $('[data-chat-close]', panel).addEventListener('click', close);
    $('[data-chat-reset]', panel).addEventListener('click', reset);
    $('[data-chat-contact]', panel).addEventListener('click', function () { close(); goToForm(); });
    $$('button', chips).forEach(function (c) {
      c.addEventListener('click', function () {
        if (c.hasAttribute('data-chat-book')) { close(); goToForm(); return; }
        say(c.textContent);
      });
    });
    input.addEventListener('input', function () { sync(); input.style.height = 'auto'; input.style.height = Math.min(110, input.scrollHeight) + 'px'; });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); say(input.value); } });
    form.addEventListener('submit', function (e) { e.preventDefault(); say(input.value); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('is-open')) close(); });
    window.TC_ask = answer; // handy for testing in the console
  }

  /* Sections that are off screen pause their infinite CSS animations. */
  function initSections() {
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target.classList.toggle('is-off', !e.isIntersecting); });
    }, { rootMargin: '120px 0px' });
    $$('[data-section], .velocity, .site-footer').forEach(function (el) { io.observe(el); });
  }
  /* small jobs run between frames, ~8 ms at a time */
  var idleQ = [];
  function idle(fn) { idleQ.push(fn); if (idleQ.length === 1) yieldThen(runIdle); }
  function runIdle() {
    var t = performance.now();
    while (idleQ.length && performance.now() - t < 8) idleQ.shift()();
    if (idleQ.length) yieldThen(runIdle);
  }
  function yieldThen(fn) {
    if (window.scheduler && typeof window.scheduler.yield === 'function') window.scheduler.yield().then(fn);
    else setTimeout(fn, 0);
  }

  /* ================================================================ boot */
  function boot() {
    // phase 1 — what the first screen needs, before the first paint
    initLenis();
    initDropdowns();
    initWizard();
    initBoardingPass();
    initHeroPass();
    initAnchors();
    initChrome();
    initMenu();
    initGoto();
    initForm();
    initRotator();
    initTour();
    initSections();
    heroEntrance();
    // phase 2 — below-the-fold features, after the first frame, one per task
    // (anything that builds DOM a scroll effect animates must run before initScrollFx)
    var later = [initPointer, initVelocity, initMap, initStories, initFaq, initGrants, initServicePanel, initScrollFx, initChat, initSparks];
    function next() {
      var fn = later.shift();
      if (fn) { fn(); yieldThen(next); return; }
      if (hasGsap) ScrollTrigger.refresh();
      if (location.hash === '#contact') arriveAtForm();
    }
    requestAnimationFrame(function () { setTimeout(next, 0); });
    // shared hooks for universities.html (directory shortlist feeds the same form)
    window.TC = { ctx: ctx, renderCarry: renderCarry, goToForm: goToForm, setInterest: setInterest, reduce: reduce, hasGsap: hasGsap, lenis: lenis, openUni: openUni, setShort: setShort, isShort: isShort, onShortlist: onShortlist };
    window.addEventListener('load', function () { if (hasGsap) ScrollTrigger.refresh(); });
    if (document.fonts && document.fonts.ready && hasGsap) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
