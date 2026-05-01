import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCache, hydrateAll, setCache, type DBSnapshot } from "@/lib/store";

export function useDB() {
  const [db, setDB] = useState<DBSnapshot>(() => getCache());

  useEffect(() => {
    const refresh = () => setDB(getCache());
    window.addEventListener("snowwolf:db", refresh);
    return () => window.removeEventListener("snowwolf:db", refresh);
  }, []);

  // Setup Supabase auth-driven hydration + realtime
  useEffect(() => {
    let currentUserId: string | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let rehydrateTimer: number | null = null;

    const scheduleRehydrate = () => {
      if (rehydrateTimer) return;
      rehydrateTimer = window.setTimeout(async () => {
        rehydrateTimer = null;
        if (currentUserId) await hydrateAll(currentUserId);
      }, 150); // batch bursts of changes
    };

    const teardownChannel = () => {
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    };

    const subscribeRealtime = () => {
      teardownChannel();
      channel = supabase
        .channel("snowwolf-db-sync")
        .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, scheduleRehydrate)
        .on("postgres_changes", { event: "*", schema: "public", table: "servers" }, scheduleRehydrate)
        .on("postgres_changes", { event: "*", schema: "public", table: "server_members" }, scheduleRehydrate)
        .on("postgres_changes", { event: "*", schema: "public", table: "channels" }, scheduleRehydrate)
        .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, scheduleRehydrate)
        .on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, scheduleRehydrate)
        .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, scheduleRehydrate)
        .on("postgres_changes", { event: "*", schema: "public", table: "voice_presence" }, scheduleRehydrate)
        .on("postgres_changes", { event: "*", schema: "public", table: "read_states" }, scheduleRehydrate)
        .subscribe();
    };

    const apply = async (uid: string | null) => {
      currentUserId = uid;
      if (uid) {
        await hydrateAll(uid);
        subscribeRealtime();
      } else {
        teardownChannel();
        setCache({
          users: [],
          servers: [],
          channels: [],
          messages: [],
          friendships: [],
          reads: {},
          session: { userId: null },
          voice: {},
        });
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      apply(session?.user?.id ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => apply(session?.user?.id ?? null));

    return () => {
      sub.subscription.unsubscribe();
      teardownChannel();
      if (rehydrateTimer) clearTimeout(rehydrateTimer);
    };
  }, []);

  return db;
}
