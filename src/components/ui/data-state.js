/**
 * Normalize admin data-loading failures into the states rendered by DataState.
 */
export async function loadGuard(fetcher) {
  try {
    const data = await fetcher();
    return { data: data ?? [], state: "ok", message: null };
  } catch (err) {
    const msg = String(err?.message ?? err);
    if (
      msg.includes("Supabase not configured") ||
      msg.includes("failed-precondition") ||
      msg.toLowerCase().includes("supabase")
    ) {
      return { data: null, state: "supabase-missing", message: msg };
    }
    return { data: null, state: "error", message: msg };
  }
}
