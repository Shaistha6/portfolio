(function () {
  var D = window.HERO_DOTS; if (!D) return;
  var canvas = document.getElementById('dots'); if (!canvas) return;
  var ctx = canvas.getContext('2d');
  // Light fuchsia shades only (red-400 → red-50)
  var PAL = ['#fc53c9', '#fc6fd2', '#fd9ce0', '#febcea', '#ffeaf8'];
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var N = D.c, hand = [], fly = [], sprites = [], dpr = 1, cell = 6, ox = 0, oy = 0, mouse = { x: -9999, y: -9999 }, t0 = null;
  // The butterfly is mirrored so it faces left: it flies in from the upper right, head first.
  var B = D.b, MIR = B[0] + B[1];
  // Body axis runs along the lower edge, from the abdomen tip to the head (mirrored).
  var AX = { x: MIR - (B[0] + 4), y: B[3] - 0.5 }, HD = { x: MIR - B[1], y: B[3] - 9 };
  var AL = Math.hypot(HD.x - AX.x, HD.y - AX.y), U = { x: (HD.x - AX.x) / AL, y: (HD.y - AX.y) / AL };
  var NV = { x: U.y, y: -U.x }; if (NV.y > 0) { NV.x = -NV.x; NV.y = -NV.y; }   // normal pointing up, into the wings
  // feet sit on the body, a little behind the middle; they rest on the index fingertip
  var FEET = { x: AX.x + U.x * AL * 0.42, y: AX.y + U.y * AL * 0.42 };
  var LAND = { x: D.tip[0] - FEET.x, y: D.tip[1] - FEET.y + 0.4 };
  var P0 = { x: LAND.x + N * 0.3, y: LAND.y - N * 0.22 }, P1 = { x: LAND.x + N * 0.2, y: LAND.y + N * 0.02 },
      P2 = { x: LAND.x + N * 0.08, y: LAND.y - N * 0.12 }, P3 = LAND;
  var T_HAND = 4000, T_FLY0 = 2600, T_FLY = 7400;
  var KN = { x: D.tip[0] - 13, y: D.tip[1] + 4 };            // knuckles: base of the fingers
  function bump(a, b, t) { var k = Math.min(1, Math.max(0, (t - a) / (b - a))); var s = Math.sin(Math.PI * k); return s * s; }
  function smoother(k) { k = Math.min(1, Math.max(0, k)); return k * k * k * (k * (k * 6 - 15) + 10); }

  for (var y = 0; y < D.r; y++) for (var x = 0; x < D.c; x++) {
    var ch = D.d[y].charCodeAt(x), v = ch >= 97 ? ch - 87 : ch - 48;
    if (!v) continue;
    var o = { x: x, y: y, v: (v % 10) - 1, p: Math.random() * 6.28 };
    if (v >= 10) {
      o.x = MIR - x;
      var rx = o.x - AX.x, ry = o.y - AX.y;
      o.s = rx * U.x + ry * U.y;                 // position along the body
      o.n = rx * NV.x + ry * NV.y;               // height above the body (wing); below 0 = body/abdomen
      fly.push(o);
    } else hand.push(o);
  }

  function clamp(k) { return Math.min(1, Math.max(0, k)); }
  function easeIO(k) { k = clamp(k); return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function easeOut(k) { k = clamp(k); return 1 - Math.pow(1 - k, 3); }
  function smooth(a, b, k) { k = clamp((k - a) / (b - a)); return k * k * (3 - 2 * k); }
  function bez(a, b, c, d, k) { var u = 1 - k; return u * u * u * a + 3 * u * u * k * b + 3 * u * k * k * c + k * k * k * d; }

  function makeSprites() {
    sprites = PAL.map(function (c) {
      var s = Math.ceil(cell * 2 * dpr), o = document.createElement('canvas');
      o.width = o.height = s; var g = o.getContext('2d'), m = s / 2;
      var grd = g.createRadialGradient(m, m, 0, m, m, m);
      grd.addColorStop(0, c); grd.addColorStop(0.4, c); grd.addColorStop(0.5, c + '33'); grd.addColorStop(1, c + '00');
      g.fillStyle = grd; g.fillRect(0, 0, s, s); return o;
    });
  }

  function resize() {
    var r = canvas.getBoundingClientRect(); dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = r.width * dpr; canvas.height = r.height * dpr;
    var mobile = r.width < 760, gutter = Math.max(24, (r.width - 1200) / 2), used = D.r * 0.84;
    if (mobile) { cell = Math.min(r.width * 1.1 / N, r.height * 0.5 / used); ox = r.width - N * cell + cell * N * 0.07; oy = r.height - D.r * cell + cell * N * 0.03; }
    else {
      cell = Math.min(r.height * 0.86 / used, r.width * 0.62 / N);
      ox = r.width - N * cell - gutter + cell * N * 0.1;
      oy = Math.min(r.height * 0.6 - N * 0.75 * cell, r.height - D.r * cell + cell * N * 0.03);
    }
    makeSprites(); if (reduce) draw(1e6);
  }

  function dot(px, py, lvl, a, phase, t) {
    var X = ox + (px + 0.5) * cell, Y = oy + (py + 0.5) * cell;
    var dx = X - mouse.x, dy = Y - mouse.y, near = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / 100);
    var l = Math.min(4, lvl + Math.round(near * 2));
    var tw = reduce ? 1 : 0.93 + 0.07 * Math.sin(t / 1100 + phase);
    var rad = cell * (0.5 + 0.06 * l) * tw * (1 + near * 0.2);
    ctx.globalAlpha = a; ctx.drawImage(sprites[l], X - rad, Y - rad, rad * 2, rad * 2);
  }

  function draw(t) {
    var w = canvas.width / dpr, h = canvas.height / dpr, i, c;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';

    // 1. The hand slowly rises into place (0–4s)
    var hp = reduce ? 1 : smoother(t / T_HAND);
    var lift = (1 - hp) * N * 0.14;
    var breathe = reduce ? 0 : Math.sin(t / 3600) * 0.3 * smooth(T_HAND, T_HAND + 2500, t);
    var appear = reduce ? 1 : smooth(0, 2200, t);
    // Fingers move a little around the knuckles: once the hand is up they lift gently as if
    // inviting the butterfly, then give slightly under its weight as it lands, then barely sway.
    var ang = reduce ? 0 : -0.09 * bump(4000, 7400, t) + 0.035 * bump(9200, 10900, t)
                           - 0.012 * Math.sin(t / 2600) * smooth(11000, 13000, t);
    var ca = Math.cos(ang), sa = Math.sin(ang);
    for (i = 0; i < hand.length; i++) {
      c = hand[i];
      var fade = smooth(0, N * 0.3, c.x);                       // arm fades out on the left
      if (fade <= 0.01) continue;
      var px = c.x, py = c.y;
      var fw = smooth(KN.x - 4, KN.x + 4, c.x);                  // fingers only, blended at the knuckles
      if (fw > 0 && ang) {
        var dx = px - KN.x, dy = py - KN.y, a2 = ang * fw, c2 = Math.cos(a2), s2 = Math.sin(a2);
        px = KN.x + dx * c2 - dy * s2; py = KN.y + dx * s2 + dy * c2;
      }
      dot(px, py + lift + breathe, c.v, fade * appear, c.p, t);
    }

    // 2. The butterfly glides in forward and settles on the first finger
    var raw = reduce ? 1 : clamp((t - T_FLY0) / T_FLY), fp = smoother(raw);
    if (raw > 0) {
      var bx = bez(P0.x, P1.x, P2.x, P3.x, fp), by = bez(P0.y, P1.y, P2.y, P3.y, fp);
      var flying = reduce ? 0 : 1 - smooth(0.7, 1, raw);         // wingbeats fade out as it lands
      var W = Math.PI * 2 * t;
      // Wingbeat seen from the side: wings rotate around the body, so they foreshorten towards it
      // (open) and rise back up (closed). The body and feet stay fixed.
      var beat = 0.5 - 0.5 * Math.cos(W / 480);                  // 0 = closed (up), 1 = open (flat)
      by -= (beat - 0.5) * 0.8 * flying;                         // body lifts on each downstroke
      var restT = Math.max(0, t - T_FLY0 - T_FLY);
      var bask = Math.pow(0.5 - 0.5 * Math.cos(Math.PI * 2 * restT / 5200), 2);   // slow, occasional opening at rest
      var open = reduce ? 0 : flying * beat * 0.8 + (1 - flying) * bask * 0.45;
      var a = reduce ? 1 : smooth(T_FLY0, T_FLY0 + 1800, t);
      var landed = smooth(0.82, 0.95, raw);
      for (i = 0; i < fly.length; i++) {
        c = fly[i];
        var wn = Math.max(0, c.n), k = wn / 14;                  // wing tips move more than wing roots
        var nn = c.n - wn * open * Math.min(1, 0.5 + k);
        var ss = c.s - wn * open * 0.18;                         // tips sweep back slightly as wings open
        var qx = AX.x + U.x * ss + NV.x * nn + bx, qy = AX.y + U.y * ss + NV.y * nn + by;
        if (landed > 0 && ang) {                                  // once landed, it rides the finger
          var ex = qx - KN.x, ey = qy - KN.y, a3 = ang * landed;
          qx = KN.x + ex * Math.cos(a3) - ey * Math.sin(a3); qy = KN.y + ex * Math.sin(a3) + ey * Math.cos(a3);
        }
        dot(qx, qy + breathe, c.v, a, c.p, t);
      }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }

  function loop(ts) { if (t0 === null) t0 = ts; draw(ts - t0); requestAnimationFrame(loop); }
  canvas.parentElement.addEventListener('pointermove', function (e) { var r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
  canvas.parentElement.addEventListener('pointerleave', function () { mouse.x = mouse.y = -9999; });
  window.addEventListener('resize', resize);
  resize(); if (!reduce) requestAnimationFrame(loop);
})();
