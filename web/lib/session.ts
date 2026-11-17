import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { getSupabaseConfig } from "./supabase/config";
export const requireSession = cache(async () => {
  const supabase = await createClient({ readOnly: true });
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub || claims.iss !== new URL("/auth/v1", getSupabaseConfig().url).href ||
    ![claims.aud].flat().includes("authenticated") || !claims.exp || claims.exp * 1000 <= Date.now() ||
    !Array.isArray(claims.amr) || !claims.amr.some((a: { method?: string }) => a.method === "oauth")) redirect("/");
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user || !user.email_confirmed_at || !user.identities?.some(i => i.provider === "google")) redirect("/?login=error");
  return { supabase, user };
});
