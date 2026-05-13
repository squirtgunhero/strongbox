"use client";

// Root error boundary — wraps the whole html document. Renders when a layout
// or a top-level page throws and no nested error.tsx caught it. Keep this
// minimal because the rest of the app shell (fonts, providers) may have
// failed to mount.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          background: "#F7F5F2",
          color: "#0A0A0A",
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 440, textAlign: "center" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#6B6862",
              marginBottom: 12,
            }}
          >
            StrongBox · system error
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "-0.018em",
              marginBottom: 8,
            }}
          >
            Something went wrong
          </h1>
          <p style={{ fontSize: 13, color: "#59554f", marginBottom: 20 }}>
            We hit an unexpected error rendering this page. Try again, or head
            back to the dashboard. The error has been logged for the team.
          </p>
          {error.digest && (
            <div
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: 11,
                color: "#6B6862",
                marginBottom: 20,
              }}
            >
              Error ID: {error.digest}
            </div>
          )}
          <button
            onClick={() => reset()}
            style={{
              background: "#0A0A0A",
              color: "#fff",
              border: "none",
              padding: "10px 18px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
