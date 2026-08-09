import { useState, useEffect } from "react";
import { listTable, deleteRow, updateRow } from "./supabase-admin";

/**
 * Realtime hook using the secure admin proxy.
 * Because the Supabase service key is no longer exposed in the frontend,
 * we cannot open a Postgres changes channel directly. Instead we fetch the
 * table initially and then poll every few seconds.
 */
export function useRealtimeSubscription(table, opts = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        const rows = await listTable(table, opts.limit || 200);
        if (mounted) setData(rows || []);
      } catch (e) {
        console.warn(`[Realtime] fetch error for ${table}:`, e);
      }
      if (mounted) setLoading(false);
    };

    fetchData();

    // Poll every 30s as a lightweight realtime replacement. Pause when hidden.
    let interval = setInterval(fetchData, 30000);
    const startInterval = () => {
      clearInterval(interval);
      interval = setInterval(fetchData, 30000);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        clearInterval(interval);
      } else {
        fetchData();
        startInterval();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      mounted = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [table, opts.limit]);

  return data;
}

/**
 * Supabase CRUD helpers — now backed by the secure Cloud Function proxy.
 */

export async function insertOne(table, data) {
  // Proxy currently exposes listTable/deleteRow/updateRow; insert is done via updateRow semantics
  // or by extending the proxy. For now, throw a clear error directing to the proxy.
  throw new Error("insertOne is disabled in the frontend; use a Cloud Function proxy action instead.");
}

export async function updateOne(table, id, updates) {
  return updateRow(table, "id", id, { ...updates, updated_at: new Date().toISOString() });
}

export async function deleteOne(table, id) {
  return deleteRow(table, "id", id);
}

/**
 * Mail queue helper — disabled client-side; emails must be queued server-side.
 */
export async function queueEmail({ to, subject, html, userId }) {
  console.warn("queueEmail is disabled in the frontend; use the queueEmail Cloud Function instead.", { to, userId });
  throw new Error("queueEmail is disabled in the frontend; use the Cloud Function queueEmail instead.");
}
