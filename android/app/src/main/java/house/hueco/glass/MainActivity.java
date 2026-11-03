package house.hueco.glass;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.Intent;
import android.content.ComponentName;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.os.Bundle;
import android.util.Base64;
import android.view.View;
import android.view.accessibility.AccessibilityManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Glass Launcher for Android TV / Google TV (Philips and others).
 *
 * The whole UI is the bundled web app in assets/. This activity hosts it in a full-screen
 * WebView and exposes a small bridge (window.AndroidLauncher) so the dock can launch real
 * Android apps by package name. Declared as a HOME app in the manifest so it can optionally
 * replace the TV's home screen.
 */
public class MainActivity extends Activity {

    private WebView web;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        // Honor the viewport rather than enlarging the 1920px design canvas.
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setTextZoom(100);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        web.setBackgroundColor(0xFF0B1020);
        web.addJavascriptInterface(new Bridge(), "AndroidLauncher");

        setContentView(web);
        goImmersive();
        web.loadUrl("file:///android_asset/index.html");
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) {
            web.onResume();
            web.resumeTimers();
            web.evaluateJavascript("window.__glassResume && window.__glassResume()", null);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (web != null) web.evaluateJavascript("window.__glassHome && window.__glassHome()", null);
    }

    @Override
    protected void onPause() {
        if (web != null) {
            web.onPause();
            web.pauseTimers();
        }
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.removeJavascriptInterface("AndroidLauncher");
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }

    private void goImmersive() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) goImmersive();
    }

    /** Let the web app handle Back itself; don't exit to a blank home. */
    @Override
    public void onBackPressed() {
        web.evaluateJavascript(
            "(window.__glassBack && window.__glassBack()) ? 'h' : 'x'",
            value -> { /* handled in JS */ });
    }

    private void toast(final String msg) {
        runOnUiThread(() -> Toast.makeText(MainActivity.this, msg, Toast.LENGTH_SHORT).show());
    }

    /** JS-facing bridge. Methods here are callable as window.AndroidLauncher.* */
    public final class Bridge {
        private final Map<String, String> icons = new HashMap<>();

        private List<ResolveInfo> launchableApps() {
            PackageManager pm = getPackageManager();
            Map<String, ResolveInfo> apps = new LinkedHashMap<>();
            // Prefer TV activities, then include ordinary launcher activities.
            for (String category : new String[] {
                    Intent.CATEGORY_LEANBACK_LAUNCHER, Intent.CATEGORY_LAUNCHER }) {
                Intent query = new Intent(Intent.ACTION_MAIN).addCategory(category);
                for (ResolveInfo info : pm.queryIntentActivities(query, 0)) {
                    String pkg = info.activityInfo.packageName;
                    if (!pkg.equals(getPackageName()) && info.activityInfo.exported
                            && !apps.containsKey(pkg)) apps.put(pkg, info);
                }
            }
            List<ResolveInfo> result = new ArrayList<>(apps.values());
            Collections.sort(result, new Comparator<ResolveInfo>() {
                @Override
                public int compare(ResolveInfo first, ResolveInfo second) {
                    return first.loadLabel(pm).toString().compareToIgnoreCase(second.loadLabel(pm).toString());
                }
            });
            return result;
        }

        @JavascriptInterface
        public String getApps() {
            JSONArray apps = new JSONArray();
            PackageManager pm = getPackageManager();
            for (ResolveInfo info : launchableApps()) {
                try {
                    JSONObject app = new JSONObject();
                    app.put("android", info.activityInfo.packageName);
                    app.put("name", info.loadLabel(pm).toString());
                    apps.put(app);
                } catch (Exception ignored) { /* Skip a malformed entry. */ }
            }
            return apps.toString();
        }

        @JavascriptInterface
        public String getAppIcon(String pkg) {
            if (icons.containsKey(pkg)) return icons.get(pkg);
            try {
                Drawable drawable = getPackageManager().getApplicationIcon(pkg);
                Bitmap bitmap = Bitmap.createBitmap(96, 96, Bitmap.Config.ARGB_8888);
                drawable.setBounds(0, 0, 96, 96);
                drawable.draw(new Canvas(bitmap));
                ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                bitmap.compress(Bitmap.CompressFormat.PNG, 100, bytes);
                bitmap.recycle();
                String data = "data:image/png;base64," + Base64.encodeToString(bytes.toByteArray(), Base64.NO_WRAP);
                if (icons.size() < 128) icons.put(pkg, data);
                return data;
            } catch (Exception ignored) { return ""; }
        }

        @JavascriptInterface
        public boolean launch(String pkg) {
            try {
                Intent i = getPackageManager().getLeanbackLaunchIntentForPackage(pkg);
                if (i == null) i = getPackageManager().getLaunchIntentForPackage(pkg);
                if (i == null) {
                    for (ResolveInfo info : launchableApps()) {
                        if (pkg.equals(info.activityInfo.packageName)) {
                            i = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
                                .setComponent(new ComponentName(pkg, info.activityInfo.name));
                            break;
                        }
                    }
                }
                if (i == null) return false;
                startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                return true;
            } catch (Exception e) {
                toast("Android could not open this app");
                return false;
            }
        }

        @JavascriptInterface
        public void openHomeSettings() {
            try {
                startActivity(new Intent(android.provider.Settings.ACTION_HOME_SETTINGS));
            } catch (Exception e) {
                toast("Look for Default apps / Home app in Settings");
                openSettings();
            }
        }

        @JavascriptInterface
        public boolean isHomeButtonFixEnabled() {
            AccessibilityManager manager = (AccessibilityManager) getSystemService(ACCESSIBILITY_SERVICE);
            if (manager == null) return false;
            for (AccessibilityServiceInfo info : manager.getEnabledAccessibilityServiceList(
                    AccessibilityServiceInfo.FEEDBACK_ALL_MASK)) {
                android.content.pm.ServiceInfo service = info.getResolveInfo().serviceInfo;
                if (getPackageName().equals(service.packageName)
                        && HomeButtonService.class.getName().equals(service.name)) return true;
            }
            return false;
        }

        @JavascriptInterface
        public void openHomeButtonSettings() {
            runOnUiThread(() -> {
                try {
                    startActivity(new Intent(android.provider.Settings.ACTION_ACCESSIBILITY_SETTINGS));
                    toast("Choose Glass Home button and switch it on");
                } catch (RuntimeException e) { toast("Open Settings, then Accessibility, then Glass Home button"); }
            });
        }

        /** Open Android TV system settings (used by Control Center). */
        @JavascriptInterface
        public void openSettings() {
            try {
                startActivity(new Intent(android.provider.Settings.ACTION_SETTINGS)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            } catch (Exception e) { toast("Settings unavailable"); }
        }

        /** True if a package is installed, so the dock can hide missing apps. */
        @JavascriptInterface
        public boolean isInstalled(String pkg) {
            try { getPackageManager().getPackageInfo(pkg, 0); return true; }
            catch (Exception e) { return false; }
        }

        @JavascriptInterface
        public String platform() { return "androidtv"; }
    }
}
