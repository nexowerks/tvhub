package house.hueco.glass;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;

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
        s.setMediaPlaybackRequiresUserGesture(false);
        web.setBackgroundColor(0xFF0B1020);
        web.addJavascriptInterface(new Bridge(), "AndroidLauncher");

        setContentView(web);
        goImmersive();
        web.loadUrl("file:///android_asset/index.html");
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
    private class Bridge {
        @JavascriptInterface
        public boolean launch(String pkg) {
            Intent i = getPackageManager().getLeanbackLaunchIntentForPackage(pkg);
            if (i == null) i = getPackageManager().getLaunchIntentForPackage(pkg);
            if (i == null) { toast("App not installed"); return false; }
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
            return true;
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
