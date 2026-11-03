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
- Favorite styling lives in `FAVORITES` in `tv-launcher/js/launcher.js`; Android's
  PackageManager supplies the actual installed packages and labels.

## Android TV 1.1.0

- Fits the 1920×1080 design to the actual WebView viewport and uses a fixed text scale.
- Discovers real TV and standard launcher activities; an Apps panel includes all discovered
  launchable apps, with paginated remote navigation and native icons.
- Matches favorite logos to installed packages or labels and omits missing shortcuts.
- Uses a static gradient wallpaper and unblurred glass on Android; pauses WebView timers
  while another app is in the foreground. These reduce launcher work, not other apps' work.
- Control Center → Home screen opens Android's home selection settings if supported.
  Some TV firmware does not expose a home picker; stock launcher packages are never disabled.

CI builds are signed with a development key. The workflow caches the debug keystore
between runs, but a deleted or expired cache creates a new identity. Upgrading from 1.0.0
may require uninstalling Glass first if Android reports a signature conflict. Stable
production distribution needs a separately managed private signing key.
