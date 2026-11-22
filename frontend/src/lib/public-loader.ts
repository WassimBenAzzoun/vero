// Imported exclusively from web route loaders; never forwards private sessions.
export async function publicData<T>(path: string): Promise<T | null> {
  const base =
    process.env.VERO_INTERNAL_API_URL ||
    `http://127.0.0.1:${process.env.PORT || 3000}/api`;
  try {
    const response = await fetch(base + path, {
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}
