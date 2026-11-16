import { createClient } from "../../../lib/supabase/server";

function redirectTo(path: "/panel" | "/?login=error") {
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

  return redirectTo(error ? "/?login=error" : "/panel");
}
