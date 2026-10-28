(function () {
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem('theme'); } catch (e) {}
  var dark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.querySelector('.toggle');
    if (btn) btn.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
    var filters = document.querySelectorAll('.filters button');
    filters.forEach(function (b) {
      b.addEventListener('click', function () {
        filters.forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        var f = b.getAttribute('data-f');
        document.querySelectorAll('.card').forEach(function (c) {
          c.classList.toggle('hidden', f !== 'all' && (c.getAttribute('data-cat') || '').indexOf(f) === -1);
        });
      });
    });
  });
})();
