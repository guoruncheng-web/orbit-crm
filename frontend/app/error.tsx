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
      <h1 style={{ fontSize: 18, margin: 0 }}>页面暂时出现异常</h1>
      <p style={{ maxWidth: 460, textAlign: "center" }}>
        工作空间与数据仍安全保存在服务器，重新尝试会刷新当前页面。
      </p>

      <button className="primary" onClick={reset}>
        重新尝试
      </button>

      {error.digest && <p className="mono" style={{ fontSize: 11 }}>{error.digest}</p>}
    </div>
  );
}
