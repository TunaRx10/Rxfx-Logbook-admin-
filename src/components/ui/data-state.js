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
      msg.includes("non configuré") ||
      msg.includes("Apps Script") ||
      msg.includes("failed-precondition")
    ) {
      return { data: null, state: "backend-missing", message: msg };
    }
    return { data: null, state: "error", message: msg };
  }
}
