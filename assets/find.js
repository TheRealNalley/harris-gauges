(function () {
  var form = document.querySelector('form.find');
  if (!form) return;
  var input = form.querySelector('input'), box = form.querySelector('.results');
  var idx = null, hits = [], sel = -1, loading = false;
  var SHORT = {road: 'rd', street: 'st', drive: 'dr', boulevard: 'blvd', parkway: 'pkwy',
    highway: 'hwy', avenue: 'ave', lane: 'ln', creek: 'ck', river: 'rv', near: 'nr',
    north: 'n', south: 's', east: 'e', west: 'w', farm: 'fm', interstate: 'i', ih: 'i'};
  function norm(s) {
    return s.toLowerCase().replace(/@/g, ' at ').replace(/[^a-z0-9]+/g, ' ').trim()
      .split(' ').map(function (w) { return SHORT[w] || w; }).join(' ');
  }
  function load() {
    if (idx || loading) return;
    loading = true;
    fetch('/search.json').then(function (r) { return r.json(); }).then(function (d) {
      idx = d.map(function (e) { e.k = ' ' + norm(e.n + ' ' + (e.a || '')); return e; });
      render();
    }).catch(function () { loading = false; });
  }
  function hide() { box.hidden = true; sel = -1; }
  function render() {
    var q = norm(input.value);
    if (!q) { hide(); return; }
    if (!idx) { box.innerHTML = '<p>Loading…</p>'; box.hidden = false; return; }
    var terms = q.split(' ');
    hits = idx.filter(function (e) {
      return terms.every(function (t) { return e.k.indexOf(' ' + t) >= 0; });
    }).sort(function (a, b) {
      return (a.k.indexOf(' ' + q) === 1 ? 0 : 1) - (b.k.indexOf(' ' + q) === 1 ? 0 : 1) || a.o - b.o;
    }).slice(0, 10);
    sel = -1;
    box.innerHTML = '';
    if (!hits.length) {
      var p = document.createElement('p');
      p.textContent = 'No gauge matches. Try a creek or road name.';
      box.appendChild(p);
    }
    hits.forEach(function (e, i) {
      var a = document.createElement('a'), s = document.createElement('small');
      a.href = e.u; a.textContent = e.n; a.setAttribute('role', 'option');
      s.textContent = e.s; a.appendChild(s);
      box.appendChild(a);
    });
    box.hidden = false;
  }
  function mark() {
    var links = box.querySelectorAll('a');
    for (var i = 0; i < links.length; i++) links[i].className = i === sel ? 'on' : '';
  }
  input.addEventListener('focus', load);
  input.addEventListener('input', function () { load(); render(); });
  input.addEventListener('keydown', function (ev) {
    if (box.hidden) return;
    if (ev.key === 'ArrowDown') { sel = Math.min(sel + 1, hits.length - 1); mark(); ev.preventDefault(); }
    else if (ev.key === 'ArrowUp') { sel = Math.max(sel - 1, -1); mark(); ev.preventDefault(); }
    else if (ev.key === 'Escape') { hide(); }
  });
  form.addEventListener('submit', function (ev) {
    if (hits.length) { ev.preventDefault(); location.href = hits[sel >= 0 ? sel : 0].u; }
  });
  input.addEventListener('blur', function () { setTimeout(hide, 200); });
})();
// The States menu: close it on a tap outside, or Escape.
(function () {
  var d = document.querySelector('details.states');
  if (!d) return;
  document.addEventListener('click', function (ev) { if (d.open && !d.contains(ev.target)) d.open = false; });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') d.open = false; });
})();
// Contact links are written as "user [at] domain"; make them real mailto links here.
[].forEach.call(document.querySelectorAll('a.mail[data-u][data-d]'), function (a) {
  var addr = a.getAttribute('data-u') + '@' + a.getAttribute('data-d');
  a.href = 'mailto:' + addr;
  a.textContent = addr;
});
// Pages are written at each publish, so "12 minutes ago" and "no alert active" stay frozen if
// publishing stops (the server or its internet down). status.json is rewritten every publish:
// past STALE_MIN, say so above the page. The server's Date header is "now", not the visitor's clock.
(function () {
  var STALE_MIN = 60, top = document.querySelector('header.top');
  if (!top || !window.fetch) return;
  fetch('/status.json', {cache: 'no-store'}).then(function (r) {
    return r.json().then(function (s) { return [s, Date.parse(r.headers.get('Date'))]; });
  }).then(function (x) {
    // Python writes microseconds; trim to milliseconds for older Safari's parser.
    var built = Date.parse(String(x[0].generated_at).replace(/(\.\d{3})\d+/, '$1'));
    var now = isNaN(x[1]) ? Date.now() : x[1];
    var mins = (now - built) / 60000;
    if (isNaN(built) || mins < STALE_MIN) return;
    var ago = mins < 90 ? Math.round(mins) + ' minutes' : mins < 60 * 36 ? Math.round(mins / 60) + ' hours'
      : Math.round(mins / 1440) + ' days';
    var when = new Date(built).toLocaleString('en-US', {month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short'});
    var p = document.createElement('p');
    p.className = 'note';
    p.innerHTML = '<strong>This site has not updated since ' + when + ' (' + ago + ' ago).</strong> '
      + 'Readings, times and alerts on this page are from then and may not reflect conditions now. '
      + 'Current readings: <a href="https://water.noaa.gov/">water.noaa.gov</a>; current alerts: '
      + '<a href="https://www.weather.gov/">weather.gov</a>.';
    top.parentNode.insertBefore(p, top.nextSibling);
  }).catch(function () {});
})();
