/* Live weather for the launcher, using the free open-meteo.com API (no key required).
   Location: set LAT/LON below, or leave null to auto-detect by IP the first time. */
(function () {
  'use strict';

  var LAT = 27.4467;   // Fort Pierce, FL  (set to null to auto-detect by IP)
  var LON = -80.3256;
  var UNIT = 'fahrenheit';   // 'fahrenheit' or 'celsius'
  var PLACE = 'Fort Pierce';

  // WMO weather codes -> label + simple SVG glyph
  var SUN = '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="9" fill="#ffd60a"/><g stroke="#ffd60a" stroke-width="2.4" stroke-linecap="round"><path d="M24 6v6M24 36v6M6 24h6M36 24h6M11 11l4 4M33 33l4 4M37 11l-4 4M15 33l-4 4"/></g></svg>';
  var CLOUD = '<svg viewBox="0 0 48 48"><path d="M16 34a8 8 0 010-16 10 10 0 0119-2 7 7 0 011 18z" fill="#cdd6e3"/></svg>';
  var PARTLY = '<svg viewBox="0 0 48 48"><circle cx="18" cy="17" r="7" fill="#ffd60a"/><path d="M20 36a7 7 0 010-14 9 9 0 0117-2 6 6 0 011 16z" fill="#cdd6e3"/></svg>';
  var RAIN = '<svg viewBox="0 0 48 48"><path d="M16 28a8 8 0 010-16 10 10 0 0119-2 7 7 0 011 18z" fill="#cdd6e3"/><g stroke="#4aa8ff" stroke-width="2.4" stroke-linecap="round"><path d="M18 34l-2 5M26 34l-2 5M34 34l-2 5"/></g></svg>';
  var SNOW = '<svg viewBox="0 0 48 48"><path d="M16 28a8 8 0 010-16 10 10 0 0119-2 7 7 0 011 18z" fill="#cdd6e3"/><g fill="#eaf4ff"><circle cx="18" cy="37" r="2"/><circle cx="26" cy="37" r="2"/><circle cx="34" cy="37" r="2"/></g></svg>';
  var STORM = '<svg viewBox="0 0 48 48"><path d="M16 28a8 8 0 010-16 10 10 0 0119-2 7 7 0 011 18z" fill="#cdd6e3"/><path d="M24 30l-5 8h4l-2 6 7-9h-4z" fill="#ffd60a"/></svg>';
  var FOG = '<svg viewBox="0 0 48 48"><g stroke="#cdd6e3" stroke-width="3" stroke-linecap="round"><path d="M10 18h28M8 26h32M12 34h24"/></g></svg>';

  function codeInfo(c) {
    if (c === 0) return { t: 'Clear', i: SUN };
    if (c <= 2) return { t: 'Partly cloudy', i: PARTLY };
    if (c === 3) return { t: 'Cloudy', i: CLOUD };
    if (c <= 48) return { t: 'Fog', i: FOG };
    if (c <= 67) return { t: 'Rain', i: RAIN };
    if (c <= 77) return { t: 'Snow', i: SNOW };
    if (c <= 82) return { t: 'Showers', i: RAIN };
    if (c <= 86) return { t: 'Snow', i: SNOW };
    return { t: 'Thunderstorm', i: STORM };
  }

  function deg(n) { return Math.round(n) + '°'; }

  function render(place, cur, daily, hourly) {
    var el = document.getElementById('weather');
    if (!el) return;
    var now = codeInfo(cur.weather_code);
    var html = '<div class="weather-main">' +
      '<div class="weather-icon">' + now.i + '</div>' +
      '<div class="weather-temp">' + deg(cur.temperature_2m) + '</div>' +
      '<div class="weather-meta">' +
        '<div class="weather-place">' + place + '</div>' +
        '<div class="weather-desc">' + now.t + '</div>' +
        '<div class="weather-hl">H:' + deg(daily.temperature_2m_max[0]) + '  L:' + deg(daily.temperature_2m_min[0]) + '</div>' +
      '</div></div>';

    html += '<div class="weather-strip">';
    // next 5 slots, every 2 hours from the current hour
    var start = new Date().getHours();
    for (var k = 0; k < 5; k++) {
      var idx = start + k * 2;
      if (idx >= hourly.time.length) break;
      var hi = codeInfo(hourly.weather_code[idx]);
      var h12 = (idx % 24) % 12 || 12;
      var ap = (idx % 24) < 12 ? 'AM' : 'PM';
      html += '<div class="weather-hour"><span class="h">' + h12 + ap + '</span>' + hi.i +
              '<span class="t">' + deg(hourly.temperature_2m[idx]) + '</span></div>';
    }
    html += '</div>';
    el.innerHTML = html;
  }

  function load(lat, lon, place) {
    var u = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon +
      '&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code' +
      '&daily=temperature_2m_max,temperature_2m_min&temperature_unit=' + UNIT +
      '&timezone=auto&forecast_days=1';
    fetch(u).then(function (r) { return r.json(); }).then(function (d) {
      render(place, d.current, d.daily, d.hourly);
    }).catch(function () {
      var el = document.getElementById('weather');
      if (el) el.innerHTML = '<div class="weather-loading">Weather unavailable</div>';
    });
  }

  function start() {
    if (LAT != null && LON != null) return load(LAT, LON, PLACE || 'Weather');
    // Auto-detect by IP (works on the TV's network; cached for the session)
    fetch('https://ipapi.co/json/').then(function (r) { return r.json(); }).then(function (g) {
      load(g.latitude, g.longitude, g.city || g.region || 'Weather');
    }).catch(function () {
      var el = document.getElementById('weather');
      if (el) el.innerHTML = '<div class="weather-loading">Set your location in js/weather.js</div>';
    });
  }

  if (document.readyState !== 'loading') start();
  else document.addEventListener('DOMContentLoaded', start);
  // Refresh every 30 minutes
  setInterval(start, 30 * 60 * 1000);
})();
