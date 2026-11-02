# Glass Launcher — Android TV / Google TV

A thin native wrapper around the shared web UI in [`../tv-launcher/`](../tv-launcher/).
It hosts the UI in a full-screen WebView and bridges the dock to Android so it can launch
installed apps and (optionally) act as the Home screen.

## You don't build this by hand

On every push to `main`, GitHub Actions builds the APK and attaches it to the
**android-latest** release and to the run's artifacts. Download it there and install with
`adb` — see [`../tv-launcher/README.md`](../tv-launcher/README.md#install-on-android-tv--google-tv).

## Building locally (optional)

Needs the Android SDK (compileSdk 34). From this folder:

```sh
gradle assembleDebug          # or: ./gradlew assembleDebug if you add a wrapper
# APK: app/build/outputs/apk/debug/app-debug.apk
```

## How it works

- `app/src/main/assets/` holds a copy of the web UI (CI re-syncs it from `tv-launcher/`).
- `MainActivity.java` exposes `window.AndroidLauncher` to the page:
  `launch(pkg)`, `isInstalled(pkg)`, `openSettings()`, `platform()`.
- `launcher.js` detects that bridge and routes dock taps to Android intents; on LG it uses
  the webOS luna bus instead.
- Package names for each app live in `FAVORITES` / `SYSTEM_APPS` in `tv-launcher/js/launcher.js`.
