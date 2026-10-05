/* NÛR — calcul astronomique des heures de prière et de la qibla.
 * Algorithme classique de position solaire (équation du temps, déclinaison),
 * angles de crépuscule paramétrables, ajustement des hautes latitudes (portion de nuit).
 * Module sans dépendance, utilisable dans le navigateur et sous Node.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.NurPrayer = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";
  var D2R = Math.PI / 180, R2D = 180 / Math.PI;
  var sin = function (d) { return Math.sin(d * D2R); };
  var cos = function (d) { return Math.cos(d * D2R); };
  var tan = function (d) { return Math.tan(d * D2R); };
  var asin = function (x) { return Math.asin(x) * R2D; };
  var acos = function (x) { return Math.acos(x) * R2D; };
  var atan2 = function (y, x) { return Math.atan2(y, x) * R2D; };
  var arccot = function (x) { return Math.atan(1 / x) * R2D; };
  var fix = function (a, b) { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; };
  var fixAngle = function (a) { return fix(a, 360); };
  var fixHour = function (a) { return fix(a, 24); };

  /* Méthodes de calcul : angles du soleil sous l'horizon (Fajr, Ichâ').
   * ishaMin : si défini, Ichâ' = Maghrib + ishaMin minutes. */
  var METHODS = {
    MWL:    { name: "Ligue islamique mondiale (Fajr 18°, Ichâ' 17°)", fajr: 18, isha: 17 },
    UOIF:   { name: "UOIF / France (Fajr 12°, Ichâ' 12°)", fajr: 12, isha: 12 },
    EGYPT:  { name: "Autorité égyptienne (Fajr 19,5°, Ichâ' 17,5°)", fajr: 19.5, isha: 17.5 },
    MAKKAH: { name: "Oumm al-Qourâ, La Mecque (Fajr 18,5°, Ichâ' 90 min après le Maghrib)", fajr: 18.5, ishaMin: 90 },
    MAROC:  { name: "Maroc (Fajr 19°, Ichâ' 17°) — à confirmer", fajr: 19, isha: 17 },
    ISNA:   { name: "ISNA (Fajr 15°, Ichâ' 15°)", fajr: 15, isha: 15 },
    KARACHI:{ name: "Karachi (Fajr 18°, Ichâ' 18°)", fajr: 18, isha: 18 },
    CUSTOM: { name: "Personnalisée", fajr: 18, isha: 17 }
  };

  function julian(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    var A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }

  function sunPosition(jd) {
    var D = jd - 2451545.0;
    var g = fixAngle(357.529 + 0.98560028 * D);
    var q = fixAngle(280.459 + 0.98564736 * D);
    var L = fixAngle(q + 1.915 * sin(g) + 0.020 * sin(2 * g));
    var e = 23.439 - 0.00000036 * D;
    var RA = fixHour(atan2(cos(e) * sin(L), cos(L)) / 15);
    return { decl: asin(sin(e) * sin(L)), eqt: q / 15 - RA };
  }

  /* Calcule les heures (en heures UTC décimales) pour la date civile (y, m, d) à (lat, lng).
   * params : { fajr, isha, ishaMin, asrFactor (1 = standard / malikite), elevation, dhuhrMin, maghribMin } */
  function timesUTC(y, m, d, lat, lng, p) {
    p = p || {};
    var asrFactor = p.asrFactor || 1;
    var jd = julian(y, m, d) - lng / (15 * 24);
    var horizon = 0.833 + 0.0347 * Math.sqrt(Math.max(0, p.elevation || 0));

    function midDay(t) { return fixHour(12 - sunPosition(jd + t).eqt); }
    function angleTime(angle, t, ccw) {
      var decl = sunPosition(jd + t).decl;
      var x = (-sin(angle) - sin(decl) * sin(lat)) / (cos(decl) * cos(lat));
      if (x < -1 || x > 1) return NaN;
      return midDay(t) + (ccw ? -1 : 1) * acos(x) / 15;
    }
    function asrTime(factor, t) {
      var decl = sunPosition(jd + t).decl;
      var angle = -arccot(factor + tan(Math.abs(lat - decl)));
      return angleTime(angle, t, false);
    }

    var h = { fajr: 5, sunrise: 6, dhuhr: 12, asr: 13, sunset: 18, maghrib: 18, isha: 18 };
    for (var it = 0; it < 2; it++) {
      var t = {};
      for (var k in h) t[k] = h[k] / 24;
      h = {
        fajr: angleTime(p.fajr, t.fajr, true),
        sunrise: angleTime(horizon, t.sunrise, true),
        dhuhr: midDay(t.dhuhr),
        asr: asrTime(asrFactor, t.asr),
        sunset: angleTime(horizon, t.sunset, false),
        maghrib: angleTime(p.maghribAngle != null ? p.maghribAngle : horizon, t.maghrib, false),
        isha: angleTime(p.isha != null ? p.isha : 17, t.isha, false)
      };
    }
    // Hautes latitudes : portion de nuit basée sur l'angle (si l'angle n'est jamais atteint).
    var night = fixHour(h.sunrise - h.sunset);
    function portion(angle) { return angle / 60; }
    // Repli uniquement si l'angle choisi n'est jamais atteint (nuits blanches d'été).
    var fb = isNaN(h.fajr);
    var flags = { fajrAdjusted: false, ishaAdjusted: false };
    if (!isNaN(night) && fb) { h.fajr = h.sunrise - portion(p.fajr) * night; flags.fajrAdjusted = true; }
    if (p.ishaMin) {
      h.isha = h.maghrib + p.ishaMin / 60;
    } else {
      var ib = isNaN(h.isha);
      if (!isNaN(night) && ib) { h.isha = h.sunset + portion(p.isha) * night; flags.ishaAdjusted = true; }
    }
    // Conversion en heures UTC.
    var tz0 = -lng / 15;
    var out = {};
    for (var key in h) out[key] = h[key] + tz0;           // UTC
    out.dhuhr += (p.dhuhrMin || 0) / 60;
    out.maghrib += (p.maghribMin || 0) / 60;
    out.flags = flags;
    return out;
  }

  /* Heure -> horodatage (ms) pour la date civile donnée. */
  function toTimestamps(y, m, d, utcHours, offsetsMin) {
    var base = Date.UTC(y, m - 1, d);
    var out = {};
    ["fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"].forEach(function (k) {
      var v = utcHours[k];
      if (isNaN(v)) { out[k] = NaN; return; }
      var min = Math.round(v * 60) + ((offsetsMin && offsetsMin[k]) || 0);
      out[k] = base + min * 60000;
    });
    out.flags = utcHours.flags;
    return out;
  }

  /* Paramètres de calcul à partir des réglages. */
  function paramsFrom(settings) {
    var m = METHODS[settings.method] || METHODS.MWL;
    var p = { fajr: m.fajr, isha: m.isha, ishaMin: m.ishaMin, asrFactor: 1, dhuhrMin: settings.dhuhrMin || 0, elevation: settings.elevation || 0 };
    if (settings.method === "CUSTOM") { p.fajr = settings.customFajr; p.isha = settings.customIsha; p.ishaMin = null; }
    return p;
  }

  /* Prières d'une date civile, en horodatages. */
  function compute(y, m, d, lat, lng, settings) {
    var p = paramsFrom(settings || {});
    var u = timesUTC(y, m, d, lat, lng, p);
    return toTimestamps(y, m, d, u, (settings && settings.offsets) || {});
  }

  /* Direction de la qibla (degrés depuis le nord vrai) et distance (km) vers la Kaaba. */
  var KAABA = { lat: 21.422487, lng: 39.826206 };
  function qibla(lat, lng) {
    var dl = (KAABA.lng - lng) * D2R, f1 = lat * D2R, f2 = KAABA.lat * D2R;
    var y = Math.sin(dl) * Math.cos(f2);
    var x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
    var bearing = (Math.atan2(y, x) * R2D + 360) % 360;
    var a = Math.sin((f2 - f1) / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2;
    var dist = 2 * 6371 * Math.asin(Math.sqrt(a));
    return { bearing: bearing, distanceKm: dist };
  }

  return { METHODS: METHODS, compute: compute, timesUTC: timesUTC, toTimestamps: toTimestamps, paramsFrom: paramsFrom, qibla: qibla, julian: julian, sunPosition: sunPosition };
});
