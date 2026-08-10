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
  Plus,
  Search,
  Settings,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Customer, PageResult, Status, Summary, api } from "@/lib/api";
import { isUnauthorized, useAuth } from "@/lib/auth";

type View = "overview" | "customers";

const STATUSES: Status[] = ["ACTIVE", "LEAD", "AT_RISK"];
const STATUS_LABEL: Record<Status, string> = {
  ACTIVE: "Active",
  LEAD: "Lead",
  AT_RISK: "At risk",
};
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
        <p>Opening your workspace…</p>
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
      api<Customer>(`/customers/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      }),
    onSuccess: refresh,
  });

  const chartData = useMemo(
    () =>
      (summary.data?.revenue ?? []).map((point) => ({
        label: new Date(`${point.month}-01T00:00:00Z`).toLocaleDateString(
          "en-US",
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
            aria-label="Close navigation"
          >
            <X />
          </button>
        </div>

        <nav>
          <p className="nav-label">Workspace</p>
          <button
            className={`nav-item ${view === "overview" ? "active" : ""}`}
            aria-current={view === "overview" ? "page" : undefined}
            onClick={() => {
              setView("overview");
              setMobileNav(false);
            }}
          >
            <LayoutDashboard />
            Overview
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
            Customers
            <span className="nav-count">{summary.data?.customers ?? "—"}</span>
          </button>
          {/* Marked rather than hidden: the demo shows what is built, and says
              plainly what is not, instead of offering links that go nowhere. */}
          <button className="nav-item" disabled>
            <BriefcaseBusiness />
            Projects
            <span className="chip">Soon</span>
          </button>
          <button className="nav-item" disabled>
            <Activity />
            Activity
            <span className="chip">Soon</span>
          </button>

          <p className="nav-label second">Manage</p>
          <button className="nav-item" disabled>
            <Settings />
            Settings
            <span className="chip">Soon</span>
          </button>
          <button className="nav-item" disabled>
            <CircleHelp />
            Help
            <span className="chip">Soon</span>
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
            title="Sign out"
            aria-label="Sign out"
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
            aria-label="Open navigation"
          >
            <Menu />
          </button>
          <div className="mobile-logo">orbit</div>
          <AccountMenu user={user} onSignOut={onSignOut} />
        </header>

        <div className="content">
          <section className="welcome">
            <div>
              <p className="eyebrow">
                {view === "overview" ? todayLabel() : "Workspace"}
              </p>
              <h1>
                {view === "overview"
                  ? `${greeting()}, ${user.name.split(" ")[0]}.`
                  : "Customers"}
              </h1>
              <p className="welcome-sub">
                {view === "customers"
                  ? "Every account on your book, searchable and filterable."
                  : summary.data
                    ? `${summary.data.customers} accounts on the books.`
                    : "Reading your book of business…"}
              </p>
            </div>
            <button className="primary" onClick={() => setShowCreate(true)}>
              <Plus />
              Add customer
            </button>
          </section>

          {view === "overview" && (
            <>
              {/* Signature element: the whole book of business as one bar,
                  sized by contract value. Clicking a band filters the table. */}
              <section className="book">
                <div className="book-head">
                  <div>
                    <p className="card-label">Book of business</p>
                    <div className="book-total">
                      <strong className="pipeline-figure">
                        {money(summary.data?.pipeline)}
                      </strong>
                      <span>
                        across {summary.data?.customers ?? "—"} accounts
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className="bar"
                  role="group"
                  aria-label="Contract value by status"
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
                        title={`${STATUS_LABEL[entry]} — ${money(row.value)} across ${row.count} accounts`}
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
                  <span className="bar-hint">Select a band to filter</span>
                </div>
              </section>

              <section className="metrics">
                <Metric
                  icon={<Wallet />}
                  label="Pipeline value"
                  value={money(summary.data?.pipeline)}
                  loading={summary.isLoading}
                />
                <Metric
                  icon={<Users />}
                  label="Total customers"
                  value={count(summary.data?.customers)}
                  loading={summary.isLoading}
                />
                <Metric
                  icon={<BriefcaseBusiness />}
                  label="Active accounts"
                  value={count(summary.data?.activeAccounts)}
                  loading={summary.isLoading}
                />
                <Metric
                  icon={<TrendingUp />}
                  label="Conversion rate"
                  value={summary.data ? `${summary.data.conversionRate}%` : "—"}
                  loading={summary.isLoading}
                />
              </section>

              <article className="card revenue-card">
                <div className="card-head">
                  <div>
                    <p className="card-label">Value added per month</p>
                    <h2>{money(addedThisYear)} in the last year</h2>
                  </div>
                  <button className="quiet">12 months</button>
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
                        formatter={(value) => [money(Number(value)), "Added"]}
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
                <p className="card-label">Customers</p>
                <h2>
                  {status ? `${STATUS_LABEL[status]} accounts` : "All accounts"}
                </h2>
              </div>
              <span className="result-count">
                {customers.data?.totalElements ?? 0} shown
              </span>
            </div>

            <div className="table-tools">
              <label>
                <Search />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search name, company or email"
                />
              </label>
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as Status | "")
                }
                aria-label="Filter by status"
              >
                <option value="">All statuses</option>
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
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Value</th>
                    <th>Last contact</th>
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
                            ? "Your session ended"
                            : "Could not reach the API"}
                        </strong>
                        {isUnauthorized(customers.error)
                          ? "Sign in again to pick up where you left off."
                          : "Check the connection and try again."}
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
                            aria-label={`Status for ${customer.name}`}
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
                          <button
                            className="delete"
                            title={`Delete ${customer.name}`}
                            aria-label={`Delete ${customer.name}`}
                            onClick={() => setPendingDelete(customer)}
                          >
                            <X />
                          </button>
                        </td>
                      </tr>
                    ))}

                  {!customers.isLoading &&
                    !customers.isError &&
                    rows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="state">
                          <strong>Nothing matches those filters</strong>
                          Clear the search or pick a different status.
                        </td>
                      </tr>
                    )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <span>
                  Page {page + 1} of {totalPages}
                </span>
                <div>
                  <button
                    disabled={page === 0}
                    onClick={() => setPage((current) => current - 1)}
                  >
                    <ChevronLeft />
                    Previous
                  </button>
                  <button
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                    <ChevronRight />
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {showCreate && (
        <CreateCustomer
          onClose={() => setShowCreate(false)}
          onCreated={refresh}
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
            Signed in to <strong>{user.organizationName}</strong>. Everything
            you see belongs to this workspace alone.
          </p>
          <button
            className="account-action"
            role="menuitem"
            onClick={onSignOut}
          >
            <LogOut />
            Sign out
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

function ConfirmDelete({
  customer,
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  customer: Customer;
  pending: boolean;
  error: unknown;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) =>
        event.target === event.currentTarget && onCancel()
      }
    >
      <div
        className="modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
      >
        <div className="modal-head">
          <div>
            <p className="eyebrow">Delete customer</p>
            <h2 id="confirm-delete-title">Remove {customer.name}?</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onCancel}
            aria-label="Close"
          >
            <X />
          </button>
        </div>

        <p className="modal-copy">
          {customer.company} leaves your book along with its{" "}
          {money(customer.value)} of contract value. This cannot be undone.
        </p>

        {error instanceof Error && (
          <p className="form-error">{error.message}</p>
        )}

        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onCancel}>
            Keep customer
          </button>
          <button
            type="button"
            className="primary danger"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? "Deleting…" : "Delete customer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateCustomer({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    status: "LEAD" as Status,
    value: "",
  });

  const create = useMutation({
    mutationFn: () =>
      api<Customer>("/customers", {
        method: "POST",
        body: JSON.stringify({ ...form, value: Number(form.value) }),
      }),
    onSuccess: () => {
      onCreated();
      onClose();
    },
  });

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <form
        className="modal"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
      >
        <div className="modal-head">
          <div>
            <p className="eyebrow">New account</p>
            <h2>Add a customer</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close"
          >
            <X />
          </button>
        </div>

        <div className="form-grid">
          <label>
            Full name
            <input
              required
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              placeholder="Jamie Chen"
            />
          </label>
          <label>
            Company
            <input
              required
              value={form.company}
              onChange={(event) =>
                setForm({ ...form, company: event.target.value })
              }
              placeholder="Acme Inc."
            />
          </label>
          <label className="wide">
            Email address
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
              placeholder="jamie@acme.com"
            />
          </label>
          <label>
            Pipeline status
            <select
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value as Status })
              }
            >
              {STATUSES.map((entry) => (
                <option key={entry} value={entry}>
                  {STATUS_LABEL[entry]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Contract value
            <input
              required
              min="0"
              step="0.01"
              type="number"
              value={form.value}
              onChange={(event) =>
                setForm({ ...form, value: event.target.value })
              }
              placeholder="12000"
            />
          </label>
        </div>

        {create.isError && (
          <p className="form-error">
            {create.error instanceof Error
              ? create.error.message
              : "Could not create customer."}
          </p>
        )}

        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={create.isPending}>
            {create.isPending ? "Adding…" : "Add customer"}
          </button>
        </div>
      </form>
    </div>
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

function money(value?: number): string {
  return value == null
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value);
}

function count(value?: number): string {
  return value == null ? "—" : String(value);
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function todayLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  return hour < 18 ? "Good afternoon" : "Good evening";
}
