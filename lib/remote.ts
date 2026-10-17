import type { SupabaseClient } from "@supabase/supabase-js";
import type { Settings } from "@/types";
import type { VaultRecord } from "@/lib/vault";
import type { RecordRow, SyncCollection } from "@/lib/sync-core";

export interface PulledRow extends RecordRow {
  synced_at: string;
}

export interface Remote {
  getVault(): Promise<VaultRecord | null>;
  saveVault(vault: VaultRecord): Promise<void>;
  getProfile(): Promise<Partial<Settings> | null>;
  saveProfile(settings: Settings): Promise<void>;
  pull(since: string | null, limit?: number): Promise<PulledRow[]>;
  push(rows: RecordRow[]): Promise<void>;
  subscribe(onChange: () => void): () => void;
}

export function supabaseRemote(client: SupabaseClient, userId: string): Remote {
  return {
    async getVault() {
      const { data, error } = await client.from("vaults").select("*").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        v: data.v,
        kdf: data.kdf,
        kdf_params: data.kdf_params,
        salt_pass: data.salt_pass,
        wrapped_dek_pass: data.wrapped_dek_pass,
        salt_recovery: data.salt_recovery,
        wrapped_dek_recovery: data.wrapped_dek_recovery,
      } as VaultRecord;
    },
    async saveVault(vault) {
      const { error } = await client.from("vaults").upsert({ user_id: userId, ...vault });
      if (error) throw error;
    },
    async getProfile() {
      const { data, error } = await client.from("profiles").select("currency, locale, start_day").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { currency: data.currency, locale: data.locale, startDay: data.start_day };
    },
    async saveProfile(s) {
      const { error } = await client
        .from("profiles")
        .upsert({ user_id: userId, currency: s.currency, locale: s.locale, start_day: s.startDay });
      if (error) throw error;
    },
    async pull(since, limit = 1000) {
      let query = client
        .from("records")
        .select("id, collection, month, payload, updated_at, deleted, synced_at")
        .eq("user_id", userId)
        .order("synced_at", { ascending: true })
        .limit(limit);
      if (since) query = query.gt("synced_at", since);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((r) => ({ ...r, collection: r.collection as SyncCollection })) as PulledRow[];
    },
    async push(rows) {
      if (!rows.length) return;
      const { error } = await client.rpc("upsert_records", { rows });
      if (error) throw error;
    },
    subscribe(onChange) {
      const channel = client
        .channel(`records:${userId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "records", filter: `user_id=eq.${userId}` }, () => onChange())
        .subscribe();
      return () => {
        void client.removeChannel(channel);
      };
    },
  };
}
