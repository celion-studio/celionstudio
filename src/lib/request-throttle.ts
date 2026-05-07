type ThrottleResult =
  | { ok: true; release: () => void }
  | { ok: false; status: 409 | 429; message: string; retryAfterSeconds: number };

type ThrottleConfig = {
  concurrencyKey: string;
  limit: number;
  windowMs: number;
};

const attempts = new Map<string, number[]>();
const inFlight = new Set<string>();

function prune(now: number, values: number[], windowMs: number) {
  return values.filter((value) => now - value < windowMs);
}

export function claimRequestSlot(key: string, config: ThrottleConfig): ThrottleResult {
  const now = Date.now();
  const timestamps = prune(now, attempts.get(key) ?? [], config.windowMs);
  if (timestamps.length >= config.limit) {
    const oldest = timestamps[0] ?? now;
    return {
      ok: false,
      status: 429,
      message: "Too many requests. Please wait a moment and try again.",
      retryAfterSeconds: Math.max(1, Math.ceil((config.windowMs - (now - oldest)) / 1000)),
    };
  }

  if (inFlight.has(config.concurrencyKey)) {
    return {
      ok: false,
      status: 409,
      message: "A generation request is already running. Please wait for it to finish.",
      retryAfterSeconds: 20,
    };
  }

  timestamps.push(now);
  attempts.set(key, timestamps);
  inFlight.add(config.concurrencyKey);

  return {
    ok: true,
    release: () => {
      inFlight.delete(config.concurrencyKey);
    },
  };
}

export function resetRequestThrottleForTests() {
  attempts.clear();
  inFlight.clear();
}
