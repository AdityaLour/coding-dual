// Asks again and again until an answer is final. A judge call takes seconds, so the page polls.

export class PollTimeout extends Error {}

const abortError = () => new DOMException("Aborted", "AbortError");

function pause(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError());
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", stop);
      resolve();
    }, ms);
    const stop = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    signal?.addEventListener("abort", stop, { once: true });
  });
}

// A hiccup (server briefly down, rate limit) is retried a few times; anything else the server
// said (404, 403...) will not change by asking again.
const passing = (error) =>
  error?.status === 0 || error?.status === 429 || error?.status >= 500;

export async function poll(
  fetchOnce,
  isDone,
  {
    signal,
    intervalMs = 900,
    timeoutMs = 120_000,
    retries = 3,
    sleep = pause,
    now = Date.now,
  } = {},
) {
  const deadline = now() + timeoutMs;
  let failed = 0;
  for (;;) {
    if (signal?.aborted) throw abortError();
    try {
      const value = await fetchOnce();
      failed = 0;
      if (isDone(value)) return value;
    } catch (error) {
      if (!passing(error) || ++failed > retries) throw error;
    }
    if (now() >= deadline) throw new PollTimeout();
    await sleep(intervalMs, signal);
  }
}
