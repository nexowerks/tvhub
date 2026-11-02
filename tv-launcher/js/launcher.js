/* Glass Launcher — remote-friendly home screen for LG webOS.
   Written in ES5 so it runs on older webOS (Chromium 38+) as well as current models. */
(function () {
  'use strict';

  // ---------- Config: edit these to customise the dock ----------

  // App IDs are LG's launch IDs. Ones that aren't installed are hidden automatically
  // when the TV lets us list installed apps.
  var FAVORITES = [
    { id: 'netflix', name: 'Netflix', letter: 'N', bg: 'linear-gradient(160deg,#e50914,#8a050c)' },
    { id: 'youtube.leanback.v4', name: 'YouTube', letter: '▶', bg: 'linear-gradient(160deg,#ff3b30,#c4001d)' },
    { id: 'amazon', name: 'Prime Video', letter: 'P', bg: 'linear-gradient(160deg,#1fa8ff,#0a5fae)' },
    { id: 'com.disney.disneyplus-prod', name: 'Disney+', letter: 'D+', bg: 'linear-gradient(160deg,#1b3a8f,#0b1748)' },
    { id: 'com.apple.appletv', name: 'Apple TV', letter: 'tv', bg: 'linear-gradient(160deg,#3a3a3c,#111)' },
    { id: 'spotify-beehive', name: 'Spotify', letter: 'S', bg: 'linear-gradient(160deg,#1ed760,#0f8a3c)' },
    { id: 'cdp-30', name: 'Plex', letter: 'Px', bg: 'linear-gradient(160deg,#ffc230,#d18a00)' }
  ];

  var SYSTEM_APPS = [
    { id: 'com.webos.app.livetv', name: 'Live TV', icon: 'tv', bg: 'linear-gradient(160deg,#5e5ce6,#3634a3)' },
    { id: 'com.webos.app.browser', name: 'Browser', icon: 'globe', bg: 'linear-gradient(160deg,#64d2ff,#0a84ff)' },
    { id: 'com.palm.app.settings', name: 'Settings', icon: 'gear', bg: 'linear-gradient(160deg,#aeaeb2,#636366)' }
  ];

  var INPUTS = [
    { id: 'com.webos.app.hdmi1', name: 'HDMI 1' },
    { id: 'com.webos.app.hdmi2', name: 'HDMI 2' },
    { id: 'com.webos.app.hdmi3', name: 'HDMI 3' },
    { id: 'com.webos.app.hdmi4', name: 'HDMI 4' }
  ];

  var ICONS = {
    tv: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    globe: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>',
    hdmi: '<svg viewBox="0 0 24 24"><path d="M3 8h18v5l-3 3H6l-3-3z"/><path d="M8 11h8"/></svg>',
    motion: '<svg viewBox="0 0 24 24"><path d="M3 12c3-6 6 6 9 0s6 6 9 0"/></svg>'
  };

  var KEY = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13, BACK: 461, ESC: 27, BACKSPACE: 8 };

  // ---------- webOS service bridge ----------

  var bridges = []; // keep references so callbacks aren't garbage collected

  function luna(uri, params, done) {
    if (typeof window.PalmServiceBridge === 'undefined') {
      // Running in a normal browser (preview mode)
      if (done) done({ returnValue: false, preview: true });
      return;
    }
    var bridge = new window.PalmServiceBridge();
    bridges.push(bridge);
    bridge.onservicecallback = function (msg) {
      bridges.splice(bridges.indexOf(bridge), 1);
      var res;
      try { res = JSON.parse(msg); } catch (e) { res = { returnValue: false }; }
      if (done) done(res);
    };
    bridge.call(uri, JSON.stringify(params || {}));
  }

  function launch(app) {
    luna('luna://com.webos.applicationManager/launch', { id: app.id }, function (res) {
      if (res.preview) toast('Would open ' + app.name);
      else if (!res.returnValue) toast(app.name + ' isn’t available');
    });
  }

  // ---------- DOM helpers ----------

  var $ = function (id) { return document.getElementById(id); };
  var stage = $('stage');
  var toastTimer;

  function toast(text) {
    var el = $('toast');
    el.textContent = text;
    el.className = 'toast glass show';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.className = 'toast glass'; }, 2200);
  }

  function fitStage() {
    var scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.transform = 'scale(' + scale + ')';
    stage.style.left = (window.innerWidth - 1920 * scale) / 2 + 'px';
    stage.style.top = (window.innerHeight - 1080 * scale) / 2 + 'px';
  }

  function makeApp(app) {
    var el = document.createElement('button');
    el.className = 'app focusable';
    el.style.background = app.bg || 'linear-gradient(160deg,#48484a,#1c1c1e)';
    if (app.image) el.innerHTML = '<img src="' + app.image + '" alt="">';
    else if (app.icon) el.innerHTML = ICONS[app.icon];
    else el.textContent = app.letter || app.name.charAt(0);
    el.setAttribute('aria-label', app.name);
    el._label = app.name;
    el._activate = function () { launch(app); };
    return el;
  }

  function makeTile(name, icon, onActivate) {
    var el = document.createElement('button');
    el.className = 'tile focusable';
    el.innerHTML = ICONS[icon] + '<span>' + name + '</span>';
    el._label = name;
    el._activate = onActivate;
    return el;
  }

  // ---------- Build UI ----------

  function renderDock(favorites) {
    var dock = $('dock');
    dock.innerHTML = '';
    favorites.forEach(function (app) { dock.appendChild(makeApp(app)); });
    var sep = document.createElement('div');
    sep.className = 'dock-sep';
    dock.appendChild(sep);
    SYSTEM_APPS.forEach(function (app) { dock.appendChild(makeApp(app)); });
  }

  function renderInputs() {
    var grid = $('input-grid');
    INPUTS.forEach(function (input) {
      grid.appendChild(makeTile(input.name, 'hdmi', function () { launch(input); }));
    });
  }

  function renderControlCenter() {
    var grid = $('cc-grid');
    grid.appendChild(makeTile('Live TV', 'tv', function () { launch(SYSTEM_APPS[0]); }));
    grid.appendChild(makeTile('Browser', 'globe', function () { launch(SYSTEM_APPS[1]); }));
    grid.appendChild(makeTile('Settings', 'gear', function () { launch(SYSTEM_APPS[2]); }));
    grid.appendChild(makeTile('Animations', 'motion', function () {
      var off = document.body.classList.toggle('reduce-motion');
      try { localStorage.setItem('reduceMotion', off ? '1' : '0'); } catch (e) {}
      toast(off ? 'Animations off' : 'Animations on');
    }));
  }

  // Use the TV's installed-app list (when permitted) to hide missing apps and show real icons.
  function loadInstalledApps() {
    luna('luna://com.webos.applicationManager/listLaunchPoints', {}, function (res) {
      if (!res.returnValue || !res.launchPoints) return;
      var byId = {};
      res.launchPoints.forEach(function (lp) { byId[lp.id] = lp; });
      var installed = FAVORITES.filter(function (app) { return byId[app.id]; }).map(function (app) {
        var lp = byId[app.id];
        var copy = {};
        for (var k in app) copy[k] = app[k];
        if (lp.largeIcon || lp.icon) copy.image = lp.largeIcon || lp.icon;
        if (lp.bgColor) copy.bg = lp.bgColor;
        return copy;
      });
      renderDock(installed);
      setFocus(document.querySelector('#dock .app'));
    });
  }

  // ---------- Clock ----------

  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function tick() {
    var d = new Date();
    var h = d.getHours() % 12 || 12;
    var m = ('0' + d.getMinutes()).slice(-2);
    $('big-time').textContent = h + ':' + m;
    $('big-date').textContent = DAYS[d.getDay()] + ', ' + MONTHS[d.getMonth()] + ' ' + d.getDate();
    $('menu-clock').textContent = DAYS[d.getDay()].slice(0, 3) + ' ' + MONTHS[d.getMonth()].slice(0, 3) + ' ' + d.getDate() + '  ' + h + ':' + m + (d.getHours() < 12 ? ' AM' : ' PM');
  }

  // ---------- Focus & spatial navigation ----------

  var current = null;
  var cc = $('control-center');

  function activeLayer() {
    return cc.classList.contains('open') ? cc : $('stage');
  }

  function focusables() {
    var layer = activeLayer();
    var all = layer.querySelectorAll('.focusable');
    var list = [];
    for (var i = 0; i < all.length; i++) {
      if (layer === cc || !cc.contains(all[i])) list.push(all[i]);
    }
    return list;
  }

  function center(el) {
    var r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function setFocus(el) {
    if (!el) return;
    var prev = document.querySelectorAll('.focused, .near');
    for (var i = 0; i < prev.length; i++) prev[i].classList.remove('focused', 'near');
    current = el;
    el.classList.add('focused');

    var label = $('dock-label');
    if (el.classList.contains('app')) {
      // Magnify neighbours too, like the macOS dock
      var a = el.previousElementSibling, b = el.nextElementSibling;
      if (a && a.classList.contains('app')) a.classList.add('near');
      if (b && b.classList.contains('app')) b.classList.add('near');
      label.textContent = el._label;
      label.className = 'dock-label show';
      // Float the label above the icon (stage coordinates, before magnification)
      label.style.left = (el.offsetLeft + el.offsetWidth / 2 + el.parentNode.offsetLeft) + 'px';
      $('active-title').textContent = el._label;
    } else {
      label.className = 'dock-label';
      $('active-title').textContent = 'Home';
    }
  }

  function move(dir) {
    if (!current) return setFocus(focusables()[0]);
    // Measure without the magnification transform so geometry is stable
    var from = center(current);
    var best = null, bestScore = Infinity;
    focusables().forEach(function (el) {
      if (el === current) return;
      var c = center(el);
      var dx = c.x - from.x, dy = c.y - from.y;
      var along, across;
      if (dir === 'left') { along = -dx; across = dy; }
      else if (dir === 'right') { along = dx; across = dy; }
      else if (dir === 'up') { along = -dy; across = dx; }
      else { along = dy; across = dx; }
      if (along <= 1) return;
      var score = along + Math.abs(across) * 2.5;
      if (score < bestScore) { bestScore = score; best = el; }
    });
    if (best) setFocus(best);
  }

  function toggleControlCenter(open) {
    if (open === undefined) open = !cc.classList.contains('open');
    cc.classList.toggle('open', open);
    cc.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) setFocus(cc.querySelector('.focusable'));
    else setFocus(document.querySelector('[data-action="control-center"]'));
  }

  function activate(el) {
    if (!el) return;
    if (el.getAttribute('data-action') === 'control-center') return toggleControlCenter();
    if (el._activate) el._activate();
  }

  document.addEventListener('keydown', function (e) {
    switch (e.keyCode) {
      case KEY.LEFT: move('left'); break;
      case KEY.RIGHT: move('right'); break;
      case KEY.UP: move('up'); break;
      case KEY.DOWN: move('down'); break;
      case KEY.ENTER: activate(current); break;
      case KEY.BACK: case KEY.ESC: case KEY.BACKSPACE:
        if (cc.classList.contains('open')) toggleControlCenter(false);
        else setFocus(document.querySelector('#dock .app'));
        break;
      default: return;
    }
    e.preventDefault();
  });

  // Magic Remote pointer support
  document.addEventListener('mouseover', function (e) {
    var el = e.target.closest ? e.target.closest('.focusable') : null;
    if (el && el !== current && focusables().indexOf(el) !== -1) setFocus(el);
  });
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('.focusable') : null;
    if (el) activate(el);
    else if (cc.classList.contains('open') && !cc.contains(e.target)) toggleControlCenter(false);
  });

  // ---------- Start ----------

  try { if (localStorage.getItem('reduceMotion') === '1') document.body.classList.add('reduce-motion'); } catch (e) {}

  fitStage();
  window.addEventListener('resize', fitStage);
  renderDock(FAVORITES);
  renderInputs();
  renderControlCenter();
  tick();
  setInterval(tick, 10000);
  setFocus(document.querySelector('#dock .app'));
  loadInstalledApps();
})();
