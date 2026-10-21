/* Runs in <head> before the first paint (tiny and synchronous on purpose).
   - Swaps no-js → js straight away, so JS-only styles apply from the first
     frame instead of flashing in when landing.js arrives.
   - Holds the hero copy (.hero-wait) until its entrance animation starts, so
     on slow connections the text doesn't appear, vanish and animate back in.
     If landing.js takes longer than 0.6 s the copy simply shows, unanimated. */
(function (root) {
  root.className = root.className.replace(/\bno-js\b/, '') + ' js';
  // A refresh always starts at the top: no restored scroll position, and a
  // #section left in the address (the form buttons add #contact) is dropped
  // on reload. Links that point at a section still work on a fresh visit.
  try {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    var nav = window.performance && performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    var reload = nav ? nav.type === 'reload' : (performance.navigation && performance.navigation.type === 1);
    if (reload && location.hash) history.replaceState(null, '', location.pathname + location.search);
    if (reload) window.addEventListener('load', function () { window.scrollTo(0, 0); });
    // Arriving with a #section (e.g. "Apply" on the universities page → the
    // home page's form): stay invisible until the page has positioned itself
    // on that section, then fade in (landing.js removes .arriving). Never
    // longer than 1.5s, whatever happens.
    if (!reload && location.hash.length > 1) {
      root.className += ' arriving';
      setTimeout(function () { root.className = root.className.replace(/\s*\barriving\b/, ''); }, 1500);
    }
  } catch (e) { /* very old browser: default behaviour */ }
  // The floating dock (Tutee AI, WhatsApp) stays out of the hero: hidden from
  // the first paint, shown once the visitor reaches the next section
  // (atlas.js keeps this in step with the scroll position).
  root.className += ' in-hero';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  // Motion styles (the hero's start-of-entrance state) must be on before the
  // first paint. motion.js is deferred, so if it set this class itself the
  // hero would paint finished, blink out and then animate back in on every
  // load. Same condition as motion.js; if the hero entrance hasn't started
  // within 2.5s (script failed), motion is dropped so nothing stays hidden.
  if ('IntersectionObserver' in window) {
    root.className += ' motion';
    setTimeout(function () {
      var hero = document.querySelector('.uk-hero');
      if (hero && !/\bis-in\b/.test(hero.className)) root.className = root.className.replace(/\s*\bmotion\b/, '');
    }, 2500);
  }
  root.className += ' hero-wait';
  setTimeout(function () { root.className = root.className.replace(/\s*\bhero-wait\b/, ''); }, 600);
})(document.documentElement);
