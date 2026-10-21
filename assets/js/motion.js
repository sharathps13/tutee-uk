/* =====================================================================
 * Tutee Connect UK — landing page motion.
 *
 * Everything here is enhancement: the page is complete and readable with
 * no JavaScript and with reduced motion. Reveals are CSS transitions
 * (compositor-friendly, so they run smoothly on slow phones), triggered by
 * an IntersectionObserver, and anything not revealed within 2.5 s of
 * entering the viewport is shown anyway.
 *
 *   - hero: the Westminster photo settles from a slow zoom, then the words
 *     arrive in order (pointer depth is in hero.js)
 *   - university strip: a seamless marquee (pauses on hover/focus)
 *   - scroll reveals with per-item stagger for every section
 *   - "how it works": the journey wheel (atlas.js)
 *   - settlement ladder: rungs rise one after another
 *   - cards: pointer tilt + light sheen on fine pointers
 *   - header: hides while scrolling down, returns when scrolling up
 *   - section headings: underline draws in
 * ===================================================================== */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  if (reduce || !('IntersectionObserver' in window)) return;
  root.classList.add('motion');

  /* ---------------------------------------------------------- reveals */
  // [selector, effect, stagger group]
  var GROUPS = [
    ['.uk-head', 'up'],
    ['.wf-intro', 'left'], ['.wf-grid .worry', 'up', true],
    ['.wh-intro', 'left'], ['.wh-dial', 'zoom'],
    ['.cg', 'up'],
    ['.ug-head', 'up'], ['.ug-bar', 'up'], ['.ug-lead', 'left'],
    ['.wy-head', 'up'], ['.wy-explore', 'zoom'], ['.wy-card', 'up', true],
    ['.fd-explore', 'up'], ['.fd-finder', 'right'], ['.fd-lenders', 'up'],
    ['.family', 'right'],
    ['.uk-quote-grid > li', 'up', true], ['.rl', 'up'],
    ['.uk-contact .ct', 'up'],   // one panel: the halves must never drift apart
    ['.news-head', 'up'], ['.faq-head', 'left'], ['.ft-grid > .ft', 'up', true],
    ['.foot-cta', 'up']
  ];
  var items = [];
  GROUPS.forEach(function (g) {
    var els = $$(g[0]);
    els.forEach(function (el, i) {
      el.classList.add('rv', 'rv-' + g[1]);
      if (g[2]) el.style.setProperty('--i', Math.min(i, 8));
      items.push(el);
    });
  });
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  items.forEach(function (el) { io.observe(el); });
  // safety net: anything already scrolled past, or on a stalled device, shows anyway
  function sweep() {
    var vh = window.innerHeight;
    items.forEach(function (el) { if (!el.classList.contains('in') && el.getBoundingClientRect().top < vh * 0.95) el.classList.add('in'); });
  }
  // Observers and scroll events only fire with rendered frames, which a
  // throttled tab or a busy phone can starve; a plain timer still runs, so
  // it checks once a second and stops when everything is shown.
  var sweeper = setInterval(function () {
    sweep();
    if (items.every(function (el) { return el.classList.contains('in'); })) clearInterval(sweeper);
  }, 1000);

  /* --------------------------------------------------- headline lines */
  $$('.uk-h2').forEach(function (h) { h.classList.add('uk-h2-line'); });
  var hio = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('drawn'); hio.unobserve(e.target); } });
  }, { threshold: 0.6 });
  $$('.uk-h2-line').forEach(function (h) { hio.observe(h); });

  /* ------------------------------------------------------------- hero */
  // Entrance on a timer (frames can be throttled; the headline must never wait).
  var hero = $('.uk-hero');
  if (hero) {
    setTimeout(function () { hero.classList.add('is-in'); }, 30);
    setTimeout(function () { hero.classList.add('is-settled'); }, 2000);
  }

  /* ---------------------------------------------------------- marquee */
  var list = $('.uk-strip-list');
  if (list) {
    $$('li', list).forEach(function (li) { var c = li.cloneNode(true); c.setAttribute('aria-hidden', 'true'); list.appendChild(c); });
    list.classList.add('is-marquee');
  }

  /* ------------------------------------------------- tilt + sheen */
  if (fine) {
    $$('.wf-grid .worry, .uk-quote-grid .quote').forEach(function (el) {
      el.classList.add('tilt');
      var raf = 0, ev = null;
      el.addEventListener('pointermove', function (e) {
        ev = e;
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = 0;
          var r = el.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
          el.style.setProperty('--rx', ((0.5 - y) * 5).toFixed(2) + 'deg');
          el.style.setProperty('--ry', ((x - 0.5) * 7).toFixed(2) + 'deg');
          el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
          el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
        });
      });
      el.addEventListener('pointerleave', function () { el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); });
    });
  }

  /* --------------------------------------------- header: hide / show */
  var header = $('[data-header]'), anchorY = window.pageYOffset;
  window.addEventListener('scroll', function () {
    if (!header) return;
    var y = window.pageYOffset;
    if (y < 400) { header.classList.remove('is-tucked'); anchorY = y; return; }
    // direction changes count once the visitor has moved 24px the other way
    if (y > anchorY + 24) { if (!$('.menu.is-open')) header.classList.add('is-tucked'); anchorY = y; }
    else if (y < anchorY - 24) { header.classList.remove('is-tucked'); anchorY = y; }
    else if (header.classList.contains('is-tucked') ? y > anchorY : y < anchorY) anchorY = y;
  }, { passive: true });
  // keyboard users always see the header when focus is in it
  if (header) header.addEventListener('focusin', function () { header.classList.remove('is-tucked'); });
})();
