package house.hueco.glass;

import java.util.HashSet;
import java.util.Set;

/** Limits the fallback to known Home activities, never an entire app or Settings. */
final class HomeButtonPolicy {
    private final Set<String> homes = new HashSet<>();
    private final String ownPackage;
    private long lastLaunch = -1000;

    HomeButtonPolicy(String ownPackage) { this.ownPackage = ownPackage; }

    void addHome(String pkg, String activity) {
        if (pkg == null || activity == null || pkg.equals(ownPackage) || pkg.equals("android")) return;
        homes.add(key(pkg, activity));
    }

    boolean isOtherHome(String pkg, String activity) {
        return pkg != null && activity != null && homes.contains(key(pkg, activity));
    }

    boolean canLaunch(long now) { return now - lastLaunch >= 800; }

    void launched(long now) { lastLaunch = now; }

    private static String key(String pkg, String activity) {
        return pkg + "/" + (activity.startsWith(".") ? pkg + activity : activity);
    }
}
