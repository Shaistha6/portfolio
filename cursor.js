(function () {
  if (!window.matchMedia('(pointer: fine)').matches) return;
  document.addEventListener('DOMContentLoaded', function () {
    var d = document.createElement('div'); d.className = 'cursor-dot'; document.body.appendChild(d);
    document.documentElement.classList.add('has-dot');
    var x = -100, y = -100, cx = -100, cy = -100, shown = false;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.addEventListener('pointermove', function (e) {
      x = e.clientX; y = e.clientY;
      if (!shown) { cx = x; cy = y; shown = true; d.style.opacity = 1; }
      var el = e.target.closest && e.target.closest('a, button, [role="button"]');
      d.classList.toggle('hover', !!el);
    });
    document.addEventListener('pointerleave', function () { d.style.opacity = 0; shown = false; });
    (function tick() {
      cx += (x - cx) * (reduce ? 1 : 0.25); cy += (y - cy) * (reduce ? 1 : 0.25);
      d.style.transform = 'translate(' + cx + 'px,' + cy + 'px)';
      requestAnimationFrame(tick);
    })();
  });
})();
