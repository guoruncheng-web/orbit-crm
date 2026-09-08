"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  BriefcaseBusiness,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Command,
  LayoutDashboard,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Customer, PageResult, Status, Summary, api } from "@/lib/api";
import { isUnauthorized, useAuth } from "@/lib/auth";
import { STATUSES, STATUS_LABEL } from "@/lib/customers";
import { count, formatDate, initials, money } from "@/lib/format";
import { ConfirmDelete } from "@/components/confirm-delete";
import { CustomerDialog } from "@/components/customer-dialog";

type View = "overview" | "customers";

const PAGE_SIZE = 8;

export default function DashboardPage() {
  const router = useRouter();
  const { status: authStatus, user, signOut } = useAuth();

  useEffect(() => {
    if (authStatus === "anonymous") router.replace("/login");
  }, [authStatus, router]);

  if (authStatus !== "authenticated" || !user) {
    return (
      <div className="boot">
        <span className="brand-mark">
          <Command size={18} />
        </span>
        <p>正在打开工作空间…</p>
      </div>
    );
  }

  return <Dashboard onSignOut={signOut} user={user} />;
}

function Dashboard({
  user,
  onSignOut,
}: {
  user: { name: string; email: string; organizationName: string };
  onSignOut: () => void;
}) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("overview");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status | "">("");
  const [page, setPage] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Customer | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const search = useDebounced(query, 300);

  // Any change to the filters invalidates the current page index.
  useEffect(() => setPage(0), [search, status]);

  const customers = useQuery({
    queryKey: ["customers", search, status, page],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        size: String(PAGE_SIZE),
      });
      if (search) params.set("q", search);
      if (status) params.set("status", status);
      return api<PageResult<Customer>>(`/customers?${params}`);
    },
    placeholderData: (previous) => previous,
  });

  const summary = useQuery({
    queryKey: ["summary"],
    queryFn: () => api<Summary>("/dashboard/summary"),
  });

  useEffect(() => {
    if (isUnauthorized(customers.error) || isUnauthorized(summary.error)) onSignOut();
  }, [customers.error, summary.error, onSignOut]);

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["customers"] });
    void queryClient.invalidateQueries({ queryKey: ["summary"] });
  };

  const remove = useMutation({
    mutationFn: (id: string) =>
      api<void>(`/customers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setPendingDelete(null);
      refresh();
    },
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, next }: { id: string; next: Status }) =>
      api<Customer>(`/customers/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      }),
    onSuccess: refresh,
  });

  const chartData = useMemo(
    () =>
      (summary.data?.revenue ?? []).map((point) => ({
        label: new Date(`${point.month}-01T00:00:00Z`).toLocaleDateString(
          "zh-CN",
          {
            month: "short",
            timeZone: "UTC",
          },
        ),
        value: point.value,
      })),
    [summary.data],
  );

  const addedThisYear = useMemo(
    () =>
      (summary.data?.revenue ?? []).reduce(
        (total, point) => total + point.value,
        0,
      ),
    [summary.data],
  );

  const totalPages = customers.data?.totalPages ?? 0;
  const rows = customers.data?.content ?? [];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">
            <Command size={17} />
          </span>
          <span>orbit</span>
          <button
            className="mobile-close"
            onClick={() => setMobileNav(false)}
            aria-label="关闭导航"
          >
            <X />
          </button>
        </div>

        <nav>
          <p className="nav-label">工作空间</p>
          <button
            className={`nav-item ${view === "overview" ? "active" : ""}`}
            aria-current={view === "overview" ? "page" : undefined}
            onClick={() => {
              setView("overview");
              setMobileNav(false);
            }}
          >
            <LayoutDashboard />
            总览
          </button>
          <button
            className={`nav-item ${view === "customers" ? "active" : ""}`}
            aria-current={view === "customers" ? "page" : undefined}
            onClick={() => {
              setView("customers");
              setMobileNav(false);
            }}
          >
            <Users />
            客户
            <span className="nav-count">{summary.data?.customers ?? "—"}</span>
          </button>
          {/* Marked rather than hidden: the demo shows what is built, and says
              plainly what is not, instead of offering links that go nowhere. */}
          <button className="nav-item" disabled>
            <BriefcaseBusiness />
            项目
            <span className="chip">规划中</span>
          </button>
          <button className="nav-item" disabled>
            <Activity />
            动态
            <span className="chip">规划中</span>
          </button>

          <p className="nav-label second">管理</p>
          <button className="nav-item" disabled>
            <Settings />
            设置
            <span className="chip">规划中</span>
          </button>
          <button className="nav-item" disabled>
            <CircleHelp />
            帮助
            <span className="chip">规划中</span>
          </button>
        </nav>

        <div className="profile">
          <span className="avatar">{initials(user.name)}</span>
          <span className="profile-id">
            <strong>{user.name}</strong>
            <small>{user.email}</small>
          </span>
          <button
            className="sign-out"
            onClick={onSignOut}
            title="退出登录"
            aria-label="退出登录"
          >
            <LogOut />
          </button>
        </div>
      </aside>

      {mobileNav && (
        <div className="scrim" onClick={() => setMobileNav(false)} />
      )}

      <main>
        <header className="topbar">
          <button
            className="menu"
            onClick={() => setMobileNav(true)}
            aria-label="打开导航"
          >
            <Menu />
          </button>
          <div className="mobile-logo">orbit</div>
          <a className="language-link" href="https://orbit-crm-web-xi.vercel.app" target="_blank" rel="noreferrer">
            English ↗
          </a>
          <AccountMenu user={user} onSignOut={onSignOut} />
        </header>

        <div className="content">
          <section className="welcome">
            <div>
              <p className="eyebrow">
                {view === "overview" ? todayLabel() : "工作空间"}
              </p>
              <h1>
                {view === "overview"
                  ? `${greeting()}, ${user.name.split(" ")[0]}.`
                  : "客户管理"}
              </h1>
              <p className="welcome-sub">
                {view === "customers"
                  ? "所有客户均可搜索、筛选并更新状态。"
                  : summary.data
                    ? `当前共管理 ${summary.data.customers} 位客户。`
                    : "正在读取客户数据…"}
              </p>
            </div>
            <button className="primary" onClick={() => setShowCreate(true)}>
              <Plus />
              添加客户
            </button>
          </section>

          {view === "overview" && (
            <>
              {/* Signature element: the whole book of business as one bar,
                  sized by contract value. Clicking a band filters the table. */}
              <section className="book">
                <div className="book-head">
                  <div>
                    <p className="card-label">客户合同总览</p>
                    <div className="book-total">
                      <strong className="pipeline-figure">
                        {money(summary.data?.pipeline)}
                      </strong>
                      <span>
                        来自 {summary.data?.customers ?? "—"} 位客户
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className="bar"
                  role="group"
                  aria-label="按客户状态统计合同金额"
                >
                  {summary.isLoading && (
                    <span
                      className="skeleton"
                      style={{ width: "100%", height: "100%" }}
                    />
                  )}
                  {STATUSES.map((entry) => {
                    const row = summary.data?.byStatus.find(
                      (item) => item.status === entry,
                    );
                    if (!row || row.value === 0) return null;

                    return (
                      <button
                        key={entry}
                        className={`bar-segment ${entry.toLowerCase()}`}
                        style={{ flexGrow: row.value }}
                        aria-pressed={status === entry}
                        title={`${STATUS_LABEL[entry]} — ${money(row.value)}，共 ${row.count} 位客户`}
                        onClick={() => setStatus(status === entry ? "" : entry)}
                      >
                        {money(row.value)}
                      </button>
                    );
                  })}
                </div>

                <div className="bar-legend">
                  {STATUSES.map((entry) => {
                    const row = summary.data?.byStatus.find(
                      (item) => item.status === entry,
                    );
                    return (
                      <span key={entry}>
                        <i className={entry.toLowerCase()} />
                        {STATUS_LABEL[entry]} · {row?.count ?? 0}
                      </span>
                    );
                  })}
                  <span className="bar-hint">点击色块筛选客户</span>
                </div>
              </section>

              <section className="metrics">
                <Metric
                  icon={<Wallet />}
                  label="管道金额"
                  value={money(summary.data?.pipeline)}
                  loading={summary.isLoading}
                />
                <Metric
                  icon={<Users />}
                  label="客户总数"
                  value={count(summary.data?.customers)}
                  loading={summary.isLoading}
                />
                <Metric
                  icon={<BriefcaseBusiness />}
                  label="合作中客户"
                  value={count(summary.data?.activeAccounts)}
                  loading={summary.isLoading}
                />
                <Metric
                  icon={<TrendingUp />}
                  label="转化率"
                  value={summary.data ? `${summary.data.conversionRate}%` : "—"}
                  loading={summary.isLoading}
                />
              </section>

              <article className="card revenue-card">
                <div className="card-head">
                  <div>
                    <p className="card-label">每月新增合同金额</p>
                    <h2>近一年累计 {money(addedThisYear)}</h2>
                  </div>
                  <button className="quiet">近 12 个月</button>
                </div>
                <div className="chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 4, right: 4, bottom: 0, left: -18 }}
                    >
                      <defs>
                        <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="0%"
                            stopColor="#275e4a"
                            stopOpacity={0.18}
                          />
                          <stop
                            offset="100%"
                            stopColor="#275e4a"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#e3e6e1" vertical={false} />
                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#9aa0a4", fontSize: 11 }}
                        dy={6}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#9aa0a4", fontSize: 11 }}
                        tickFormatter={(value) =>
                          value === 0
                            ? "0"
                            : `${Math.round(Number(value) / 1000)}k`
                        }
                        width={48}
                      />
                      <Tooltip
                        cursor={{ stroke: "#cfd4cd" }}
                        contentStyle={{
                          borderRadius: 10,
                          border: "1px solid #e3e6e1",
                          boxShadow: "0 12px 32px rgb(22 24 26 / 0.1)",
                          fontSize: 13,
                        }}
                        formatter={(value) => [money(Number(value)), "新增金额"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#275e4a"
                        strokeWidth={2}
                        fill="url(#fill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </article>
            </>
          )}

          <section className="card customer-card">
            <div className="customer-title">
              <div>
                <p className="card-label">客户</p>
                <h2>
                  {status ? `${STATUS_LABEL[status]}客户` : "全部客户"}
                </h2>
              </div>
              <span className="result-count">
                共 {customers.data?.totalElements ?? 0} 条
              </span>
            </div>

            <div className="table-tools">
              <label>
                <Search />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索姓名、公司或邮箱"
                />
              </label>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as Status | "")
                }
                aria-label="按状态筛选"
              >
                <option value="">全部状态</option>
                {STATUSES.map((entry) => (
                  <option key={entry} value={entry}>
                    {STATUS_LABEL[entry]}
                  </option>
                ))}
              </select>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>客户</th>
                    <th>状态</th>
                    <th>合同金额</th>
                    <th>最近联系</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {customers.isLoading &&
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index}>
                        <td>
                          <div className="cell-person">
                            <span
                              className="skeleton"
                              style={{ width: 32, height: 32, borderRadius: 8 }}
                            />
                            <span
                              className="skeleton"
                              style={{ width: 150, height: 12 }}
                            />
                          </div>
                        </td>
                        <td>
                          <span
                            className="skeleton"
                            style={{ width: 62, height: 20, borderRadius: 20 }}
                          />
                        </td>
                        <td>
                          <span
                            className="skeleton"
                            style={{ width: 66, height: 12 }}
                          />
                        </td>
                        <td>
                          <span
                            className="skeleton"
                            style={{ width: 84, height: 12 }}
                          />
                        </td>
                        <td />
                      </tr>
                    ))}

                  {customers.isError && (
                    <tr>
                      <td colSpan={5} className="state error">
                        <strong>
                          {isUnauthorized(customers.error)
                            ? "登录已失效"
                            : "暂时无法连接服务"}
                        </strong>
                        {isUnauthorized(customers.error)
                          ? "请重新登录后继续。"
                          : "请检查网络后重试。"}
                      </td>
                    </tr>
                  )}

                  {!customers.isLoading &&
                    rows.map((customer) => (
                      <tr key={customer.id}>
                        <td>
                          <div className="cell-person">
                            <span className="person">
                              {initials(customer.name)}
                            </span>
                            <span>
                              <strong>{customer.name}</strong>
                              <small>
                                {customer.company} · {customer.email}
                              </small>
                            </span>
                          </div>
                        </td>
                        <td>
                          <select
                            className={`badge-select ${customer.status.toLowerCase()}`}
                            value={customer.status}
                            disabled={changeStatus.isPending}
                            aria-label={`${customer.name} 的客户状态`}
                            onChange={(event) =>
                              changeStatus.mutate({
                                id: customer.id,
                                next: event.target.value as Status,
                              })
                            }
                          >
                            {STATUSES.map((entry) => (
                              <option key={entry} value={entry}>
                                {STATUS_LABEL[entry]}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <strong className="num">
                            {money(customer.value)}
                          </strong>
                        </td>
                        <td className="num">
                          {formatDate(customer.lastContact)}
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="row-action"
                              title={`编辑 ${customer.name}`}
                              aria-label={`编辑 ${customer.name}`}
                              onClick={() => setEditing(customer)}
                            >
                              <Pencil />
                            </button>
                            <button
                              className="row-action delete"
                              title={`删除 ${customer.name}`}
                              aria-label={`删除 ${customer.name}`}
                              onClick={() => setPendingDelete(customer)}
                            >
                              <Trash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                  {!customers.isLoading &&
                    !customers.isError &&
                    rows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="state">
                          <strong>没有符合条件的客户</strong>
                          请清除搜索词或选择其他状态。
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <span>
                  第 {page + 1} 页，共 {totalPages} 页
                </span>
                <div>
                  <button
                    disabled={page === 0}
                    onClick={() => setPage((current) => current - 1)}
                  >
                    <ChevronLeft />
                    上一页
                  </button>
                  <button
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    下一页
                    <ChevronRight />
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {showCreate && (
        <CustomerDialog
          onClose={() => setShowCreate(false)}
          onSaved={refresh}
        />
      )}

      {editing && (
        <CustomerDialog
          customer={editing}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}

      {pendingDelete && (
        <ConfirmDelete
          customer={pendingDelete}
          pending={remove.isPending}
          error={remove.error}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => remove.mutate(pendingDelete.id)}
        />
      )}
    </div>
  );
}

function AccountMenu({
  user,
  onSignOut,
}: {
  user: { name: string; email: string; organizationName: string };
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  // A menu that only closes on its own items is a trap on touch devices, so it
  // also closes on an outside press and on Escape.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="account" ref={wrapper}>
      <button
        className="workspace-tag"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="dot" />
        {user.organizationName}
        <ChevronDown />
      </button>

      {open && (
        <div className="account-menu" role="menu">
          <div className="account-head">
            <span className="avatar">{initials(user.name)}</span>
            <span className="profile-id">
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </span>
          </div>
          <p className="account-note">
            当前登录到 <strong>{user.organizationName}</strong>，这里的数据仅属于该工作空间。
          </p>
          <button
            className="account-action"
            role="menuitem"
            onClick={onSignOut}
          >
            <LogOut />
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  loading: boolean;
}) {
  return (
    <article className="metric card">
      <span className="metric-icon">{icon}</span>
      <p>{label}</p>
      {loading ? (
        <span className="skeleton" style={{ width: 96, height: 24 }} />
      ) : (
        <h2 className="metric-value">{value}</h2>
      )}
    </article>
  );
}

/** Keeps the search box responsive without firing a request per keystroke. */
function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}





function todayLabel(): string {
  return new Date().toLocaleDateString("zh-CN", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "早上好";
  return hour < 18 ? "下午好" : "晚上好";
}
