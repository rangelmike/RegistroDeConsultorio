import { GoogleSignIn } from "./google-sign-in";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ login?: string | string[] }>;
}) {
  const { login } = await searchParams;

  return (
    <main>
      <h1>ConsultorioRegistro</h1>
      {login === "error" && (
        <p role="alert">El inicio de sesión se canceló o no pudo completarse.</p>
      )}
      <GoogleSignIn />
    </main>
  );
}
