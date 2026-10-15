/* =====================================================================
 * Tutee Connect UK — the departure globe (Canvas 2D, no WebGL needed).
 *
 * A dotted globe at night with a flight arc from India to the UK city
 * chosen on the departures board. It is decoration for a story the page
 * also tells in words (headline, board, journey), so it carries no
 * information of its own and is aria-hidden.
 *
 *   TCGlobe.mount(canvas, { dest: 0..3 }) → { setDest(i), setScroll(p), setPaused(b), redraw() }
 *
 * Land is a stylised outline (coarse polygons, not survey data), sampled
 * once into ~2,500 dots. Each frame is an orthographic projection of
 * those dots plus the arc. It pauses off screen / in background tabs;
 * with reduced motion it draws single still frames.
 * ===================================================================== */
(function () {
  'use strict';

  /* ---- stylised land outlines [lon, lat] ---------------------------- */
  var LAND = [
    // Eurasia (Iberia → Arctic → Pacific → South-East Asia → India → Arabia → Mediterranean)
    [[-9.5,37],[-9.3,43.2],[-1.8,43.4],[-1.2,46],[-4.6,48.4],[-1.6,49.6],[1.6,50.9],[4.2,51.9],[4.8,53],[8.6,53.9],[8.1,56.8],[10.5,57.7],[12.6,56],[10.6,59.3],[5.6,58.9],[5,62],[10,64],[13.5,67.8],[18,69.5],[23,70.6],[28.5,71],[33,69.3],[40,67.8],[41,66.5],[34,65.5],[37,64],[44,66.4],[44,68.5],[53.5,68.5],[60,69.5],[68.5,72.5],[72.6,72.8],[80.5,73.6],[87,75.2],[96,76.2],[105,77.6],[112.5,76.2],[113,73.5],[127,73],[131,71.5],[140,72.7],[149,72.2],[159,70.9],[170,70],[180,69],[180,65],[178,62.5],[173,61],[167,60],[163.5,59.8],[163,57],[160.5,54.5],[156.7,51],[155.5,55.6],[156,57.8],[152,59.2],[142.2,59.3],[136.8,54.6],[140.5,52.5],[141.3,48.5],[138.3,44.7],[132.5,42.9],[129.6,41.2],[128.4,38.4],[129.4,35.8],[126.4,34.7],[126.2,37.5],[124.8,39.6],[121.5,40.9],[118,39.2],[119,37.2],[122.6,37.2],[120.3,36],[119.2,34.5],[120.9,32.3],[121.9,30.4],[121.4,28.3],[119.6,25.5],[117,23.6],[113.5,22.4],[110.5,21.2],[108.2,21.6],[106.6,20.2],[105.7,18.6],[108.9,15.5],[109.3,11.8],[106.8,10.3],[104.9,8.7],[104.6,10.6],[102.6,12.2],[100.4,13.5],[99.2,10.4],[100.3,7.2],[102,6.2],[103.4,4.4],[104.2,1.5],[103.5,1.3],[101.3,2.7],[100.4,5.3],[98.3,8.3],[98.5,12],[97.6,16.6],[94.3,16.2],[94.6,19.3],[92.4,20.7],[91.9,22.6],[90.4,22],[89,21.7],[86.9,21.3],[86.3,19.9],[84.9,19.3],[82.3,16.6],[80.3,15.6],[80.3,13.1],[79.9,10.3],[78.2,8.9],[77.5,8.1],[76.6,8.9],[75.4,11.8],[74.7,14],[73.4,16.9],[72.8,19.3],[72.6,21.4],[70.4,20.8],[69,22.2],[70.3,22.9],[68.8,23.6],[67.4,24.2],[66.6,25.4],[64.6,25.2],[61.6,25.2],[59.4,25.5],[57.3,25.8],[56.4,27.1],[54.7,26.5],[52.6,27.4],[51.3,28.2],[50.1,30.1],[48.6,29.9],[48,29.4],[48.7,28],[49.6,27],[50.2,26.3],[50.9,24.8],[51.6,24.2],[52.5,24.2],[54.3,24.3],[55.8,25.5],[56.3,26.2],[56.4,24.9],[57.4,23.9],[58.7,23.6],[59.8,22.4],[58.6,20.6],[57.8,19.1],[56.7,18],[55.3,17.4],[52.2,15.6],[49.6,14.6],[48.6,14],[46.7,13.4],[45,12.8],[43.5,12.7],[42.7,15.5],[41.2,18.6],[40,20.3],[39.1,21.8],[38.4,23.9],[37.4,25.2],[36.6,26.2],[35.2,28.1],[34.9,29.5],[34.2,31.3],[35,33.1],[35.6,34.6],[35.9,35.6],[36.1,36.7],[34.6,36.8],[32.5,36.1],[30.6,36.7],[29.3,36.3],[27.4,37],[26.4,38.6],[26.2,39.6],[26.6,40.4],[24.9,40.9],[23.7,40.4],[22.6,40.4],[23,39.3],[24,38.2],[22.9,36.4],[21.7,36.8],[21.1,38.3],[20.2,39.6],[19.4,41.9],[18.5,42.4],[16,43.5],[13.6,45.1],[12.3,45.4],[12.5,44.2],[13.6,43.5],[14.9,42],[16.2,41.4],[18.5,40.1],[17,39.4],[16.6,38.4],[15.7,37.9],[15.8,39.6],[14.2,40.6],[12.3,41.7],[10.5,42.9],[10.2,43.9],[8.8,44.4],[7,43.6],[4.6,43.4],[3.1,43.1],[3.2,41.9],[0.8,41.1],[-0.3,39.5],[0.2,38.7],[-0.7,37.6],[-2.1,36.7],[-4.4,36.7],[-5.6,36],[-6.4,36.8],[-7.4,37.2],[-8.9,37]],
    // Africa
    [[-17,21],[-16,24],[-13,27.7],[-9.8,30],[-6,35.8],[-2,35.1],[3,36.8],[10,37.3],[11,33],[15.5,32],[20,31],[25,31.7],[32,31.2],[34.2,29.5],[35,24],[37,21],[38.5,18],[43,12.6],[51.3,11.8],[49,6],[42,-1],[40,-5],[39.5,-10],[40.6,-15],[35.5,-24],[32.9,-26],[30,-31],[25.5,-34],[20,-34.8],[18,-32],[15,-27],[11.7,-17],[13.5,-11],[12,-5],[9.6,0],[9.5,4],[6,4.4],[2,6.3],[-4,5.2],[-7.5,4.4],[-11.5,6.9],[-13.3,9.5],[-15,11],[-16.8,12.5],[-17.5,14.7]],
    [[43.3,-12],[49.5,-12],[50.5,-15.5],[47,-25],[44,-25],[43.3,-22],[44.4,-16.5]],                       // Madagascar
    // Great Britain, Ireland, Iceland
    [[-5,58.6],[-3,58.6],[-3.6,58.1],[-4.2,57.5],[-2,57.7],[-2.1,57.1],[-2.9,56.5],[-2.1,55.9],[-1.6,55.6],[-1.2,54.7],[-0.1,54.1],[0.3,53.1],[1.7,52.6],[1.3,51.9],[1.4,51.2],[0.3,50.7],[-1.5,50.7],[-3.4,50.6],[-5.7,50.1],[-4.5,51],[-3,51.4],[-4.3,51.6],[-5.3,51.9],[-4.1,52.4],[-4.3,53.1],[-3,53.6],[-3.3,54.1],[-3.6,54.6],[-4.9,54.6],[-4.9,55.2],[-4.9,55.8],[-5.6,55.4],[-5.5,56.4],[-6.2,56.7],[-5.7,57.3],[-5.7,57.7],[-5.2,58.2]],
    [[-10,51.6],[-6,52.1],[-6,53.9],[-5.6,54.6],[-6.2,55.3],[-7.5,55.3],[-8.5,54.5],[-10,54.2],[-9.8,53],[-10.4,52]],
    [[-24,65.5],[-22,66.4],[-16,66.5],[-13.5,65.2],[-15,64.3],[-18,63.4],[-22.5,63.8]],
    // Asia & Pacific islands
    [[130,31.3],[131.5,31.5],[132,33.8],[135,33.5],[136.8,34.3],[139,34.6],[140.8,35.7],[141,38.3],[142,39.8],[141.4,41.4],[140,40.7],[139.8,38],[138.5,37.5],[136.9,37],[135.5,35.6],[133,35.5],[131,34.4],[129.7,33.2]],
    [[140,41.5],[141.6,42.6],[143.3,42],[145.6,43.3],[144.5,44.2],[141.7,45.4],[141.4,43.3],[140,42.6]],
    [[79.8,6],[81.8,6.2],[81.9,7.5],[80.2,9.8],[79.7,8]],                                                   // Sri Lanka
    [[120.1,23],[121,22],[121.9,24.9],[121.5,25.3],[120.2,23.8]],
    [[95.2,5.6],[98,4.2],[100.5,2],[103.8,-1],[106,-3.2],[105.8,-5.8],[104.5,-5.9],[102.2,-4],[100.3,-0.5],[98.6,1.8],[96.5,3.8]],
    [[105.2,-6.8],[106.5,-6],[110,-6.9],[114.5,-7.8],[114.4,-8.7],[110,-8.2],[106.4,-7.4]],
    [[109.6,1.9],[111.5,2.6],[115.5,5.1],[117.2,6.9],[119.2,5.3],[118,1],[117.6,-1],[116.5,-3.8],[114.5,-4],[110.2,-2.9],[109,-0.5]],
    [[131,-1.4],[134,-0.8],[138,-1.6],[141,-2.6],[145.7,-4.8],[147.5,-6.2],[150.2,-10.3],[147,-10],[144,-8],[141,-9.2],[138.7,-8.2],[137.6,-5],[134.3,-4],[132,-2.9]],
    [[120.6,18.5],[122.3,18.4],[122,16],[124,13],[121.5,13.8],[120,15]],
    [[122,7],[126.5,7],[126.3,9],[123.6,8.3]],
    // Australia, New Zealand
    [[113.5,-22],[114,-26.5],[115,-30.5],[115,-34],[118,-35],[123,-33.9],[129,-31.6],[131.5,-31.5],[135,-34.5],[138,-35.5],[140,-38],[144,-38.3],[146.4,-39],[150,-37.5],[153,-31],[153.6,-28],[153,-25],[150.8,-22.5],[146,-19],[145.4,-15],[143.6,-14],[142.5,-10.7],[141.6,-13],[141.5,-15.5],[140.6,-17.5],[139,-17.2],[135.7,-15],[136.7,-12.2],[132.6,-11.6],[130,-13.3],[129,-15],[126,-14],[122.5,-16.8],[121.5,-18.5],[119,-20],[116.5,-20.6],[114.2,-21.8]],
    [[144.6,-40.7],[148.3,-40.9],[147.9,-43.2],[146,-43.5]],
    [[172.7,-34.4],[174.7,-36.9],[178.5,-37.7],[176.8,-40],[175,-41.5],[173.8,-39.2],[174.5,-37]],
    [[172.7,-40.5],[174.3,-41.7],[172.8,-43.9],[171,-44.5],[169,-46.6],[166.5,-46],[168.5,-44],[171.3,-42]],
    // The Americas, Greenland
    [[-73,78.5],[-60,82],[-30,83.5],[-20,81.5],[-18,76.5],[-22,70.5],[-31,68],[-40,65],[-43,60],[-48,61],[-52,64.5],[-54,68.5],[-56,72.5],[-66,76]],
    [[-168,65.6],[-164,68.5],[-156.5,71.3],[-148,70.3],[-141,69.6],[-133,69.5],[-125,70],[-117,68.8],[-108,68.3],[-98,68],[-95,71.5],[-88,68.7],[-82,69.5],[-81.5,66.5],[-78,63],[-70,61],[-65,60.3],[-61.5,56],[-56,52],[-60,50.2],[-66,50.2],[-64.8,47],[-61,45.6],[-65.8,44.5],[-70,43.8],[-70.6,42],[-74,40.6],[-75.5,38.9],[-76.3,37],[-75.5,35.3],[-77.9,33.9],[-81,31.8],[-80.1,26.8],[-80.4,25.2],[-81.8,26.6],[-82.8,28.5],[-84.2,30],[-88,30.4],[-89.5,29.3],[-94,29.6],[-97.2,27.8],[-97.6,24],[-97.2,21],[-96,19.2],[-94.5,18.2],[-91,18.7],[-90.5,21],[-87.3,21.5],[-88.3,18.4],[-88.6,16],[-86.4,15.9],[-83.3,15],[-83.6,11],[-81.7,9],[-79.5,9.5],[-77.4,8.6],[-78.1,7.9],[-80,7.3],[-83,8.3],[-85.7,11],[-87.5,13],[-91.4,14],[-94.6,16.2],[-96.5,15.7],[-100,16.9],[-105.5,20.5],[-105.3,22.6],[-108,25.6],[-112,29.6],[-114.7,31.7],[-112.6,29],[-109.5,23.2],[-112.2,27],[-114.4,30.5],[-117.1,32.5],[-120.6,34.5],[-122.5,37.7],[-124.2,40.4],[-124.5,43],[-124,46.2],[-124.7,48.4],[-123,49.1],[-127.9,51],[-130.4,54.5],[-134,58],[-137.5,58.6],[-142,60],[-147.5,60.5],[-152,59],[-154,57.5],[-158.5,56.5],[-163.8,55],[-157.6,58.6],[-161.8,59.2],[-165,60.5],[-164.5,63.2],[-161,64.5],[-166.5,65]],
    [[-80,73.7],[-71,70.5],[-64,66.5],[-65,63],[-71.5,63],[-78,64.5],[-73.7,68],[-80,69.7],[-88,71]],     // Baffin Island
    [[-84.9,21.9],[-81.3,23.2],[-77,21.2],[-74.2,20.2],[-77.7,19.9],[-80.5,22]],                          // Cuba
    [[-77.4,8.6],[-75.5,10.6],[-71.3,12.4],[-68,10.6],[-62,10.8],[-57.8,6],[-52,4.5],[-50,1.8],[-48.5,-1.3],[-44,-2.5],[-39,-3.7],[-35,-5.5],[-34.8,-8],[-37.2,-11.3],[-38.9,-13.5],[-39.2,-17.8],[-41,-22],[-44.6,-23.3],[-48.6,-26.5],[-48.7,-28.6],[-51,-31],[-53.4,-33.8],[-56.5,-36.4],[-57.5,-38.1],[-62.3,-38.8],[-65,-41],[-63.8,-42],[-65.3,-45],[-67.5,-46.5],[-65.7,-47.9],[-69,-50.5],[-68.4,-52.3],[-69.5,-55.5],[-73,-53],[-74.6,-50],[-75.5,-46.5],[-73.7,-40],[-73.5,-37.1],[-71.6,-33],[-71.4,-28],[-70.3,-18.4],[-75.3,-15.4],[-77.2,-12],[-79.6,-7.2],[-81.2,-5.5],[-80.3,-3.4],[-80.9,-1],[-80,1],[-78.9,1.6],[-77.5,4],[-77.4,6.7],[-78.6,8.2]],
    [[12.4,38.1],[15.6,38.3],[15.1,36.7]], [[8.4,41],[9.8,41],[9.6,39],[8.4,39]]                          // Sicily, Sardinia
  ];
  var WATER = [
    [[10.6,54],[14,54],[18.8,54.4],[21.2,55.2],[21,56.8],[23.8,57.3],[24.4,58.9],[28,59.6],[29.8,60],[28,60.6],[25,60.2],[22.6,60.5],[21.4,62],[21.4,64],[25.4,65.4],[23,65.8],[21.2,64.6],[17.8,62.6],[18.9,60.1],[17.6,59],[16.5,56.4],[14.3,55.5],[12.8,55.5],[11,56]],   // Baltic
    [[27.6,42.2],[28.8,44.5],[29.7,45.5],[30.8,46.5],[33.5,46],[33,45],[35.5,45.3],[36.6,45.4],[38.2,47.1],[39.3,47],[37.5,44.7],[39.8,43.4],[41.6,41.6],[40,41],[37,41.1],[35,42],[33.3,42],[31.2,41.1],[29,41.2]], // Black Sea
    [[46.8,44.8],[47.5,45.6],[49.2,46.5],[51.2,47],[53,46.8],[53,45.2],[51.3,44.6],[51.5,43],[52.7,42],[53,40],[53.9,38],[53.9,37.3],[51.5,36.8],[49.6,37.6],[48.9,38.4],[49.4,40.2],[50.3,40.4],[48.6,41.8],[47.4,43],[47.5,44.5]], // Caspian
    [[-95,59],[-94,61.5],[-90.5,63.8],[-86,64.5],[-82,63],[-78.5,62.4],[-77.5,58.6],[-76.7,56],[-79,51.5],[-82.3,52.9],[-87,55.6],[-92.5,57]]  // Hudson Bay
  ];
  var UK_POLYS = [LAND[3]];   // Great Britain is drawn in amber

  // origin: India (a point in central India, not a specific office); destinations follow the board
  var ORIGIN = { lon: 78.5, lat: 21.5, label: 'India' };
  var DESTS = [
    { lon: -1.26, lat: 51.75, label: 'Oxford' },
    { lon: -3.19, lat: 55.95, label: 'Edinburgh' },
    { lon: -3.18, lat: 51.48, label: 'Cardiff' },
    { lon: -5.93, lat: 54.6, label: 'Belfast' }
  ];

  function bbox(p) { var b = [1e9, 1e9, -1e9, -1e9]; p.forEach(function (q) { b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], q[0]); b[3] = Math.max(b[3], q[1]); }); return b; }
  function inPoly(x, y, p) {
    var c = false;
    for (var i = 0, j = p.length - 1; i < p.length; j = i++) {
      var xi = p[i][0], yi = p[i][1], xj = p[j][0], yj = p[j][1];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) c = !c;
    }
    return c;
  }
  var LB = LAND.map(bbox), WB = WATER.map(bbox);
  function hit(x, y, polys, boxes) {
    for (var i = 0; i < polys.length; i++) { var b = boxes[i]; if (x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3] && inPoly(x, y, polys[i])) return i; }
    return -1;
  }
  // sample the land once into dots (unit-sphere lon/lat with cached trig)
  function sample(step) {
    var lon = [], cosLat = [], sinLat = [], uk = [], D = Math.PI / 180;
    for (var lat = -84; lat <= 84; lat += step) {
      var dl = step / Math.max(0.2, Math.cos(lat * D));
      for (var lo = -180; lo < 180; lo += dl) {
        var land = lat < -70 || hit(lo, lat, LAND, LB) !== -1;
        if (!land || hit(lo, lat, WATER, WB) !== -1) continue;
        lon.push(lo * D); cosLat.push(Math.cos(lat * D)); sinLat.push(Math.sin(lat * D));
        uk.push(hit(lo, lat, UK_POLYS, [bbox(UK_POLYS[0])]) !== -1 ? 1 : 0);
      }
    }
    return { n: lon.length, sinLon: lon.map(Math.sin), cosLon: lon.map(Math.cos), cosLat: cosLat, sinLat: sinLat, uk: uk };
  }

  function vec(lon, lat) { var D = Math.PI / 180, cl = Math.cos(lat * D); return [cl * Math.sin(lon * D), Math.sin(lat * D), cl * Math.cos(lon * D)]; }
  function slerp(a, b, t) {
    var d = Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))), s = Math.sin(d);
    if (s < 1e-6) return a.slice();
    var k1 = Math.sin((1 - t) * d) / s, k2 = Math.sin(t * d) / s;
    return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2];
  }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function mount(canvas, opts) {
    var ctx = canvas.getContext && canvas.getContext('2d');
    if (!ctx) return null;
    opts = opts || {};
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var small = window.matchMedia('(max-width: 760px)').matches;
    var pts = sample(small ? 2.9 : 2.2);
    var dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
    var W = 0, H = 0, R = 0;
    var dest = opts.dest || 0, arcFrom = dest, arcT = reduce ? 1 : 0, arcStart = 0;
    var scrollP = 0, paused = false, visible = true, raf = 0, t0 = performance.now();
    var px = 0, py = 0, tx = 0, ty = 0;            // pointer tilt (smoothed)
    var stars = [];
    for (var s = 0; s < 140; s++) stars.push([Math.random(), Math.random(), Math.random() * 0.6 + 0.2, Math.random() * 6.28]);

    function size() {
      var r = canvas.getBoundingClientRect();
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R = Math.min(W, H) * 0.44;
    }

    // view centre: midway along the route, drifting gently; scrolling away
    // turns the globe to the destination and zooms in ("descending")
    function view(now) {
      var d = DESTS[dest], drift = reduce ? 0 : Math.sin(now / 9000) * 6;
      var midLon = (ORIGIN.lon + d.lon) / 2 + 4, midLat = 34;
      var e = ease(Math.min(1, scrollP * 1.15));
      return {
        lon: lerp(midLon + drift + px * 12, d.lon, e),
        lat: lerp(midLat + py * 8, d.lat - 4, e),
        zoom: lerp(1, 3.1, e),
        fade: 1 - Math.max(0, (scrollP - 0.75) / 0.25)
      };
    }

    function frame(now) {
      raf = 0;
      // ease the pointer
      px += (tx - px) * 0.06; py += (ty - py) * 0.06;
      var v = view(now), D = Math.PI / 180;
      var cl0 = Math.cos(v.lon * D), sl0 = Math.sin(v.lon * D), cp = Math.cos(v.lat * D), sp = Math.sin(v.lat * D);
      var cx = W * 0.5, cy = H * 0.5, r = R * v.zoom;
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = Math.max(0, v.fade);

      // stars (very faint, twinkle slowly)
      ctx.fillStyle = '#cfe6e1';
      for (var s = 0; s < stars.length; s++) {
        var st = stars[s], a = st[2] * (reduce ? 0.6 : 0.45 + 0.35 * Math.sin(now / 1400 + st[3]));
        ctx.globalAlpha = Math.max(0, v.fade) * a * 0.5;
        ctx.fillRect(st[0] * W, st[1] * H, 1.2, 1.2);
      }

      // the planet's rim light
      ctx.globalAlpha = Math.max(0, v.fade);
      var g = ctx.createRadialGradient(cx, cy, r * 0.82, cx, cy, r * 1.12);
      g.addColorStop(0, 'rgba(20,112,106,0)'); g.addColorStop(0.75, 'rgba(20,112,106,.18)'); g.addColorStop(1, 'rgba(20,112,106,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r * 1.12, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'rgba(6,18,16,.65)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832); ctx.fill();

      // land dots, front hemisphere only, dimmer towards the edge
      var dot = Math.max(1.3, Math.min(2.8, r / 130)), half = dot / 2;
      var buckets = [[], [], [], []], ukB = [];
      for (var i = 0; i < pts.n; i++) {
        var sl = pts.sinLon[i] * cl0 - pts.cosLon[i] * sl0, cL = pts.cosLon[i] * cl0 + pts.sinLon[i] * sl0;
        var x = pts.cosLat[i] * sl, y = pts.sinLat[i], z = pts.cosLat[i] * cL;
        var y2 = y * cp - z * sp, z2 = y * sp + z * cp;
        if (z2 <= 0.02) continue;
        var X = cx + x * r, Y = cy - y2 * r;
        if (X < -4 || Y < -4 || X > W + 4 || Y > H + 4) continue;
        if (pts.uk[i]) ukB.push(X, Y); else buckets[Math.min(3, (z2 * 4) | 0)].push(X, Y);
      }
      var alphas = [0.22, 0.4, 0.6, 0.82];
      for (var b = 0; b < 4; b++) {
        ctx.fillStyle = 'rgba(178,222,214,' + alphas[b] * Math.max(0, v.fade) + ')';
        var arr = buckets[b];
        for (var k = 0; k < arr.length; k += 2) ctx.fillRect(arr[k] - half, arr[k + 1] - half, dot, dot);
      }
      ctx.fillStyle = 'rgba(255,200,97,' + Math.max(0, v.fade) + ')';
      for (var u = 0; u < ukB.length; u += 2) ctx.fillRect(ukB[u] - half, ukB[u + 1] - half, dot + .4, dot + .4);

      // project a point above the surface (h = 1 on the ground)
      function proj(p, h) {
        var x = p[0], y = p[1], z = p[2];
        var xr = x * cl0 - z * sl0, zr = x * sl0 + z * cl0;
        var y2 = y * cp - zr * sp, z2 = y * sp + zr * cp;
        var on = z2 > 0 || (xr * xr + y2 * y2) * h * h > 1.0;
        return [cx + xr * r * h, cy - y2 * r * h, on];
      }
      // the flight arc
      var A = vec(ORIGIN.lon, ORIGIN.lat), B = vec(DESTS[dest].lon, DESTS[dest].lat);
      if (!reduce && arcT < 1) arcT = Math.min(1, (now - arcStart) / 1800);
      var draw = ease(arcT), N = 64, prev = null;
      ctx.lineWidth = Math.max(1.6, r / 160); ctx.lineCap = 'round';
      for (var n = 0; n <= N * draw; n++) {
        var t = n / N, p = proj(slerp(A, B, t), 1 + 0.2 * Math.sin(Math.PI * t));
        if (prev && p[2] && prev[2]) {
          ctx.strokeStyle = 'rgba(245,165,36,' + (0.35 + 0.65 * t) * Math.max(0, v.fade) + ')';
          ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(p[0], p[1]); ctx.stroke();
        }
        prev = p;
      }
      // a plane of light travelling the arc once it is drawn
      if (arcT >= 1) {
        var lt = reduce ? 0.62 : ((now - t0) / 5200) % 1;
        for (var tr = 0; tr < 10; tr++) {
          var tt = lt - tr * 0.012; if (tt < 0) continue;
          var q = proj(slerp(A, B, tt), 1 + 0.2 * Math.sin(Math.PI * tt));
          if (!q[2]) continue;
          ctx.fillStyle = 'rgba(255,233,180,' + (1 - tr / 10) * Math.max(0, v.fade) + ')';
          ctx.beginPath(); ctx.arc(q[0], q[1], (tr ? 2.2 : 3.6) * (1 - tr / 14), 0, 6.2832); ctx.fill();
        }
      }
      // end points + labels
      function pin(ll, label, hot) {
        var p = proj(vec(ll.lon, ll.lat), 1);
        if (!p[2]) return;
        ctx.fillStyle = hot ? '#f5a524' : '#cfe6e1';
        ctx.beginPath(); ctx.arc(p[0], p[1], hot ? 4.5 : 3.5, 0, 6.2832); ctx.fill();
        ctx.strokeStyle = hot ? 'rgba(245,165,36,.5)' : 'rgba(207,230,225,.4)'; ctx.lineWidth = 1.5;
        var pulse = reduce ? 9 : 8 + 6 * ((now / 1600) % 1);
        ctx.beginPath(); ctx.arc(p[0], p[1], pulse, 0, 6.2832); ctx.stroke();
        ctx.font = '700 ' + (small ? 12 : 13) + 'px "Plus Jakarta Sans", system-ui, sans-serif';
        ctx.fillStyle = hot ? '#ffc861' : 'rgba(207,230,225,.85)';
        ctx.fillText(label, p[0] + 10, p[1] - 8);
      }
      pin(ORIGIN, ORIGIN.label, false);
      pin(DESTS[dest], DESTS[dest].label, true);
      ctx.globalAlpha = 1;

      if (!reduce && !paused && visible && !document.hidden && v.fade > 0) raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf) raf = requestAnimationFrame(frame); }

    size();
    if ('ResizeObserver' in window) new ResizeObserver(function () { size(); kick(); }).observe(canvas);
    else window.addEventListener('resize', function () { size(); kick(); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); }).observe(canvas);
    document.addEventListener('visibilitychange', kick);
    if (!reduce && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      window.addEventListener('pointermove', function (e) { tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5; kick(); }, { passive: true });
    }
    arcStart = performance.now();
    kick();

    return {
      setDest: function (i) { if (i === dest) return; dest = i; arcT = reduce ? 1 : 0; arcStart = performance.now(); t0 = arcStart + 1800; kick(); },
      setScroll: function (p) { scrollP = Math.max(0, Math.min(1, p)); kick(); },
      setPaused: function (b) { paused = b; if (!b) kick(); },
      redraw: kick
    };
  }

  window.TCGlobe = { mount: mount, DESTS: DESTS };
})();
