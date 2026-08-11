"use client";

import { useEffect } from "react";

/**
 * The last line of defence for a client-side crash.
 *
 * Without it, an exception during render replaces the workspace with
 * "Application error: a client-side exception has occurred" — no context and
 * no way back. The crash is still a bug; this only decides whether the person
 * in front of it can carry on.
 */
export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Orbit CRM crashed while rendering:", error);
  }, [error]);

  return (
    <div className="boot">
      <h1 style={{ fontSize: 18, margin: 0 }}>Something broke in the browser.</h1>
      <p style={{ maxWidth: 460, textAlign: "center" }}>
        Your workspace and its data are safe on the server. Trying again reloads this screen from scratch.
      </p>

      <button className="primary" onClick={reset}>
        Try again
      </button>

      {error.digest && <p className="mono" style={{ fontSize: 11 }}>{error.digest}</p>}
    </div>
  );
}
