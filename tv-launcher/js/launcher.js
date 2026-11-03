/* Glass Launcher — remote-friendly home screen for LG webOS.
   Written in ES5 so it runs on older webOS (Chromium 38+) as well as current models. */
(function () {
  'use strict';

  // ---------- Config: edit these to customise the dock ----------

  // App IDs are LG's launch IDs. Ones that aren't installed are hidden automatically
  // when the TV lets us list installed apps.
  var FAVORITES = [
    { id: 'netflix', android: 'com.netflix.ninja', name: 'Netflix', letter: 'N', bg: 'linear-gradient(160deg,#e50914,#8a050c)' },
    { id: 'youtube.leanback.v4', android: 'com.google.android.youtube.tv', name: 'YouTube', letter: '▶', bg: 'linear-gradient(160deg,#ff3b30,#c4001d)' },
    { id: 'amazon', android: 'com.amazon.amazonvideo.livingroom', name: 'Prime Video', letter: 'P', bg: 'linear-gradient(160deg,#1fa8ff,#0a5fae)' },
    { id: 'com.disney.disneyplus-prod', android: 'com.disney.disneyplus', name: 'Disney+', letter: 'D+', bg: 'linear-gradient(160deg,#1b3a8f,#0b1748)' },
    { id: 'com.apple.appletv', android: 'com.apple.atve.androidtv.appletv', name: 'Apple TV', letter: 'tv', bg: 'linear-gradient(160deg,#3a3a3c,#111)' },
    { id: 'spotify-beehive', android: 'com.spotify.tv.android', name: 'Spotify', letter: 'S', bg: 'linear-gradient(160deg,#1ed760,#0f8a3c)' },
    { id: 'cdp-30', android: 'com.plexapp.android', name: 'Plex', letter: 'Px', bg: 'linear-gradient(160deg,#ffc230,#d18a00)' }
  ];

  var SYSTEM_APPS = [
    { id: 'com.webos.app.livetv', android: 'com.google.android.tv', name: 'Live TV', icon: 'tv', bg: 'linear-gradient(160deg,#5e5ce6,#3634a3)' },
    { id: 'com.webos.app.browser', android: 'com.phlox.tvwebbrowser', name: 'Browser', icon: 'globe', bg: 'linear-gradient(160deg,#64d2ff,#0a84ff)' },
    { id: 'com.palm.app.settings', android: '__settings__', name: 'Settings', icon: 'gear', bg: 'linear-gradient(160deg,#aeaeb2,#636366)' }
  ];

  var INPUTS = [
    { id: 'com.webos.app.hdmi1', name: 'HDMI 1' },
    { id: 'com.webos.app.hdmi2', name: 'HDMI 2' },
    { id: 'com.webos.app.hdmi3', name: 'HDMI 3' },
    { id: 'com.webos.app.hdmi4', name: 'HDMI 4' }
  ];

  var ICONS = {
    apps: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>',
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

  // Platform detection: Android TV exposes the AndroidLauncher bridge; LG exposes PalmServiceBridge.
  var ANDROID = typeof window.AndroidLauncher !== 'undefined';
  var androidApps = [];
  var appsPage = 0;
  var PAGE_SIZE = 12;

  function launch(app) {
    if (ANDROID) {
      if (app.android === '__apps__') { toggleApps(true); return; }
      if (app.android === '__settings__') { window.AndroidLauncher.openSettings(); return; }
      if (app.android) {
        if (!window.AndroidLauncher.launch(app.android)) toast('Could not open ' + app.name + '. Try refreshing Apps.');
      } else {
        toast(app.name + ' isn’t available on this TV');
      }
      return;
    }
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
    var width = document.documentElement.clientWidth || window.innerWidth;
    var height = document.documentElement.clientHeight || window.innerHeight;
    var scale = Math.min(width / 1920, height / 1080);
    stage.style.transform = 'scale(' + scale + ')';
    stage.style.left = (width - 1920 * scale) / 2 + 'px';
    stage.style.top = (height - 1080 * scale) / 2 + 'px';
  }

  function makeApp(app) {
    var el = document.createElement('button');
    el.className = 'app focusable';
    el.style.background = app.bg || 'linear-gradient(160deg,#48484a,#1c1c1e)';
    var logo = window.LOGOS && window.LOGOS[app.id];
    if (!app.image && !logo && ANDROID && app.android.charAt(0) !== '_') {
      try { app.image = window.AndroidLauncher.getAppIcon(app.android); } catch (e) {}
    }
    if (app.image) {
      var img = document.createElement('img');
      img.src = app.image;
      img.alt = '';
      el.appendChild(img);
    }
    else if (logo) { el.innerHTML = logo; el.classList.add('has-logo'); }
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
    el.innerHTML = ICONS[icon] || '';
    var label = document.createElement('span');
    label.textContent = name;
    el.appendChild(label);
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
    var system = ANDROID ? [
      { android: '__apps__', name: 'Apps', icon: 'apps', bg: 'linear-gradient(150deg,#6489ee,#5841ad)' },
      SYSTEM_APPS[2]
    ] : SYSTEM_APPS;
    system.forEach(function (app) { dock.appendChild(makeApp(app)); });
  }

  function renderInputs() {
    var grid = $('input-grid');
    INPUTS.forEach(function (input) {
      grid.appendChild(makeTile(input.name, 'hdmi', function () { launch(input); }));
    });
  }

  function renderControlCenter() {
    var grid = $('cc-grid');
    if (ANDROID) {
      grid.appendChild(makeTile('Apps', 'apps', function () { toggleControlCenter(false); toggleApps(true); }));
      grid.appendChild(makeTile('Settings', 'gear', function () { window.AndroidLauncher.openSettings(); }));
      grid.appendChild(makeTile('Home screen', 'tv', function () { window.AndroidLauncher.openHomeSettings(); }));
      var fix = makeTile('Home button fix', 'tv', function () {
        window.AndroidLauncher.openHomeButtonSettings();
      });
      fix.id = 'home-button-fix';
      grid.appendChild(fix);
      var hint = document.createElement('p');
      hint.className = 'cc-hint';
      hint.textContent = 'Home still opens the TV menu? Enable Glass Home button in Accessibility. Turn it off there to undo.';
      grid.appendChild(hint);
      grid.appendChild(makeTile('Refresh apps', 'apps', function () { loadAndroidApps(); toast('Apps refreshed'); }));
      updateHomeButtonStatus();
      return;
    }
    grid.appendChild(makeTile('Live TV', 'tv', function () { launch(SYSTEM_APPS[0]); }));
    grid.appendChild(makeTile('Browser', 'globe', function () { launch(SYSTEM_APPS[1]); }));
    grid.appendChild(makeTile('Settings', 'gear', function () { launch(SYSTEM_APPS[2]); }));
    grid.appendChild(makeTile('Animations', 'motion', function () {
      var off = document.body.classList.toggle('reduce-motion');
      try { localStorage.setItem('reduceMotion', off ? '1' : '0'); } catch (e) {}
      toast(off ? 'Animations off' : 'Animations on');
    }));
  }

  function updateHomeButtonStatus() {
    var button = $('home-button-fix');
    if (!ANDROID || !button) return;
    try {
      var on = window.AndroidLauncher.isHomeButtonFixEnabled();
      button.querySelector('span').textContent = 'Home button: ' + (on ? 'On' : 'Off');
      button._label = 'Home button: ' + (on ? 'On' : 'Off');
    } catch (e) { /* Older preview bridge. */ }
  }

  // Build the dock from actual launchable packages; never leave missing placeholders.
  function loadAndroidApps() {
    try {
      androidApps = JSON.parse(window.AndroidLauncher.getApps());
      if (!Array.isArray(androidApps)) throw new Error('Invalid app list');
      androidApps = androidApps.filter(function (app) {
        return app && typeof app.android === 'string' && typeof app.name === 'string';
      });
    } catch (e) {
      androidApps = [];
      toast('Could not read apps. Open Settings or try Refresh apps.');
    }
    var installed = [];
    var used = {};
    FAVORITES.forEach(function (favorite) {
      var match = null;
      androidApps.some(function (app) {
        // OEM/preloaded variants can have a different package but the same label.
        var sameName = app.name.toLowerCase().replace(/[^a-z0-9]/g, '') ===
          favorite.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!used[app.android] && (app.android === favorite.android || sameName)) { match = app; return true; }
        return false;
      });
      if (match) {
        installed.push({ id: favorite.id, android: match.android, name: match.name, bg: favorite.bg });
        used[match.android] = true;
      }
    });
    androidApps.forEach(function (app) {
      if (installed.length < 7 && !used[app.android]) { installed.push(app); used[app.android] = true; }
    });
    renderDock(installed);
    setFocus(document.querySelector('#dock .app'));
  }

  function renderAppsPage() {
    var grid = $('apps-grid');
    var pages = $('apps-pages');
    grid.innerHTML = '';
    pages.innerHTML = '';
    var count = Math.max(1, Math.ceil(androidApps.length / PAGE_SIZE));
    appsPage = Math.max(0, Math.min(appsPage, count - 1));
    $('apps-page').textContent = androidApps.length + ' apps · ' + (appsPage + 1) + ' / ' + count;
    androidApps.slice(appsPage * PAGE_SIZE, (appsPage + 1) * PAGE_SIZE).forEach(function (app) {
      var button = makeApp(app);
      button.classList.add('app-card');
      var label = document.createElement('span');
      label.className = 'app-card-label';
      label.textContent = app.name;
      button.appendChild(label);
      grid.appendChild(button);
    });
    if (!androidApps.length) {
      var message = document.createElement('p');
      message.textContent = 'No apps found. Use Refresh apps in Control Center.';
      grid.appendChild(message);
    }
    if (appsPage > 0) pages.appendChild(makeTile('Previous', 'apps', function () { appsPage--; renderAppsPage(); }));
    if (appsPage + 1 < count) pages.appendChild(makeTile('Next', 'apps', function () { appsPage++; renderAppsPage(); }));
    pages.appendChild(makeTile('Back to Home', 'tv', function () { toggleApps(false); }));
    setFocus(grid.querySelector('.focusable') || pages.querySelector('.focusable'));
  }

  function toggleApps(open) {
    var panel = $('apps-panel');
    panel.classList.toggle('open', open);
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) { toggleControlCenter(false); renderAppsPage(); }
    else setFocus(document.querySelector('#dock .app'));
  }

  // Use the TV's installed-app list (when permitted) to hide missing apps and show real icons.
  function loadInstalledApps() {
    if (ANDROID) return loadAndroidApps();
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
    if ($('apps-panel').classList.contains('open')) return $('apps-panel');
    return cc.classList.contains('open') ? cc : $('stage');
  }

  function focusables() {
    var layer = activeLayer();
    var all = layer.querySelectorAll('.focusable');
    var list = [];
    for (var i = 0; i < all.length; i++) {
      if (layer !== stage || (!cc.contains(all[i]) && !$('apps-panel').contains(all[i]))) list.push(all[i]);
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
    if (el.classList.contains('app') && !el.classList.contains('app-card')) {
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
        if ($('apps-panel').classList.contains('open')) toggleApps(false);
        else if (cc.classList.contains('open')) toggleControlCenter(false);
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

  // Android's hardware Back button calls this (see MainActivity). Return true if we handled it.
  window.__glassBack = function () {
    if ($('apps-panel').classList.contains('open')) { toggleApps(false); return true; }
    if (cc.classList.contains('open')) { toggleControlCenter(false); return true; }
    var dockApp = document.querySelector('#dock .app.focused');
    if (!dockApp) { setFocus(document.querySelector('#dock .app')); return true; }
    return false; // already on the dock — let the system decide (stays on Home)
  };

  window.__glassHome = function () {
    toggleApps(false);
    if (cc.classList.contains('open')) toggleControlCenter(false);
    setFocus(document.querySelector('#dock .app'));
  };

  // ---------- Start ----------

  try { if (localStorage.getItem('reduceMotion') === '1') document.body.classList.add('reduce-motion'); } catch (e) {}

  // A browser-based app can't switch TV inputs on Android TV, so hide that widget there.
  if (ANDROID) {
    document.body.classList.add('android');
    var iw = document.querySelector('.inputs-widget');
    if (iw) iw.style.display = 'none';
  }

  fitStage();
  window.addEventListener('resize', fitStage);
  renderDock(ANDROID ? [] : FAVORITES);
  if (!ANDROID) renderInputs();
  renderControlCenter();
  tick();
  setInterval(tick, 30000);
  setFocus(document.querySelector('#dock .app'));
  loadInstalledApps();
  window.__glassResume = function () {
    fitStage();
    tick();
    updateHomeButtonStatus();
    if (ANDROID) {
      var drawerOpen = $('apps-panel').classList.contains('open');
      loadAndroidApps();
      if (drawerOpen) renderAppsPage();
      else if (cc.classList.contains('open')) setFocus(cc.querySelector('.focusable'));
    }
  };
})();
