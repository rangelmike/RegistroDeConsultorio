import { redirect } from "next/navigation";
import { getSupabaseConfig } from "../../lib/supabase/config";
import { createClient } from "../../lib/supabase/server";

export default async function Panel({
  searchParams,
}: {
  searchParams: Promise<{ logout?: string | string[] }>;
}) {
  const supabase = await createClient({ readOnly: true });
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const issuer = new URL("/auth/v1", getSupabaseConfig().url).href;

  if (
    error ||
    !claims?.sub ||
    claims.iss !== issuer ||
    ![claims.aud].flat().includes("authenticated")
  ) {
    redirect("/");
  }

  async function signOut() {
    "use server";

    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    redirect(error ? "/panel?logout=error" : "/");
  }

  const { logout } = await searchParams;

  return (
    <main>
      <h1>Sesión iniciada</h1>
      {logout === "error" && (
        <p role="alert">No se pudo cerrar la sesión. Inténtalo de nuevo.</p>
      )}
      <form action={signOut}>
        <button type="submit">Cerrar sesión</button>
      </form>
    </main>
  );
}
