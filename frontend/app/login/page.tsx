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
      setError(caught instanceof Error ? caught.message : "登录失败，请稍后重试");
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
      setError(caught instanceof Error ? caught.message : "暂时无法创建演示空间");
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
        <a className="language-link" href="https://orbit-crm-web-xi.vercel.app" target="_blank" rel="noreferrer">
          English version ↗
        </a>
        <div className="auth-pitch">
          <h1>把每一段客户关系，放进清晰可执行的工作台。</h1>
          <p>
            集中管理销售管道、客户状态与月度合同金额，不再依赖散落的表格。
          </p>
        </div>
        {/* These describe the workspace the demo hands out, so they match what
            is actually seeded rather than being decorative round numbers. */}
        <dl className="auth-stats">
          <div>
            <dt>管道金额</dt>
            <dd>$428,900</dd>
          </div>
          <div>
            <dt>客户数</dt>
            <dd>28</dd>
          </div>
          <div>
            <dt>转化率</dt>
            <dd>53.6%</dd>
          </div>
        </dl>
      </section>

      <section className="auth-panel">
        <form className="auth-form" onSubmit={submit}>
          <p className="eyebrow">{mode === "signin" ? "欢迎回来" : "开始使用"}</p>
          <h2>{mode === "signin" ? "登录 Orbit" : "创建工作空间"}</h2>

          {mode === "signup" && (
            <>
              <label>
                您的姓名
                <input
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="陈晨"
                />
              </label>
              <label>
                工作空间名称
                <input
                  required
                  value={form.organizationName}
                  onChange={(e) => setForm({ ...form, organizationName: e.target.value })}
                  placeholder="超凡工作室"
                />
              </label>
            </>
          )}

          <label>
            邮箱地址
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
            密码
            <input
              required
              type="password"
              minLength={mode === "signup" ? 8 : undefined}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={mode === "signup" ? "至少 8 个字符" : "••••••••"}
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="primary auth-submit" disabled={pending}>
            {pending ? <Loader2 className="spin" /> : null}
            {mode === "signin" ? "登录" : "创建工作空间"}
            {!pending && <ArrowRight />}
          </button>

          <div className="auth-divider">
            <span>或</span>
          </div>

          <button type="button" className="auth-demo" onClick={exploreDemo} disabled={demoPending}>
            {demoPending ? <Loader2 className="spin" /> : <Sparkles />}
            {demoPending ? "正在创建专属空间…" : "直接体验演示"}
          </button>
          <p className="auth-demo-note">
            自动创建带示例数据的独立空间，可自由增删修改，24 小时后自动清理。
          </p>

          <p className="auth-switch">
            {mode === "signin" ? "还没有工作空间？" : "已经有账号？"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError(null);
              }}
            >
              {mode === "signin" ? "立即创建" : "去登录"}
            </button>
          </p>
        </form>
      </section>
    </div>
  );
}
