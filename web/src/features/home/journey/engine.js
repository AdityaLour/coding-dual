import { WALKER, PROPS } from "./scenes.js";

const NS = "http://www.w3.org/2000/svg";
const SCALE = 1.3;
const DWELL = 160; // px of scrolling during which the walker holds at a stop
const MAX_STEP = 11; // px per frame, keeps fast scrolling smooth
const HOLD_AT = 0.62; // the point of the screen (from the top) the walker follows
const WALKER_HEIGHT = 150 * SCALE;
const SLOT_GAP = 16; // keeps the starting walker clear of the rival slot
const STOP_X = {
  practice: 0.7,
  friend: 0.78,
  daily: 0.7,
  board: 0.66,
  end: 0.78,
};
const LABELS = {
  practice: "Practice",
  friend: "Duel a friend",
  daily: "Daily challenge",
  board: "Leaderboard",
  end: "the end",
};

function el(tag, attrs, html) {
  const node = document.createElementNS(NS, tag);
  for (const key in attrs) node.setAttribute(key, attrs[key]);
  if (html) node.innerHTML = html;
  return node;
}

/**
 * The scroll journey: your doodle walks a route down the page, stopping at each
 * section. Imperative on purpose: it updates SVG attributes every frame without
 * re-rendering React. Only started with motion allowed (see Journey.jsx).
 * Returns a function that tears everything down.
 */
export function createJourney({
  root,
  container,
  svg,
  bubbleWrap,
  bubble,
  styles: s,
  firstLine,
}) {
  const cleanups = [];
  let route,
    inked,
    walker,
    pins = [],
    stops = [],
    samples = [],
    keys = [];
  let length = 0,
    cur = 0,
    target = 0,
    prev = -1,
    running = false,
    facing = 1;
  let scene = "",
    said = "",
    danceTimer = 0;

  function posAt(l) {
    const f = Math.max(
      0,
      Math.min(samples.length - 1, (l / length) * (samples.length - 1)),
    );
    const i = Math.floor(f);
    const t = f - i;
    const a = samples[i];
    const b = samples[Math.min(i + 1, samples.length - 1)];
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  function lengthAtY(y) {
    let lo = 0;
    let hi = samples.length - 1;
    if (y <= samples[0].y) return 0;
    if (y >= samples[hi].y) return length;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (samples[m].y < y) lo = m;
      else hi = m;
    }
    const t = (y - samples[lo].y) / (samples[hi].y - samples[lo].y || 1);
    return ((lo + t) / (samples.length - 1)) * length;
  }

  // Scroll position → distance along the route: flat while a section is in view,
  // linear in between, continuous everywhere (no jumps).
  function mapTarget(y) {
    if (y <= keys[0].y) return 0;
    for (let i = 1; i < keys.length; i++) {
      const a = keys[i - 1];
      const b = keys[i];
      if (y <= b.y) return a.l + ((y - a.y) / (b.y - a.y || 1)) * (b.l - a.l);
    }
    return length;
  }

  function say(line) {
    if (line === said) return;
    said = line;
    bubble.textContent = line;
    bubble.classList.remove(s.pop);
    void bubble.offsetWidth;
    bubble.classList.add(s.pop);
  }

  function render() {
    const speed = prev < 0 ? 0 : cur - prev;
    prev = cur;
    const p = posAt(cur);
    walker.setAttribute(
      "transform",
      `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${SCALE})`,
    );
    inked.style.strokeDashoffset = (length - cur).toFixed(1);

    const moving = Math.abs(speed) > 0.25;
    walker.classList.toggle(s.walking, moving);
    if (moving) {
      const ahead = posAt(Math.min(length, cur + 6));
      const dir = Math.sign(speed) * Math.sign(ahead.x - p.x || facing);
      if (dir) facing = dir;
    }

    let now = "";
    for (const stop of stops) {
      if (Math.abs(cur - stop.len) < 3) {
        now = stop.name;
        break;
      }
    }
    if (now !== scene) {
      for (const stop of stops) {
        walker.classList.remove(s[`scene_${stop.name}`]);
        container.classList.remove(s[`on_${stop.name}`]);
      }
      if (now) {
        walker.classList.add(s[`scene_${now}`]);
        container.classList.add(s[`on_${now}`]);
      }
      scene = now;
    }
    walker.classList.toggle(s.left, !scene && facing < 0);
    pins.forEach((pin, i) =>
      pin.classList.toggle(s.done, cur >= stops[i].len - 2),
    );

    let line = firstLine;
    for (const stop of stops) if (cur >= stop.len - 2) line = stop.say;
    if (!danceTimer) say(line);
    // At the start the bubble sits to the walker's left (below the rival slot);
    // once it's walking, the bubble rides above its head.
    const atStart = cur < 4;
    bubble.classList.toggle(s.side, atStart);
    const bx = atStart ? p.x - bubbleWrap.offsetWidth - 34 : p.x - 20;
    const by = atStart ? p.y - 200 : p.y - 320;
    bubbleWrap.style.transform = `translate(${bx.toFixed(1)}px, ${by.toFixed(1)}px)`;
  }

  function loop() {
    const diff = target - cur;
    const step =
      Math.abs(diff) < 0.5
        ? diff
        : Math.sign(diff) *
          Math.min(
            Math.abs(diff) * 0.12,
            Math.max(MAX_STEP, Math.abs(diff) * 0.05),
          );
    cur += step;
    render();
    if (Math.abs(target - cur) > 0.1 || Math.abs(cur - prev) > 0.1)
      requestAnimationFrame(loop);
    else {
      running = false;
      render();
    }
  }

  function onScroll() {
    target = mapTarget(window.scrollY + window.innerHeight * HOLD_AT);
    if (!running) {
      running = true;
      requestAnimationFrame(loop);
    }
  }

  function build() {
    const width = root.clientWidth;
    const height = root.scrollHeight;
    container.style.height = `${height}px`;
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.innerHTML = "";

    const sections = [...root.querySelectorAll("[data-station]")];
    const hero = root.querySelector("[data-journey-start]");
    // Start inside the hero, bottom-right of the red side, drawn over it (no extra space).
    // Feet near the bottom edge; the starting bubble (to its left, level with its
    // head) stays at least SLOT_GAP below the rival slot.
    const slot = root.querySelector("[data-rival-slot]");
    const heroBottom = hero.offsetTop + hero.offsetHeight;
    const slotBottom = slot
      ? slot.getBoundingClientRect().bottom - root.getBoundingClientRect().top
      : 0;
    const feet = Math.max(
      heroBottom - 12,
      slotBottom + SLOT_GAP + WALKER_HEIGHT,
    );
    const start = {
      x: width - Math.max(width * 0.07, 48) - 30,
      y: Math.min(feet, heroBottom + 40),
    };
    stops = sections.map((sec) => ({
      name: sec.dataset.station,
      say: sec.dataset.say,
      x: width * (STOP_X[sec.dataset.station] ?? 0.72),
      y: sec.offsetTop + Math.min(sec.offsetHeight * 0.62, 420),
    }));

    let d = `M${start.x} ${start.y}`;
    let last = start;
    for (const stop of stops) {
      const dy = stop.y - last.y;
      d += ` C${last.x} ${last.y + dy * 0.55} ${stop.x} ${stop.y - dy * 0.55} ${stop.x} ${stop.y}`;
      last = stop;
    }
    route = el("path", { d, class: s.route });
    inked = el("path", { d, class: s.inked });
    svg.append(route, inked);
    length = route.getTotalLength();
    inked.style.strokeDasharray = `${length} ${length}`;

    const count = Math.max(400, Math.round(length / 2));
    samples = [];
    for (let i = 0; i <= count; i++) {
      const pt = route.getPointAtLength((length * i) / count);
      samples.push({ x: pt.x, y: pt.y });
    }
    for (const stop of stops) stop.len = lengthAtY(stop.y);
    keys = [{ y: start.y - window.innerHeight * 0.2, l: 0 }];
    for (const stop of stops)
      keys.push(
        { y: stop.y - DWELL, l: stop.len },
        { y: stop.y + DWELL, l: stop.len },
      );

    const props = el("g", {});
    for (const stop of stops) {
      props.appendChild(
        el(
          "g",
          { transform: `translate(${stop.x} ${stop.y}) scale(${SCALE})` },
          PROPS[stop.name]?.(s) ?? "",
        ),
      );
    }
    svg.appendChild(props);

    pins = stops.map((stop) => {
      const pin = el(
        "circle",
        { cx: stop.x, cy: stop.y, r: 7, class: s.pin },
        `<title>Go to ${LABELS[stop.name] ?? stop.name}</title>`,
      );
      pin.addEventListener("click", () =>
        window.scrollTo({
          top: stop.y - window.innerHeight * HOLD_AT,
          behavior: "smooth",
        }),
      );
      svg.appendChild(pin);
      return pin;
    });

    walker = el("g", { class: s.walker }, WALKER(s));
    walker.addEventListener("click", () => {
      if (danceTimer) return;
      walker.classList.add(s.dance);
      say("Woo!");
      danceTimer = setTimeout(() => {
        walker.classList.remove(s.dance);
        danceTimer = 0;
        said = "";
        render();
      }, 1400);
    });
    svg.appendChild(walker);

    scene = "";
    said = "";
    prev = -1;
    target = mapTarget(window.scrollY + window.innerHeight * HOLD_AT);
    cur = target;
    render();
  }

  build();
  window.addEventListener("scroll", onScroll, { passive: true });
  cleanups.push(() => window.removeEventListener("scroll", onScroll));

  let resizeTimer = 0;
  const rebuild = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 150);
  };
  const observer = new ResizeObserver(rebuild);
  observer.observe(root);
  cleanups.push(
    () => observer.disconnect(),
    () => clearTimeout(resizeTimer),
    () => clearTimeout(danceTimer),
  );

  return () => {
    cleanups.forEach((fn) => fn());
    svg.innerHTML = "";
  };
}
