"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="error-title">
        <span className="kicker">PACE / RECOVERY MODE</span>
        <h1 id="error-title">Something went off plan.</h1>
        <p>PACE hit an unexpected problem. Your workspace data is kept separate from other accounts.</p>
        <button className="primary" onClick={() => reset()}>Try again</button>
      </section>
    </main>
  );
}
