# Glass Launcher

A macOS-inspired "liquid glass" home screen for smart TVs: frosted-glass menu bar,
a live weather widget, a clock, a magnifying dock with real app logos, and a Control
Center panel. Driven by the TV remote.

![Preview](preview-dock.png)

**Two builds share this one web UI:**
- **Android TV / Google TV** (Philips, Sony, TCL, etc.) — see [`../android/`](../android/)
  and **[Android TV install](#install-on-android-tv--google-tv)** below. This is the build
  for Philips 4K TVs.
- **LG webOS** — the rest of this page.

---

## Install on Android TV / Google TV

You don't build anything yourself. GitHub builds the APK for you:

1. On GitHub, open the repo's **Releases** → **Glass Launcher (Android TV) — latest** and
   download `glass-launcher-androidtv.apk`. (Or **Actions** → latest "Build Android TV APK"
   run → **Artifacts**.)
2. On the TV: **Settings → System → About → Build** and click it ~7 times to unlock
   **Developer options**, then turn on **USB/Network debugging**. Note the TV's IP
   (Settings → Network → shows it; e.g. `192.168.1.203`).
3. From a computer on the same Wi-Fi (needs the `adb` tool, part of Android platform-tools):
   ```sh
   adb connect 192.168.1.203:5555
   adb install -r glass-launcher-androidtv.apk
   ```
   The first `adb connect` pops an "Allow debugging?" box on the TV — approve it.
4. **Glass** now appears in your Apps row. Open it. To make it your Home screen, press the
   remote's **Home** button once and pick **Glass** as the default launcher (you can switch
   back anytime in Settings → Apps → Default apps → Home app).

On Android TV the dock launches installed apps (Netflix, YouTube, Prime, etc.) and hides any
you don't have. The HDMI-input tiles are hidden there because an app can't switch inputs on
Android TV — use the remote's Input button for that.

---

## Install on LG webOS

## Preview in a browser

Open `index.html` in Chrome. Use the arrow keys to move, Enter to select, and Esc for Back.
In the browser, launching an app shows a "Would open …" message instead of opening it.

A ready-built package is in [`../dist/`](../dist/) — `house.hueco.glasslauncher_1.0.0_all.ipk`.
You only need `ares-install` to put it on the TV; you don't have to build it yourself.

1. On the TV, install **Developer Mode** from the LG Content Store. Sign in with a free
   LG developer account (https://webostv.developer.lge.com), then turn on **Dev Mode Status**
   and **Key Server**. Note the TV's IP address and the passphrase it shows.
2. On a computer on the same Wi-Fi network:
   ```sh
   npm install -g @webos-tools/cli
   ares-setup-device                          # add the TV: name "tv", its IP, port 9922
   ares-novacom --device tv --getkey          # enter the passphrase shown on the TV
   ares-install --device tv dist/house.hueco.glasslauncher_1.0.0_all.ipk
   ares-launch --device tv house.hueco.glasslauncher
   ```
   To rebuild after editing files: `ares-package tv-launcher --outdir dist`
3. The app appears as **Glass** in your app list. Pin it first in the LG home bar so it's
   one click from the remote's Home button.

Dev Mode installs expire after 50 hours unless you renew the session in the Developer Mode app.

## Customise

- **Dock apps:** edit `FAVORITES` in `js/launcher.js`. List your TV's app IDs with
  `ares-install --device tv --list`. The launcher hides apps you don't have and swaps in
  the TV's real icons where the firmware allows it; otherwise it uses the built-in logos
  in `js/logos.js`.
- **Weather location:** by default it auto-detects by IP. To pin a city, set `LAT`, `LON`
  and `UNIT` at the top of `js/weather.js`.
- **Wallpaper colours:** the `.b1`–`.b4` blobs in `css/glass.css`.
- **Glass strength:** the `backdrop-filter` and `--glass-fill` settings in `css/glass.css`.

## Limits

- This is an app that runs on top of webOS. It doesn't replace LG's own home screen. To make it
  open automatically at power-on, the TV must be rooted (webOS Homebrew Channel). Rooting
  depends on your model and firmware and isn't required to use the app.
- On older TVs (webOS 4.x and earlier) without blur support, the glass falls back to solid
  frosted panels. If animations stutter, turn them off under Control Center → Animations.
- The weather widget needs the TV to have internet access (it calls the free open-meteo.com
  API, no key required). If it's offline it shows "Weather unavailable".
- Some firmware blocks apps from listing installed apps. In that case the dock shows the
  default list from `FAVORITES`.
