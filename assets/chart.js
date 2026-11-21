(function () {
  var fmt = new Intl.DateTimeFormat('en-US', {timeZone: 'America/Chicago', month: 'short',
    day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short'});
  var NS = 'http://www.w3.org/2000/svg';
  [].forEach.call(document.querySelectorAll('svg.hov'), function (svg) {
    var d = svg.dataset, t0 = +d.t0, span = +d.span, x0 = +d.x0, x1 = +d.x1, y0 = +d.y0;
    var lo = +d.lo, hi = +d.hi, vb = svg.viewBox.baseVal, h = vb.height - 22;
    var pts = d.pts.split(';').map(function (s) { var a = s.split(','); return [+a[0], +a[1]]; });
    var tip = svg.parentNode.querySelector('.tip');
    var line = document.createElementNS(NS, 'line'), dot = document.createElementNS(NS, 'circle');
    line.setAttribute('class', 'xh'); line.setAttribute('y1', y0); line.setAttribute('y2', h);
    dot.setAttribute('r', 4); dot.setAttribute('class', 'peak');
    function px(m) { return x0 + (x1 - x0) * m / span; }
    function py(v) { return y0 + (h - y0) * (v - lo) / (hi - lo); }
    function show(ev) {
      var r = svg.getBoundingClientRect(), x = (ev.clientX - r.left) * vb.width / r.width;
      var m = (x - x0) / (x1 - x0) * span, best = pts[0];
      pts.forEach(function (p) { if (Math.abs(p[0] - m) < Math.abs(best[0] - m)) best = p; });
      var bx = px(best[0]), by = py(best[1]);
      line.setAttribute('x1', bx); line.setAttribute('x2', bx);
      dot.setAttribute('cx', bx); dot.setAttribute('cy', by);
      if (!line.parentNode) { svg.appendChild(line); svg.appendChild(dot); }
      var v = best[1];
      tip.textContent = fmt.format(new Date(t0 + best[0] * 60000)) + ' \u00b7 ' +
        Math.abs(v).toFixed(1) + ' ft ' + (v >= 0 ? 'below' : 'above') + ' top of bank';
      tip.hidden = false;
      // SVG elements have no offsetTop: measure the chart's place in its panel instead.
      var box = svg.parentNode.getBoundingClientRect();
      var left = r.left - box.left + bx * r.width / vb.width, half = tip.offsetWidth / 2;
      tip.style.left = Math.max(0, Math.min(left - half, box.width - tip.offsetWidth)) + 'px';
      tip.style.top = (r.top - box.top + by * r.height / vb.height - tip.offsetHeight - 10) + 'px';
    }
    function hide() { tip.hidden = true; if (line.parentNode) { line.remove(); dot.remove(); } }
    svg.addEventListener('pointermove', show);
    svg.addEventListener('pointerdown', show);
    svg.addEventListener('pointerleave', hide);
  });
})();
