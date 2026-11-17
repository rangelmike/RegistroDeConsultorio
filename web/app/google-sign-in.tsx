"use client";

import { useState } from "react";
import { createClient } from "../lib/supabase/client";

export function GoogleSignIn() {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signIn() {
    setPending(true);
    setFailed(false);

    try {
      const callback = new URL("/auth/callback", window.location.origin);
      const { error } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: callback.href },
      });

      if (!error) return;
    } catch {
      // Keep configuration and provider details out of the page.
    }

    setFailed(true);
    setPending(false);
  }

  return (
    <>
      <button className="button google-button" type="button" onClick={signIn} disabled={pending}>
        <span className="google-g" aria-hidden="true">G</span>
        {pending ? "Abriendo Google…" : "Continuar con Google"}
      </button>
      {failed && <p role="alert">No se pudo abrir Google. Inténtalo de nuevo.</p>}
    </>
  );
}
