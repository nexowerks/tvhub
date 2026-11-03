package house.hueco.glass;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.content.Intent;
import android.content.pm.ResolveInfo;
import android.os.SystemClock;
import android.view.KeyEvent;
import android.view.accessibility.AccessibilityEvent;
import java.util.HashSet;
import java.util.Set;

/** Optional, user-enabled Home routing for TVs that ignore the default Home setting. */
public final class HomeButtonService extends AccessibilityService {
    private HomeButtonPolicy policy;
    private boolean handledHomeDown;

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        policy = new HomeButtonPolicy(getPackageName());
        Set<String> packages = new HashSet<>();
        Intent home = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME);
        for (ResolveInfo info : getPackageManager().queryIntentActivities(home, 0)) {
            String pkg = info.activityInfo.packageName;
            if (pkg.equals(getPackageName()) || pkg.equals("android")) continue;
            packages.add(pkg);
            policy.addHome(pkg, info.activityInfo.name);
            policy.addHome(pkg, info.activityInfo.targetActivity);
        }
        AccessibilityServiceInfo config = getServiceInfo();
        // Only window-state events from actual Home packages; no screen-content access.
        config.packageNames = packages.isEmpty()
            ? new String[] { getPackageName() } : packages.toArray(new String[0]);
        config.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED;
        config.flags |= AccessibilityServiceInfo.FLAG_REQUEST_FILTER_KEY_EVENTS;
        setServiceInfo(config);
    }

    @Override
    protected boolean onKeyEvent(KeyEvent event) {
        if (event.getKeyCode() != KeyEvent.KEYCODE_HOME || policy == null) return false;
        if (event.getAction() == KeyEvent.ACTION_DOWN && event.getRepeatCount() == 0) {
            handledHomeDown = openGlass();
            return handledHomeDown;
        }
        if (event.getAction() == KeyEvent.ACTION_UP) {
            boolean handled = handledHomeDown;
            handledHomeDown = false;
            return handled;
        }
        return handledHomeDown;
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (policy == null || event == null
                || event.getEventType() != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return;
        CharSequence pkg = event.getPackageName();
        CharSequence activity = event.getClassName();
        if (pkg != null && activity != null && policy.isOtherHome(pkg.toString(), activity.toString())) {
            openGlass();
        }
    }

    private boolean openGlass() {
        long now = SystemClock.elapsedRealtime();
        if (!policy.canLaunch(now)) return true;
        try {
            startActivity(new Intent(this, MainActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP
                    | Intent.FLAG_ACTIVITY_SINGLE_TOP));
            policy.launched(now);
            return true;
        } catch (RuntimeException e) {
            // Preserve the normal Home route when launching fails.
            return false;
        }
    }

    @Override
    public void onInterrupt() { handledHomeDown = false; }
}
