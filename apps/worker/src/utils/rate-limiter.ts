const lastRequestTimes: Record<string, number> = {};

export async function rateLimit(sourceKey: string, delayMs: number = 2500): Promise<void> {
  const now = Date.now();
  const last = lastRequestTimes[sourceKey] || 0;
  const elapsed = now - last;

  if (elapsed < delayMs) {
    const waitTime = delayMs - elapsed;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  lastRequestTimes[sourceKey] = Date.now();
}
