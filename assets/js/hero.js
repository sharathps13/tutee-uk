/* Tutee Connect UK — hero photo depth.
 *   - scroll: the Westminster photograph moves at a third of the page's
 *     speed, so the hero scrolls away like a window onto the city
 *   - pointer (fine pointers only): the photo drifts a few pixels against
 *     the pointer
 * Off with reduced motion. The drifting clouds, Thames glints, glow and
 * light sweep are CSS (uk.css). */
(function () {
  'use strict';
  var hero = document.querySelector('.uk-hero');
  var photo = document.querySelector('[data-hero-photo]');
  if (!hero || !photo) return;
  // the light effects wait until the photograph has loaded
  var frame = photo.querySelector('.uk-hero-frame'), img = photo.querySelector('img');
  function loaded() { if (frame) frame.classList.add('is-loaded'); }
  function ready() { if (img && img.decode) img.decode().then(loaded, loaded); else loaded(); }
  if (!img || img.complete) ready(); else { img.addEventListener('load', ready, { once: true }); img.addEventListener('error', loaded, { once: true }); }
  setTimeout(loaded, 6000); // never hold the effects back for long
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* ------------------------------------------------------------ scroll */
  var sraf = 0, idle = 0;
  function onScroll() {
    if (sraf) return;
    sraf = requestAnimationFrame(function () {
      sraf = 0;
      var y = window.pageYOffset, h = hero.offsetHeight;
      if (y > h) return;
      photo.classList.add('is-scrolling');
      photo.style.setProperty('--sy', (y * 0.33).toFixed(1) + 'px');
      clearTimeout(idle);
      idle = setTimeout(function () { photo.classList.remove('is-scrolling'); }, 160);
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ----------------------------------------------------------- pointer */
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  var raf = 0, x = 0, yy = 0;
  hero.addEventListener('pointermove', function (e) {
    x = e.clientX / window.innerWidth - 0.5;
    yy = e.clientY / window.innerHeight - 0.5;
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      photo.style.setProperty('--px', (x * -18).toFixed(1) + 'px');
      photo.style.setProperty('--py', (yy * -12).toFixed(1) + 'px');
    });
  });
  hero.addEventListener('pointerleave', function () {
    photo.style.removeProperty('--px');
    photo.style.removeProperty('--py');
  });
})();
