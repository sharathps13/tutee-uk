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
  // Home page 3D world (assets/js/atlas.js loads it): decided here, before the
  // first paint, so its two-column layout never shifts in afterwards. Skipped
  // for Save-Data, low-memory / few-core devices (stricter on phones) and
  // ?noworld (testing). If WebGL then fails, atlas.js falls back to 2D.
  try {
    var n = navigator, small = window.innerWidth < 760, conn = n.connection || {};
    var weak = (n.deviceMemory && n.deviceMemory < (small ? 4 : 2)) || (n.hardwareConcurrency && n.hardwareConcurrency < (small ? 4 : 2));
    if (window.WebGLRenderingContext && !conn.saveData && !weak && !/[?&]noworld\b/.test(location.search)) root.className += ' world-on';
  } catch (e) { /* no world */ }
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  root.className += ' hero-wait';
  setTimeout(function () { root.className = root.className.replace(/\s*\bhero-wait\b/, ''); }, 600);
})(document.documentElement);
