package house.hueco.glass;

public final class HomeButtonPolicyTest {
    public static void main(String[] args) {
        HomeButtonPolicy policy = new HomeButtonPolicy("house.hueco.glass");
        policy.addHome("vendor.launcher", ".HomeActivity");
        policy.addHome("house.hueco.glass", ".MainActivity");
        policy.addHome("android", ".ResolverActivity");
        policy.addHome("vendor.launcher", null);
        require(policy.isOtherHome("vendor.launcher", "vendor.launcher.HomeActivity"), "Home must redirect");
        require(policy.isOtherHome("vendor.launcher", ".HomeActivity"), "Short component names must match");
        require(!policy.isOtherHome("vendor.launcher", "vendor.launcher.SettingsActivity"), "Settings in the launcher package must remain accessible");
        require(!policy.isOtherHome("house.hueco.glass", ".MainActivity"), "Never redirect Glass into a loop");
        require(!policy.isOtherHome("android", ".ResolverActivity"), "Never intercept the system chooser");
        require(!policy.isOtherHome("com.netflix.ninja", "PlayerActivity"), "Other apps must remain untouched");
        require(!policy.isOtherHome(null, null), "Ignore incomplete accessibility events");
        require(policy.canLaunch(0), "Initial Home must work immediately");
        policy.launched(1000);
        require(!policy.canLaunch(1001), "Suppress duplicate Home events");
        require(!policy.canLaunch(1799), "Suppress repeated window events");
        require(policy.canLaunch(1800), "A later Home press must still work");
        System.out.println("PASS: Home fallback, alias matching, Settings safety, no self-loop, chooser safety, duplicate suppression");
    }

    private static void require(boolean value, String message) {
        if (!value) throw new AssertionError(message);
    }
}
