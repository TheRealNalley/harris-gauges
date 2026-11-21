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

(function () {
  // Chart hover: data-tips is [[x, y, text], ...], x and y in thousandths of the plot.
  [].forEach.call(document.querySelectorAll('figure.vc[data-tips]'), function (f) {
    var tips;
    try { tips = JSON.parse(f.getAttribute('data-tips')); } catch (e) { return; }
    if (!tips || !tips.length) return;
    var pa = f.querySelector('.pa');
    var xh = document.createElement('div'), dot = document.createElement('div'),
      tip = document.createElement('div');
    xh.className = 'vxh'; dot.className = 'vdot'; tip.className = 'vtip';
    xh.hidden = dot.hidden = tip.hidden = true;
    pa.appendChild(xh); pa.appendChild(dot); pa.appendChild(tip);
    function show(ev) {
      var r = pa.getBoundingClientRect(), fx = (ev.clientX - r.left) / r.width * 1000;
      var lo = 0, hi = tips.length - 1;
      while (hi - lo > 1) { var m = (lo + hi) >> 1; if (tips[m][0] < fx) lo = m; else hi = m; }
      var p = Math.abs(tips[lo][0] - fx) <= Math.abs(tips[hi][0] - fx) ? tips[lo] : tips[hi];
      xh.style.left = dot.style.left = p[0] / 10 + '%';
      dot.style.top = p[1] / 10 + '%';
      tip.textContent = p[2];
      xh.hidden = dot.hidden = tip.hidden = false;
      var x = r.width * p[0] / 1000, y = r.height * p[1] / 1000, w = tip.offsetWidth;
      tip.style.left = Math.max(-40, Math.min(x - w / 2, r.width - w)) + 'px';
      var top = y - tip.offsetHeight - 12;
      tip.style.top = (top < -8 ? y + 14 : top) + 'px';
    }
    function hide() { xh.hidden = dot.hidden = tip.hidden = true; }
    pa.addEventListener('pointermove', show);
    pa.addEventListener('pointerdown', show);
    pa.addEventListener('pointerleave', hide);
  });

  // Section menu: mark the section being read and keep its tab in view.
  var nav = document.querySelector('nav.jump');
  if (!nav) return;
  var links = {}, heads = [];
  [].forEach.call(nav.querySelectorAll('a[href^="#"]'), function (a) {
    var id = a.getAttribute('href').slice(1), h = document.getElementById(id);
    if (h) { links[id] = a; heads.push(h); }
  });
  var cur = null, queued = false;
  function update() {
    queued = false;
    var on = null;
    for (var i = 0; i < heads.length; i++) {
      if (heads[i].getBoundingClientRect().top < 90) on = heads[i].id; else break;
    }
    if (on === cur) return;
    if (cur) links[cur].classList.remove('on');
    cur = on;
    if (!on) return;
    var a = links[on];
    a.classList.add('on');
    if (a.offsetLeft < nav.scrollLeft || a.offsetLeft + a.offsetWidth > nav.scrollLeft + nav.clientWidth) {
      nav.scrollLeft = a.offsetLeft - 18;
    }
  }
  window.addEventListener('scroll', function () {
    if (!queued) { queued = true; window.requestAnimationFrame(update); }
  }, {passive: true});
  update();
})();
