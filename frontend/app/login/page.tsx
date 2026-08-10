"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Command, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const { status, signIn, signUp, startDemo } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [form, setForm] = useState({ name: "", organizationName: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [demoPending, setDemoPending] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [status, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      if (mode === "signin") {
        await signIn(form.email, form.password);
      } else {
        await signUp(form);
      }
      router.replace("/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  }

  async function exploreDemo() {
    setError(null);
    setDemoPending(true);

    try {
      await startDemo();
      router.replace("/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start the demo");
    } finally {
      setDemoPending(false);
    }
  }

  return (
    <div className="auth-shell">
      <section className="auth-brand">
        <div className="brand">
          <span className="brand-mark">
            <Command size={19} />
          </span>
          <span>orbit</span>
        </div>
        <div className="auth-pitch">
          <h1>The workspace behind every client relationship.</h1>
          <p>
            Track your pipeline, watch revenue build month over month, and keep every account in one
            place your whole team can see.
          </p>
        </div>
        <dl className="auth-stats">
          <div>
            <dt>Pipeline tracked</dt>
            <dd>$412k</dd>
          </div>
          <div>
            <dt>Accounts</dt>
            <dd>28</dd>
          </div>
          <div>
            <dt>Conversion</dt>
            <dd>53.6%</dd>
          </div>
        </dl>
      </section>

      <section className="auth-panel">
        <form className="auth-form" onSubmit={submit}>
          <p className="eyebrow">{mode === "signin" ? "Welcome back" : "Get started"}</p>
          <h2>{mode === "signin" ? "Sign in to Orbit" : "Create your workspace"}</h2>

          {mode === "signup" && (
            <>
              <label>
                Your name
                <input
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Alex Morgan"
                />
              </label>
              <label>
                Workspace name
                <input
                  required
                  value={form.organizationName}
                  onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
                  placeholder="Acme Studio"
                />
              </label>
            </>
          )}

          <label>
            Email address
            <input
              required
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@company.com"
            />
          </label>

          <label>
            Password
            <input
              required
              type="password"
              minLength={mode === "signup" ? 8 : undefined}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="primary auth-submit" disabled={pending}>
            {pending ? <Loader2 className="spin" /> : null}
            {mode === "signin" ? "Sign in" : "Create workspace"}
            {!pending && <ArrowRight />}
          </button>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <button type="button" className="auth-demo" onClick={exploreDemo} disabled={demoPending}>
            {demoPending ? <Loader2 className="spin" /> : <Sparkles />}
            {demoPending ? "Building your workspace…" : "Explore the demo"}
          </button>
          <p className="auth-demo-note">
            Opens a private workspace with sample data. Change anything you like — it is yours alone
            and disappears after a day.
          </p>

          <p className="auth-switch">
            {mode === "signin" ? "No workspace yet?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
              }}
            >
              {mode === "signin" ? "Create one" : "Sign in"}
            </button>
          </p>
        </form>
      </section>
    </div>
  );
}
