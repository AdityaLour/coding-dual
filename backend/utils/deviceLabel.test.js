import test from "node:test";
import assert from "node:assert/strict";
import { describeDevice } from "./deviceLabel.js";

const UA = {
  chromeLinux: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  firefoxFedora: "Mozilla/5.0 (X11; Fedora; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0",
  safariIphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  chromeAndroid: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  edgeWindows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
  safariMac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  ipad: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
};

test("common browsers on common systems", () => {
  assert.deepEqual(describeDevice(UA.chromeLinux), { label: "Chrome on Linux", kind: "computer" });
  assert.deepEqual(describeDevice(UA.firefoxFedora), { label: "Firefox on Linux", kind: "computer" });
  assert.deepEqual(describeDevice(UA.edgeWindows), { label: "Edge on Windows", kind: "computer" });
  assert.deepEqual(describeDevice(UA.safariMac), { label: "Safari on macOS", kind: "computer" });
});

test("phones and tablets", () => {
  assert.deepEqual(describeDevice(UA.safariIphone), { label: "Safari on iOS", kind: "phone" });
  assert.deepEqual(describeDevice(UA.chromeAndroid), { label: "Chrome on Android", kind: "phone" });
  assert.equal(describeDevice(UA.ipad).kind, "tablet");
});

test("nothing usable is an unknown device, never a crash", () => {
  for (const value of [null, undefined, "", 42, "curl/8.0"]) {
    assert.equal(describeDevice(value).kind, "computer");
  }
  assert.equal(describeDevice(null).label, "Unknown device");
  assert.equal(describeDevice("curl/8.0").label, "Unknown device");
});
