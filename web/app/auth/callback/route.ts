import { createClient } from "../../../lib/supabase/server";

function redirectTo(path: "/panel" | "/?login=error" | "/panel/consultorios?setup=error") {
  return new Response(null, {
    status: 303,
    headers: { Location: path, "Cache-Control": "private, no-store" },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) return redirectTo("/?login=error");

  const flowId = searchParams.get("sb_flow_id");
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(
    code,
    flowId ? { flowId } : undefined,
  );

  if (error) return redirectTo("/?login=error");
  const { error: claimError } = await supabase.rpc("claim_clinic_invitations");
  return redirectTo(claimError ? "/panel/consultorios?setup=error" : "/panel");
}
