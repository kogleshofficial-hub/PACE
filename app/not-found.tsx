export default function NotFound() {
  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="not-found-title">
        <span className="kicker">PACE / 404</span>
        <h1 id="not-found-title">That page isn’t on the plan.</h1>
        <p>The page you requested doesn’t exist or has moved.</p>
        <a className="primary" href="/">Return to PACE</a>
      </section>
    </main>
  );
}
