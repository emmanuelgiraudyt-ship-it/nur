/* NÛR — emblème de lumière : rosace à huit branches, anneaux d'astrolabe et cadran du jour.
   Le cadran place les cinq prières du jour à leur heure réelle (midi en haut, minuit en bas)
   et un point de lumière suit l'heure présente. Aucune figure d'être vivant. */
(function () {
  "use strict";
  var N = 0, K = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
  function f(n) { return n.toFixed(2); }
  function hourIn(ts, tz) {
    try {
      var p = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(ts));
      var g = function (t) { return +p.filter(function (x) { return x.type === t; })[0].value; };
      return g("hour") + g("minute") / 60;
    } catch (e) { var d = new Date(ts); return d.getHours() + d.getMinutes() / 60; }
  }
  /* angle depuis le haut, dans le sens des aiguilles : midi en haut, 18 h à droite, minuit en bas, 6 h à gauche */
  function pt(h, r) { var a = (h - 12) / 24 * 2 * Math.PI; return [Math.sin(a) * r, -Math.cos(a) * r]; }
  function arc(h1, h2, r) {
    var a = pt(h1, r), b = pt(h2, r), span = ((h2 - h1) + 24) % 24;
    return "M" + f(a[0]) + " " + f(a[1]) + "A" + r + " " + r + " 0 " + (span > 12 ? 1 : 0) + " 1 " + f(b[0]) + " " + f(b[1]);
  }
  function star(r, rot) {
    var s = "";
    for (var q = 0; q < 2; q++) {
      var d = "";
      for (var i = 0; i < 4; i++) { var a = (rot + q * 45 + i * 90) * Math.PI / 180; d += (i ? "L" : "M") + f(Math.sin(a) * r) + " " + f(-Math.cos(a) * r); }
      s += '<path d="' + d + 'Z" pathLength="1"/>';
    }
    return s;
  }
  function svg(o) {
    o = o || {}; var id = "ne" + (++N), rays = "", i;
    for (i = 0; i < 24; i++) { var a = i * 15 * Math.PI / 180; rays += '<line x1="' + f(Math.sin(a) * 64) + '" y1="' + f(-Math.cos(a) * 64) + '" x2="' + f(Math.sin(a) * 196) + '" y2="' + f(-Math.cos(a) * 196) + '"/>'; }
    var hours = "";
    for (i = 0; i < 24; i += 6) { var p = pt(i, 151); hours += '<text x="' + f(p[0]) + '" y="' + f(p[1] + 3) + '">' + String(i).padStart(2, "0") + '</text>'; }
    return '<svg class="nemb" viewBox="-200 -200 400 400" role="img" aria-label="' + (o.label || "") + '"' + (o.label ? "" : ' aria-hidden="true"') + '>' +
      '<defs><radialGradient id="' + id + 'g"><stop offset="0" stop-color="#FFF1C4" stop-opacity=".62"/><stop offset=".42" stop-color="#E9C46A" stop-opacity=".2"/><stop offset="1" stop-color="#E9C46A" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="' + id + 'o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF4CF"/><stop offset=".55" stop-color="#E9C46A"/><stop offset="1" stop-color="#B8893A"/></linearGradient></defs>' +
      '<circle class="e-glow" r="178" fill="url(#' + id + 'g)"/>' +
      '<g class="e-rays">' + rays + '</g>' +
      '<g class="e-r1"><circle class="e-hair" r="194"/><circle class="e-tick" r="186"/><circle class="e-tick2" r="183"/></g>' +
      '<g class="e-r2"><circle class="e-dash" r="168"/></g>' +
      '<g class="e-day"><circle class="e-dial" r="140"/><path class="e-light"/><g class="e-hours">' + hours + '</g><g class="e-pr"></g><g class="e-sun"><circle class="e-halo" r="13"/><circle r="5.5"/></g></g>' +
      '<g class="e-star">' + star(112, 0) + '</g>' +
      '<g class="e-star2">' + star(76, 22.5) + '</g>' +
      '<circle class="e-core" r="56"/>' +
      (o.text === false ? "" : '<text class="e-nur" y="20" fill="url(#' + id + 'o)" lang="ar">نور</text>') +
      '</svg>';
  }
  /* place les prières et le point de lumière ; T = horaires du jour (horodatages), tz = fuseau */
  function place(el, T, tz, nextKey) {
    if (!el || !T) return;
    var g = el.querySelector(".e-pr"), sun = el.querySelector(".e-sun"), lt = el.querySelector(".e-light"), out = "";
    K.forEach(function (k) {
      if (!(T[k] === T[k])) return;
      var p = pt(hourIn(T[k], tz), 140);
      out += '<circle class="' + (k === nextKey ? "on" : "") + '" cx="' + f(p[0]) + '" cy="' + f(p[1]) + '" r="' + (k === nextKey ? 6 : 4) + '"/>';
    });
    g.innerHTML = out;
    if (T.fajr === T.fajr && T.maghrib === T.maghrib) lt.setAttribute("d", arc(hourIn(T.fajr, tz), hourIn(T.maghrib, tz), 140));
    var s = pt(hourIn(Date.now(), tz), 140);
    sun.setAttribute("transform", "translate(" + f(s[0]) + " " + f(s[1]) + ")");
  }
  window.NurEmblem = { svg: svg, place: place, hourIn: hourIn };
})();
