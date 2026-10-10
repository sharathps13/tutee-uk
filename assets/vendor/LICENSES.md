# Vendored libraries

Served from this folder (not a CDN) because the site's Content-Security-Policy is
`script-src 'self'`. Files are the unmodified minified builds from npm.

| Library | Version | Files | Licence |
|---|---|---|---|
| GSAP (core, ScrollTrigger, SplitText, DrawSVGPlugin, MotionPathPlugin, Flip) | 3.15.0 | `gsap/*.min.js` | GreenSock standard "no charge" licence — free incl. commercial use, all plugins included: https://gsap.com/standard-license |
| Lenis | 1.3.26 | `lenis/lenis.min.js`, `lenis/lenis.css` | MIT — https://github.com/darkroomengineering/lenis |

To update: `npm pack gsap@<v> lenis@<v>`, extract, and copy the same files from each
package's `dist/` folder. Bump the versions in this table.

The interactive effects in `assets/js/landing.js` marked "after React Bits <Name>" are
original vanilla-JS re-implementations of the *ideas* behind those React Bits components
(https://reactbits.dev); no React Bits source code is included.
