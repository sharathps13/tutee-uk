/* Runs in <head> before the first paint (tiny and synchronous on purpose).
   - Swaps no-js → js straight away, so JS-only styles apply from the first
     frame instead of flashing in when landing.js arrives.
   - Holds the hero copy (.hero-wait) until its entrance animation starts, so
     on slow connections the text doesn't appear, vanish and animate back in.
     If landing.js takes longer than 0.6 s the copy simply shows, unanimated. */
(function (root) {
  root.className = root.className.replace(/\bno-js\b/, '') + ' js';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  root.className += ' hero-wait';
  setTimeout(function () { root.className = root.className.replace(/\s*\bhero-wait\b/, ''); }, 600);
})(document.documentElement);
