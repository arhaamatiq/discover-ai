"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const handledRef = useRef(false);

  useEffect(() => {
    async function handleSession(userId: string) {
      if (handledRef.current) return;
      handledRef.current = true;

      // Load existing workspace into sessionStorage, then route appropriately
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("research_data, canvas_data")
        .eq("user_id", userId)
        .maybeSingle();

      if (workspace?.research_data) {
        sessionStorage.setItem(
          "discover_research",
          JSON.stringify(workspace.research_data)
        );
        if (workspace.canvas_data) {
          sessionStorage.setItem(
            "discover_canvas",
            JSON.stringify(workspace.canvas_data)
          );
        }
        router.replace("/canvas");
      } else {
        router.replace("/intake");
      }
    }

    // PKCE code exchange fires the SIGNED_IN event — listen for it
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") &&
        session?.user
      ) {
        handleSession(session.user.id);
      }
    });

    // Also check if the session was established before the listener was set up
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleSession(session.user.id);
      }
    });

    // Safety fallback: if nothing resolves in 10 s, go home
    const timeout = setTimeout(() => {
      if (!handledRef.current) {
        router.replace("/");
      }
    }, 10_000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0F0F0F]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-white border-t-transparent" />
        <p className="text-sm text-[#666]">Signing you in…</p>
      </div>
    </main>
  );
}
