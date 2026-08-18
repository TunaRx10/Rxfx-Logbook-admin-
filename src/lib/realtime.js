import { useState, useEffect } from "react";
import { listTable, deleteRow, updateRow } from "./data-admin";

/**
 * Realtime hook — polling Google Sheets via `data-admin` (qui route vers
 * Apps Script). On charge la table puis on rafraîchit toutes les 30s, en
 * mettant le polling en pause quand l'onglet est masqué.
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
 * CRUD helpers — routent vers Apps Script via `data-admin`.
 */

export async function updateOne(table, id, updates) {
  return updateRow(table, "id", id, { ...updates, updated_at: new Date().toISOString() });
}

export async function deleteOne(table, id) {
  return deleteRow(table, "id", id);
}
