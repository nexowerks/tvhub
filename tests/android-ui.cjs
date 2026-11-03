const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {})
  });
  const fixtures = [
    { android: 'vendor.netflix.tv', name: 'Netflix' },
    { android: 'com.google.android.youtube.tv', name: 'YouTube' },
    ...Array.from({ length: 18 }, (_, i) => ({ android: 'vendor.app' + i, name: 'TV App ' + i }))
  ];
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(/^https?:/, route => route.abort());
  await page.addInitScript(apps => {
    window.testApps = apps;
    window.testLaunches = [];
    window.AndroidLauncher = {
      getApps: () => JSON.stringify(window.testApps),
      getAppIcon: () => '',
      launch: pkg => { window.testLaunches.push(pkg); return !window.failLaunch; },
      openSettings: () => { window.settingsOpened = true; },
      openHomeSettings: () => { window.homeSettingsOpened = true; }
    };
  }, fixtures);
  const url = pathToFileURL(path.resolve(__dirname, '../tv-launcher/index.html')).href;
  try {
    await page.goto(url);
    for (const [width, height] of [[960, 540], [1280, 720], [1920, 1080], [3840, 2160], [1280, 800]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => window.__glassResume());
      const bounds = await page.locator('#stage').boundingBox();
      assert(bounds.x >= -1 && bounds.y >= -1);
      assert(bounds.x + bounds.width <= width + 1 && bounds.y + bounds.height <= height + 1);
      for (const element of await page.locator('#dock .app, .menubar, .clock-widget').all()) {
        const r = await element.boundingBox();
        assert(r.x >= 0 && r.x + r.width <= width + 1 && r.y >= 0 && r.y + r.height <= height + 1);
      }
    }
    const dock = await page.locator('#dock .app').allTextContents();
    assert.equal(dock.length, 9, 'Seven real apps plus Apps and Settings');
    assert.equal(await page.locator('#dock [aria-label="Prime Video"]').count(), 0, 'Missing favorites must disappear');
    await page.keyboard.press('Enter');
    assert.deepEqual(await page.evaluate(() => window.testLaunches), ['vendor.netflix.tv'], 'Use installed OEM package');
    assert.equal(await page.locator('.blob').first().evaluate(el => getComputedStyle(el).display), 'none');
    assert.equal(await page.locator('.dock').evaluate(el => getComputedStyle(el).backdropFilter), 'none');

    await page.locator('#dock [aria-label="Apps"]').click();
    assert.equal(await page.locator('#apps-grid .app-card').count(), 12);
    assert.equal(await page.locator('#apps-grid .focused').count(), 1);
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#apps-grid .focused').getAttribute('aria-label'), 'YouTube');
    await page.locator('#apps-pages').getByText('Next', { exact: true }).click();
    assert.equal(await page.locator('#apps-grid .app-card').count(), 8);
    assert.match(await page.locator('#apps-page').textContent(), /2 \/ 2/);
    await page.evaluate(() => window.__glassResume());
    assert.equal(await page.locator('#apps-grid .focused').count(), 1, 'Resume keeps focus inside open drawer');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#apps-panel').getAttribute('aria-hidden'), 'true');

    await page.evaluate(() => { window.failLaunch = true; });
    await page.keyboard.press('Enter');
    assert.match(await page.locator('#toast').textContent(), /Could not open Netflix/);

    await page.evaluate(() => { window.testApps = []; window.__glassResume(); });
    assert.equal(await page.locator('#dock .app').count(), 2, 'Zero apps never restores fake favorites');
    await page.keyboard.press('Enter');
    assert.match(await page.locator('#apps-grid').textContent(), /No apps found/);
    await page.keyboard.press('Escape');
    await page.locator('[data-action="control-center"]').click();
    await page.locator('#cc-grid').getByText('Home screen', { exact: true }).click();
    assert.equal(await page.evaluate(() => window.homeSettingsOpened), true);

    await page.evaluate(apps => { window.testApps = apps; window.failLaunch = false; window.__glassBack(); window.__glassResume(); }, fixtures);
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.evaluate(() => window.__glassResume());
    if (process.env.SCREENSHOT_PATH) await page.screenshot({ path: process.env.SCREENSHOT_PATH });
    assert.deepEqual(errors, []);
    console.log('PASS: viewport fit, OEM packages, missing/empty app lists, app pages, remote focus, launch errors, home settings, static effects');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
