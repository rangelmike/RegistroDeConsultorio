import { GoogleSignIn } from "./google-sign-in";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ login?: string | string[] }>;
}) {
  const { login } = await searchParams;

  return (
    <main className="login-page">
      <div className="login-brand"><span className="brand-mark">+</span>ConsultorioRegistro</div>
      <section className="login-card">
      <span className="eyebrow">BIENVENIDO A TU ESPACIO</span>
      <h1>Cuidar empieza<br />por conectar<span className="heading-dot">.</span></h1>
      <p>Tu consultorio y tu equipo,<br />en un mismo lugar.</p>
      {login === "error" && (
        <p role="alert">El inicio de sesión se canceló o no pudo completarse.</p>
      )}
      <GoogleSignIn />
      <span className="login-note">Accede con tu cuenta de Google</span>
      </section>
      <footer className="login-footer">ConsultorioRegistro · Un espacio para cuidar, juntos.</footer>
    </main>
  );
}
