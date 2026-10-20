// "Chrome on Linux" from a User-Agent string. Good enough to tell your own devices apart; it is not
// a security check, and the raw string never leaves the server.
const BROWSERS = [
  [/Edg(e|A|iOS)?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/SamsungBrowser\//, "Samsung Internet"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Safari\//, "Safari"],
];
const SYSTEMS = [
  [/iPhone|iPad|iPod/, "iOS"],
  [/Android/, "Android"],
  [/Windows/, "Windows"],
  [/CrOS/, "ChromeOS"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/Linux|X11/, "Linux"],
];

export function describeDevice(userAgent) {
  if (typeof userAgent !== "string" || userAgent.length === 0) return { label: "Unknown device", kind: "computer" };
  const browser = BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1];
  const system = SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1];
  const phone = /iPhone|iPod|Android.+Mobile|Mobile.+Android/.test(userAgent) || (/Android/.test(userAgent) && /Mobile/.test(userAgent));
  const tablet = /iPad|Android(?!.*Mobile)/.test(userAgent);
  const label = browser && system ? `${browser} on ${system}` : (browser ?? system ?? "Unknown device");
  return { label, kind: phone ? "phone" : tablet ? "tablet" : "computer" };
}
