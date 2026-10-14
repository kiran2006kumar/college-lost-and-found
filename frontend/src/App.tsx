import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  Clock3,
  Compass,
  FileQuestion,
  Filter,
  KeyRound,
  LoaderCircle,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  PackageCheck,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Shirt,
  Smartphone,
  Sparkles,
  X,
} from "lucide-react";
import {
  API_ORIGIN,
  api,
  jsonBody,
  type AdminStats,
  type Claim,
  type Dashboard,
  type Item,
  type Match,
  type Notification,
  type Stats,
  type User,
} from "./api";
import { useAuth } from "./useAuth";

const categories = [
  "Electronics",
  "Keys",
  "Clothing",
  "Bags",
  "Accessories",
  "Books",
  "Other",
];
const today = new Date().toISOString().slice(0, 10);
const categoryIcons: Record<string, typeof PackageCheck> = {
  Electronics: Smartphone,
  Keys: KeyRound,
  Clothing: Shirt,
  Bags: BriefcaseBusiness,
  Accessories: Sparkles,
  Books: BookOpen,
  Other: PackageCheck,
};
const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T12:00:00`));

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="browse" element={<Browse />} />
          <Route path="items/:itemId" element={<ItemDetail />} />
          <Route
            path="items/:itemId/edit"
            element={
              <Protected>
                <EditReport />
              </Protected>
            }
          />
          <Route
            path="report/:itemType"
            element={
              <Protected>
                <Report />
              </Protected>
            }
          />
          <Route path="login" element={<AuthPage register={false} />} />
          <Route path="register" element={<AuthPage register />} />
          <Route
            path="dashboard"
            element={
              <Protected>
                <DashboardPage />
              </Protected>
            }
          />
          <Route
            path="admin"
            element={
              <Protected admin>
                <AdminPage />
              </Protected>
            }
          />
          <Route path="about" element={<About />} />
          <Route path="help" element={<Help />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function Layout() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  function logout() {
    signOut();
    setOpen(false);
    navigate("/");
  }
  return (
    <div className="app-frame">
      <header className="topbar">
        <div className="topbar-inner">
          <Link className="brand" to="/">
            <span className="brand-mark">
              <Compass size={21} />
            </span>
            <span>
              Lost<span className="brand-light">Link</span>
            </span>
            <span className="brand-campus">CAMPUS</span>
          </Link>
          <button
            className="mobile-menu"
            onClick={() => setOpen(!open)}
            aria-label="Toggle navigation"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
          <nav
            className={`main-nav ${open ? "is-open" : ""}`}
            aria-label="Main navigation"
          >
            <NavLink to="/browse" onClick={() => setOpen(false)}>
              Browse items
            </NavLink>
            <NavLink to="/about" onClick={() => setOpen(false)}>
              How it works
            </NavLink>
            <NavLink to="/help" onClick={() => setOpen(false)}>
              Help
            </NavLink>
            {user ? (
              <>
                <NavLink
                  to={user.role === "admin" ? "/admin" : "/dashboard"}
                  onClick={() => setOpen(false)}
                >
                  {user.role === "admin" ? "Admin" : "My dashboard"}
                </NavLink>
                <span className="nav-user">{user.name.split(" ")[0]}</span>
                <button
                  className="nav-signout"
                  onClick={logout}
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" onClick={() => setOpen(false)}>
                  Sign in
                </NavLink>
                <Link
                  className="button button-small"
                  to="/register"
                  onClick={() => setOpen(false)}
                >
                  Join campus <ArrowRight size={15} />
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="main-content">
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="footer-inner">
          <Link className="brand footer-brand" to="/">
            <span className="brand-mark">
              <Compass size={18} />
            </span>
            Lost<span className="brand-light">Link</span>
          </Link>
          <span>Campus belongings, back where they belong.</span>
          <div className="footer-links">
            <Link to="/about">About</Link>
            <Link to="/help">Help &amp; safety</Link>
          </div>
          <span className="copyright">A campus community project</span>
        </div>
      </footer>
    </div>
  );
}

function Protected({
  children,
  admin = false,
}: {
  children: ReactNode;
  admin?: boolean;
}) {
  const { user, loading } = useAuth();
  if (loading) return <Loading label="Checking your session..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== "admin")
    return <Navigate to="/dashboard" replace />;
  return children;
}

function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="heading-copy">{description}</p>}
      </div>
      {action}
    </div>
  );
}
function Loading({ label = "Loading campus reports..." }: { label?: string }) {
  return (
    <div className="loading-state">
      <LoaderCircle className="spin" size={21} />
      <span>{label}</span>
    </div>
  );
}
function Notice({
  children,
  success = false,
}: {
  children: ReactNode;
  success?: boolean;
}) {
  return (
    <div
      className={`notice ${success ? "notice-success" : ""}`}
      role={success ? "status" : "alert"}
    >
      {success ? <CheckCircle2 size={17} /> : <FileQuestion size={17} />}
      {children}
    </div>
  );
}
function Empty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <PackageCheck size={22} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
function Badge({ type }: { type: string }) {
  return (
    <span
      className={`type-badge ${type === "lost" ? "badge-lost" : "badge-found"}`}
    >
      <span />
      {type}
    </span>
  );
}

function ItemCard({ item }: { item: Item }) {
  const Icon = categoryIcons[item.category] || PackageCheck;
  return (
    <Link className="item-card" to={`/items/${item.id}`}>
      <div className="item-photo">
        {item.image_path ? (
          <img
            src={`${API_ORIGIN}${item.image_path}`}
            alt={item.title}
            loading="lazy"
          />
        ) : (
          <div className="photo-placeholder">
            <Icon size={32} />
            <span>{item.category}</span>
          </div>
        )}
        <Badge type={item.item_type} />
      </div>
      <div className="item-card-content">
        <div className="item-card-title">
          <h3>{item.title}</h3>
          <ArrowRight size={15} />
        </div>
        <p className="item-card-location">
          <MapPin size={14} />
          {item.location}
        </p>
        <div className="item-card-meta">
          <span>{item.category}</span>
          <span>{formatDate(item.event_date)}</span>
        </div>
      </div>
    </Link>
  );
}

function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [lost, setLost] = useState<Item[]>([]);
  const [found, setFound] = useState<Item[]>([]);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const { user } = useAuth();
  useEffect(() => {
    let active = true;
    Promise.all([
      api<Stats>("/stats/public"),
      api<Item[]>("/items?item_type=lost&limit=4"),
      api<Item[]>("/items?item_type=found&limit=4"),
    ])
      .then(([s, l, f]) => {
        if (active) {
          setStats(s);
          setLost(l);
          setFound(f);
          setError("");
        }
      })
      .catch((e) => {
        if (active)
          setError(
            e instanceof Error ? e.message : "Could not load campus reports.",
          );
      });
    return () => {
      active = false;
    };
  }, [retry]);
  return (
    <>
      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="hero-kicker">
            <span className="live-dot" /> Your campus, looking out for you
          </span>
          <h1>
            Lost something?
            <br />
            <span>Start here.</span>
          </h1>
          <p>
            One campus board. A thousand extra pairs of eyes. Find what went
            missing or help something get home.
          </p>
          <div className="hero-actions">
            <Link className="button button-cyan" to="/report/lost">
              Report lost item <ArrowRight size={16} />
            </Link>
            <Link className="button button-glass" to="/report/found">
              Report a find <Plus size={16} />
            </Link>
          </div>
          <form className="hero-search" action="/browse">
            <Search size={18} />
            <input
              name="q"
              aria-label="Search items"
              placeholder="Try “blue backpack” or “library”"
            />
            <button aria-label="Search">
              <ArrowRight size={17} />
            </button>
          </form>
        </div>
        <span className="hero-photo-note">Hawthorne campus community</span>
      </section>
      <section className="stats-strip">
        <div className="stat-intro">
          <span className="stat-pulse" />
          Live campus board
        </div>
        <div className="stat-value">
          <strong>{stats?.active_reports ?? "—"}</strong>
          <span>open reports</span>
        </div>
        <div className="stat-value">
          <strong>{stats?.returned_items ?? "—"}</strong>
          <span>items returned</span>
        </div>
        <div className="stat-value">
          <strong>{stats?.campus_members ?? "—"}</strong>
          <span>campus members</span>
        </div>
        <Link className="stats-link" to="/browse">
          Explore reports <ArrowRight size={15} />
        </Link>
      </section>
      <section className="content-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Just posted</p>
            <h2>Lost around campus</h2>
          </div>
          <Link className="text-link" to="/browse?type=lost">
            See all lost items <ArrowRight size={15} />
          </Link>
        </div>
        {error ? (
          <Notice>
            {error}{" "}
            <button
              className="inline-action"
              onClick={() => setRetry(retry + 1)}
            >
              Try again
            </button>
          </Notice>
        ) : lost.length ? (
          <div className="item-grid">
            {lost.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <Empty title="Nothing reported lost yet">
            New reports will appear here as soon as students post them.
          </Empty>
        )}
      </section>
      <section className="content-section found-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Good finds</p>
            <h2>Recently found</h2>
          </div>
          <Link className="text-link" to="/browse?type=found">
            See all found items <ArrowRight size={15} />
          </Link>
        </div>
        {found.length ? (
          <div className="item-grid">
            {found.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <Empty title="No found reports just yet">
            If you picked something up, share it with campus.
          </Empty>
        )}
      </section>
      <section className="steps-band">
        <div className="steps-heading">
          <p className="eyebrow">A safe way back</p>
          <h2>
            From missing to
            <br />
            back in your hands.
          </h2>
          <p>
            LostLink helps people connect. Campus staff and students make the
            return happen.
          </p>
        </div>
        <div className="step-list">
          {[
            [
              "01",
              "Post the details",
              "Share what it is, where it was, and when.",
            ],
            [
              "02",
              "Check possible matches",
              "Similar reports show up with reasons they may match.",
            ],
            [
              "03",
              "Verify, then hand it over",
              "Use private evidence and a safe campus handoff.",
            ],
          ].map(([n, title, copy]) => (
            <div className="step-row" key={n}>
              <span>{n}</span>
              <div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="closing-cta">
        <div>
          <p className="eyebrow">Small action, big relief</p>
          <h2>Make the next good find yours.</h2>
        </div>
        <div className="closing-actions">
          <Link
            className="button button-dark"
            to={user ? "/dashboard" : "/register"}
          >
            {user ? "Open my dashboard" : "Join your campus"}{" "}
            <ArrowRight size={15} />
          </Link>
          <Link className="text-link" to="/help">
            Recovery &amp; safety <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </>
  );
}

function Browse() {
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<Item[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const page = Math.max(0, Number(params.get("page") || 0)),
    type = params.get("type") || "all",
    key = params.toString();
  const loading = loadedKey !== key;
  useEffect(() => {
    let active = true;
    const query = new URLSearchParams(key);
    query.delete("type");
    query.set("offset", String(page * 24));
    query.set("limit", "25");
    if (type !== "all") query.set("item_type", type);
    api<Item[]>(`/items?${query}`)
      .then((value) => {
        if (active) {
          setItems(value);
          setError("");
          setLoadedKey(key);
        }
      })
      .catch((e) => {
        if (active) {
          setError(e instanceof Error ? e.message : "Could not load reports.");
          setLoadedKey(key);
        }
      })
    return () => {
      active = false;
    };
  }, [key, page, type]);
  function update(name: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    next.delete("page");
    setParams(next);
  }
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    update("q", String(new FormData(event.currentTarget).get("q") || "").trim());
  }
  return (
    <div className="page-wrap">
      <PageHeading
        eyebrow="The campus board"
        title="Browse reports"
        description="Search recent lost and found reports from your campus community."
        action={
          <Link className="button button-dark" to="/report/lost">
            <Plus size={15} /> New report
          </Link>
        }
      />
      <div className="browse-toolbar">
        <div
          className="browse-type-tabs"
          role="tablist"
          aria-label="Report type"
        >
          {[
            ["all", "Everything"],
            ["lost", "Lost"],
            ["found", "Found"],
          ].map(([value, label]) => (
            <button
              key={value}
              role="tab"
              aria-selected={type === value}
              className={type === value ? "filter-tab selected" : "filter-tab"}
              onClick={() => update("type", value === "all" ? "" : value)}
            >
              {label}
            </button>
          ))}
        </div>
        <form className="browse-search" onSubmit={search}>
          <Search size={16} />
          <input
            aria-label="Search reports"
            placeholder="Search item, details, or place"
            key={params.get("q") || ""}
            name="q"
            defaultValue={params.get("q") || ""}
          />
          <button aria-label="Submit search">
            <ArrowRight size={15} />
          </button>
        </form>
      </div>
      <div className="filter-row">
        <label>
          <Filter size={14} />
          <select
            aria-label="Category"
            value={params.get("category") || ""}
            onChange={(e) => update("category", e.target.value)}
          >
            <option value="">Every category</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          <MapPin size={14} />
          <input
            aria-label="Location"
            placeholder="Campus location"
            value={params.get("location") || ""}
            onChange={(e) => update("location", e.target.value)}
          />
        </label>
        <label>
          <span>Status</span>
          <select
            aria-label="Report status"
            value={params.get("item_status") || "open"}
            onChange={(e) => update("item_status", e.target.value)}
          >
            <option value="open">Open</option>
            <option value="returned">Returned</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <label className="date-filter">
          <span>From</span>
          <input
            aria-label="Date from"
            type="date"
            value={params.get("date_from") || ""}
            onChange={(e) => update("date_from", e.target.value)}
          />
        </label>
        <label className="date-filter">
          <span>To</span>
          <input
            aria-label="Date to"
            type="date"
            value={params.get("date_to") || ""}
            onChange={(e) => update("date_to", e.target.value)}
          />
        </label>
        <label className="sort-filter">
          <ArrowDownUp size={14} />
          <select
            aria-label="Sort reports"
            value={params.get("sort") || "newest"}
            onChange={(e) => update("sort", e.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </div>
      {error && <Notice>{error}</Notice>}
      <div className="browse-results-heading">
        <span>
          {loading
            ? "Loading reports"
            : `${Math.min(24, items.length)} reports on this page`}
        </span>
        <span>Page {page + 1}</span>
      </div>
      {loading ? (
        <Loading />
      ) : items.length ? (
        <>
          <div className="item-grid browse-grid">
            {items.slice(0, 24).map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
          <div className="pagination">
            <button
              disabled={!page}
              onClick={() => update("page", String(page - 1))}
            >
              <ArrowLeft size={14} /> Previous
            </button>
            <button
              disabled={items.length <= 24}
              onClick={() => update("page", String(page + 1))}
            >
              Next <ArrowRight size={14} />
            </button>
          </div>
        </>
      ) : (
        <Empty title="No reports match those filters">
          Try a broader search or clear one of the filters.
        </Empty>
      )}
    </div>
  );
}

function ItemDetail() {
  const { itemId = "" } = useParams();
  const { user } = useAuth();
  const [item, setItem] = useState<Item | null>(null),
    [matches, setMatches] = useState<Match[]>([]),
    [error, setError] = useState(""),
    [evidence, setEvidence] = useState(""),
    [sent, setSent] = useState(false),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    api<Item>(`/items/${itemId}`)
      .then((value) => {
        if (active) setItem(value);
      })
      .catch((e) => {
        if (active)
          setError(e instanceof Error ? e.message : "Report not found.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [itemId]);
  useEffect(() => {
    if (user && item?.reporter_id === user.id)
      api<Match[]>(`/items/${item.id}/matches`)
        .then(setMatches)
        .catch(() => setMatches([]));
  }, [item, user]);
  async function claim(event: FormEvent) {
    event.preventDefault();
    try {
      await api(`/claims/items/${itemId}`, {
        method: "POST",
        body: jsonBody({ private_evidence: evidence }),
      });
      setSent(true);
      setEvidence("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not submit recovery request.",
      );
    }
  }
  if (loading)
    return (
      <div className="page-wrap">
        <Loading />
      </div>
    );
  if (!item)
    return (
      <div className="page-wrap">
        <Notice>{error || "Report not found."}</Notice>
        <Link className="text-link" to="/browse">
          <ArrowLeft size={15} /> All reports
        </Link>
      </div>
    );
  const canClaim =
    item.item_type === "found" &&
    item.status === "open" &&
    user?.id !== item.reporter_id;
  return (
    <div className="page-wrap detail-wrap">
      <Link className="back-link" to="/browse">
        <ArrowLeft size={15} /> All reports
      </Link>
      <div className="detail-layout">
        <article className="detail-main">
          <div className="detail-image">
            {item.image_path ? (
              <img src={`${API_ORIGIN}${item.image_path}`} alt={item.title} />
            ) : (
              <div className="photo-placeholder detail-placeholder">
                <PackageCheck size={48} />
                <span>No photo provided</span>
              </div>
            )}
            <Badge type={item.item_type} />
          </div>
          <div className="detail-title-row">
            <div>
              <div className="detail-tags">
                <Badge type={item.item_type} />
                <span className="category-chip">{item.category}</span>
              </div>
              <h1>{item.title}</h1>
            </div>
            <div className="detail-status-actions">
              <span className={`status-label status-${item.status}`}>
                {item.status.replace("_", " ")}
              </span>
              {user?.id === item.reporter_id && (
                <Link className="button button-outline button-compact" to={`/items/${item.id}/edit`}>
                  <Pencil size={13} /> Edit report
                </Link>
              )}
            </div>
          </div>
          <p className="detail-description">{item.description}</p>
          <dl className="detail-facts">
            <div>
              <dt>
                <MapPin size={14} /> Location
              </dt>
              <dd>{item.location}</dd>
            </div>
            <div>
              <dt>
                <Clock3 size={14} /> Date {item.item_type}
              </dt>
              <dd>{formatDate(item.event_date)}</dd>
            </div>
            <div>
              <dt>
                <ShieldCheck size={14} /> Reported by
              </dt>
              <dd>{item.reporter_name}</dd>
            </div>
            {item.color && (
              <div>
                <dt>Color</dt>
                <dd>{item.color}</dd>
              </div>
            )}
            {item.handed_to_custodian && (
              <div>
                <dt>
                  <PackageCheck size={14} /> Custody
                </dt>
                <dd>With an authorized campus office</dd>
              </div>
            )}
          </dl>
          {canClaim && (
            <section className="claim-panel">
              <p className="eyebrow">Recovery request</p>
              <h2>Think this could be yours?</h2>
              <p>
                Share a detail only the owner would know. Evidence is private to
                the reporter and campus administrators.
              </p>
              {!user ? (
                <Link className="button button-dark" to="/login">
                  Sign in to request this item <ArrowRight size={15} />
                </Link>
              ) : sent ? (
                <Notice success>Your private recovery request was sent.</Notice>
              ) : (
                <form onSubmit={claim}>
                  <label htmlFor="evidence">Private identifying details</label>
                  <textarea
                    id="evidence"
                    value={evidence}
                    onChange={(e) => setEvidence(e.target.value)}
                    minLength={20}
                    maxLength={3000}
                    required
                    placeholder="Describe a distinguishing mark, contents, or other proof."
                  />
                  <button className="button button-dark">
                    Send private request <ArrowRight size={15} />
                  </button>
                </form>
              )}
              {error && <Notice>{error}</Notice>}
            </section>
          )}
          {matches.length > 0 && (
            <section className="suggested-matches">
              <p className="eyebrow">AI-assisted suggestions</p>
              <h2>Possible matches</h2>
              {matches.map((match) => (
                <MatchRow key={match.id} match={match} />
              ))}
              <p className="quiet-note">
                Similarity is a lead, not proof of ownership.
              </p>
            </section>
          )}
        </article>
        <aside className="detail-aside">
          <div className="aside-card">
            <span className="aside-icon">
              <ShieldCheck size={19} />
            </span>
            <h2>Keep recovery safe</h2>
            <p>
              Meet at a staffed campus office. Verify privately before handover.
            </p>
            <Link to="/help" className="text-link">
              Safety guidelines <ArrowRight size={14} />
            </Link>
          </div>
          <div className="aside-card aside-card-soft">
            <span className="eyebrow">Report ID</span>
            <p className="report-id">{item.id}</p>
            <p>Posted {formatDate(item.created_at)}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
function EditReport() {
  const { itemId = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    api<Item>(`/items/${itemId}`)
      .then((value) => {
        if (active) setItem(value);
      })
      .catch((reason) => {
        if (active)
          setError(
            reason instanceof Error ? reason.message : "Report could not be loaded.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [itemId]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!item) return;
    setSaving(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api(`/items/${item.id}`, {
        method: "PATCH",
        body: jsonBody({
          title: form.get("title"),
          category: form.get("category"),
          color: form.get("color") || null,
          description: form.get("description"),
          location: form.get("location"),
          event_date: form.get("event_date"),
          handed_to_custodian: form.get("handed_to_custodian") === "on",
        }),
      });
      navigate(`/items/${item.id}`);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Report could not be updated.",
      );
    } finally {
      setSaving(false);
    }
  }
  if (loading) return <div className="page-wrap"><Loading /></div>;
  if (!item || (item.reporter_id !== user?.id && user?.role !== "admin")) {
    return (
      <div className="page-wrap">
        <Notice>{error || "Only the report owner can edit this item."}</Notice>
        <Link className="text-link" to="/browse">Back to reports <ArrowLeft size={15} /></Link>
      </div>
    );
  }
  return (
    <div className="page-wrap form-page">
      <Link className="back-link" to={`/items/${item.id}`}><ArrowLeft size={15} /> Cancel</Link>
      <div className="edit-report-wrap">
        <PageHeading eyebrow="Update report" title="Edit item details" description="Keep public details accurate; leave one identifying detail private for recovery verification." />
        <form className="form-panel" onSubmit={submit}>
          {error && <Notice>{error}</Notice>}
          <div className="field-grid">
            <label className="field field-wide"><span>Item name *</span><input name="title" required minLength={2} maxLength={120} defaultValue={item.title} /></label>
            <label className="field"><span>Category *</span><select name="category" required defaultValue={item.category}>{categories.map(category => <option key={category}>{category}</option>)}</select></label>
            <label className="field"><span>Color</span><input name="color" maxLength={60} defaultValue={item.color || ""} /></label>
            <label className="field field-wide"><span>Description *</span><textarea name="description" required minLength={8} maxLength={3000} rows={4} defaultValue={item.description} /></label>
            <label className="field field-wide"><span>Campus location *</span><input name="location" required minLength={2} maxLength={160} defaultValue={item.location} /></label>
            <label className="field"><span>Date {item.item_type} *</span><input name="event_date" type="date" required max={today} defaultValue={item.event_date} /></label>
            {item.item_type === "found" && <label className="check-field"><input type="checkbox" name="handed_to_custodian" defaultChecked={item.handed_to_custodian} /><span>Handed to an authorized campus office</span></label>}
          </div>
          <div className="form-submit-row"><p><ShieldCheck size={15} />Your contact details remain private.</p><button className="button button-dark" disabled={saving}>{saving ? "Saving..." : "Save changes"} <Check size={15} /></button></div>
        </form>
      </div>
    </div>
  );
}

function MatchRow({ match }: { match: Match }) {
  const [review, setReview] = useState("");
  const [error, setError] = useState("");
  async function submitFeedback(review_status: "confirmed" | "rejected") {
    try {
      await api(`/items/${match.source_item_id}/matches/${match.id}`, {
        method: "PATCH",
        body: jsonBody({ review_status }),
      });
      setReview(review_status);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not update match feedback.",
      );
    }
  }
  return (
    <div className="match-row">
      <Link className="match-link" to={`/items/${match.item.id}`}>
        <span className="match-score">
          {Math.round(match.score)}
          <small>%</small>
        </span>
        <span className="match-copy">
          <strong>{match.item.title}</strong>
          <span>
            {match.explanation.join(" · ") || "Similar report details"}
          </span>
        </span>
        <ArrowRight size={15} />
      </Link>
      <div className="match-actions">
        {review ? (
          <span className="match-reviewed">{review}</span>
        ) : (
          <>
            <button
              title="Confirm possible match"
              aria-label="Confirm possible match"
              onClick={() => submitFeedback("confirmed")}
            >
              <Check size={14} />
            </button>
            <button
              title="Reject possible match"
              aria-label="Reject possible match"
              onClick={() => submitFeedback("rejected")}
            >
              <X size={14} />
            </button>
          </>
        )}
      </div>
      {error && (
        <span className="match-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

function Report() {
  const { itemType = "lost" } = useParams(),
    lost = itemType !== "found",
    navigate = useNavigate();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget),
      file = form.get("image");
    try {
      const item = await api<Item>("/items", {
        method: "POST",
        body: jsonBody({
          item_type: lost ? "lost" : "found",
          title: form.get("title"),
          category: form.get("category"),
          description: form.get("description"),
          color: form.get("color") || null,
          location: form.get("location"),
          event_date: form.get("event_date"),
          handed_to_custodian: form.get("handed_to_custodian") === "on",
        }),
      });
      if (file instanceof File && file.size) {
        const image = new FormData();
        image.append("image", file);
        await api(`/items/${item.id}/image`, { method: "POST", body: image });
      }
      navigate(`/items/${item.id}`);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Report could not be submitted.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="page-wrap form-page">
      <Link className="back-link" to="/browse">
        <ArrowLeft size={15} /> Back to reports
      </Link>
      <div className="report-layout">
        <div className="report-intro">
          <p className="eyebrow">
            {lost ? "Help find what went missing" : "Help someone get it back"}
          </p>
          <h1>Report a {lost ? "lost" : "found"} item.</h1>
          <p>
            {lost
              ? "Share enough for someone to recognize it. Keep one detail private for verification."
              : "Describe what you found and where. Leave a unique mark private."}
          </p>
          <div className="privacy-note">
            <ShieldCheck size={18} />
            Contact email stays private; requests come through LostLink.
          </div>
        </div>
        <form className="form-panel" onSubmit={submit}>
          <div className="form-panel-head">
            <span className="form-step">01 / REPORT DETAILS</span>
            <span className="required-note">* Required</span>
          </div>
          {error && <Notice>{error}</Notice>}
          <div className="field-grid">
            <label className="field field-wide">
              <span>
                Item name <b>*</b>
              </span>
              <input
                name="title"
                required
                minLength={2}
                maxLength={120}
                placeholder="e.g. Navy canvas backpack"
              />
            </label>
            <label className="field">
              <span>
                Category <b>*</b>
              </span>
              <select name="category" required defaultValue="">
                <option value="" disabled>
                  Select one
                </option>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Color</span>
              <input name="color" maxLength={60} placeholder="e.g. Navy blue" />
            </label>
            <label className="field field-wide">
              <span>
                Description <b>*</b>
              </span>
              <textarea
                name="description"
                required
                minLength={8}
                maxLength={3000}
                rows={4}
                placeholder="General details only. Keep one identifying detail private."
              />
            </label>
            <label className="field field-wide">
              <span>
                {lost ? "Where last seen?" : "Where found?"} <b>*</b>
              </span>
              <input
                name="location"
                required
                maxLength={160}
                placeholder="Building, room, or campus landmark"
              />
            </label>
            <label className="field">
              <span>
                {lost ? "Date lost" : "Date found"} <b>*</b>
              </span>
              <input
                name="event_date"
                type="date"
                required
                max={today}
                defaultValue={today}
              />
            </label>
            <label className="field">
              <span>Photo (optional)</span>
              <input
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
              />
              <small>JPEG, PNG, WebP · 5 MB max</small>
            </label>
            {!lost && (
              <label className="check-field field-wide">
                <input type="checkbox" name="handed_to_custodian" />
                <span>Handed to an authorized campus office</span>
              </label>
            )}
          </div>
          <div className="form-submit-row">
            <p>
              <ShieldCheck size={15} />
              Your email is never shown publicly.
            </p>
            <button className="button button-dark" disabled={busy}>
              {busy ? "Submitting..." : "Publish report"}{" "}
              <ArrowRight size={15} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AuthPage({ register }: { register: boolean }) {
  const { user, signIn, signUp } = useAuth(),
    navigate = useNavigate();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  if (user)
    return (
      <Navigate to={user.role === "admin" ? "/admin" : "/dashboard"} replace />
    );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      if (register)
        await signUp(
          String(form.get("name")),
          String(form.get("email")),
          String(form.get("password")),
        );
      else
        await signIn(String(form.get("email")), String(form.get("password")));
      navigate("/dashboard", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-layout">
      <div className="auth-image">
        <div>
          <span className="hero-kicker">
            <span className="live-dot" /> LostLink campus network
          </span>
          <h1>
            Good things
            <br />
            find their way
            <br />
            <span>back.</span>
          </h1>
          <p>Report, follow matches, and arrange a safe campus handoff.</p>
        </div>
        <small>A little help goes a long way.</small>
      </div>
      <section className="auth-form-wrap">
        <Link className="back-link" to="/">
          <ArrowLeft size={15} /> Home
        </Link>
        <div className="auth-form-content">
          <p className="eyebrow">
            {register ? "Join your campus" : "Welcome back"}
          </p>
          <h2>{register ? "Create your account" : "Sign in to LostLink"}</h2>
          <p className="heading-copy">
            Use your college email if required by your campus.
          </p>
          {error && <Notice>{error}</Notice>}
          <form className="auth-form" onSubmit={submit}>
            {register && (
              <label className="field">
                <span>
                  Full name <b>*</b>
                </span>
                <input
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={100}
                />
              </label>
            )}
            <label className="field">
              <span>
                College email <b>*</b>
              </span>
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@college.edu"
              />
            </label>
            <label className="field">
              <span>
                Password <b>*</b>
              </span>
              <input
                name="password"
                type="password"
                autoComplete={register ? "new-password" : "current-password"}
                minLength={register ? 10 : 1}
                required
                maxLength={128}
              />
            </label>
            <button className="button button-dark button-wide" disabled={busy}>
              {busy
                ? "Please wait..."
                : register
                  ? "Create account"
                  : "Sign in"}{" "}
              <ArrowRight size={15} />
            </button>
          </form>
          <p className="auth-switch">
            {register ? "Already registered?" : "New to LostLink?"}{" "}
            <Link to={register ? "/login" : "/register"}>
              {register ? "Sign in" : "Create an account"}
            </Link>
          </p>
          <p className="auth-legal">
            Use LostLink responsibly and follow campus recovery guidelines.
          </p>
        </div>
      </section>
    </div>
  );
}

function DashboardPage() {
  const { user, reloadProfile } = useAuth();
  const [data, setData] = useState<Dashboard | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [name, setName] = useState(user?.name || ""),
    [profileMessage, setProfileMessage] = useState(""),
    [claimMessage, setClaimMessage] = useState(""),
    [passwordMessage, setPasswordMessage] = useState("");
  async function load() {
    try {
      setData(await api<Dashboard>("/dashboard/me"));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load dashboard.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);
  async function close(item: Item) {
    if (!window.confirm(`Close “${item.title}”?`)) return;
    try {
      await api(`/items/${item.id}`, {
        method: "PATCH",
        body: jsonBody({ status: "closed" }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not close report.");
    }
  }
  async function confirmReturn(claim: Claim) {
    if (!window.confirm("Confirm that the item was safely handed back?")) return;
    try {
      await api(`/claims/${claim.id}`, {
        method: "PATCH",
        body: jsonBody({ status: "completed" }),
      });
      setClaimMessage("Return confirmed. The found report is now marked returned.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not confirm the return.");
    }
  }
  async function read(note: Notification) {
    if (note.is_read) return;
    try {
      await api(`/notifications/${note.id}/read`, { method: "POST" });
      setData((current) =>
        current
          ? {
              ...current,
              notifications: current.notifications.map((n) =>
                n.id === note.id ? { ...n, is_read: true } : n,
              ),
              unread_notifications: Math.max(
                0,
                current.unread_notifications - 1,
              ),
            }
          : current,
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not mark notification read.",
      );
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      await api("/auth/me", { method: "PATCH", body: jsonBody({ name }) });
      await reloadProfile();
      setProfileMessage("Profile updated.");
    } catch (e) {
      setProfileMessage(
        e instanceof Error ? e.message : "Could not update profile.",
      );
    }
  }
  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMessage("");
    const form = new FormData(event.currentTarget);
    try {
      await api("/auth/me", {
        method: "PATCH",
        body: jsonBody({
          current_password: form.get("current_password"),
          new_password: form.get("new_password"),
        }),
      });
      event.currentTarget.reset();
      setPasswordMessage("Password updated.");
    } catch (e) {
      setPasswordMessage(
        e instanceof Error ? e.message : "Could not update password.",
      );
    }
  }
  const openLost =
      data?.reports.filter((i) => i.item_type === "lost" && i.status === "open")
        .length || 0,
    openFound =
      data?.reports.filter(
        (i) => i.item_type === "found" && i.status === "open",
      ).length || 0;
  return (
    <div className="page-wrap">
      <PageHeading
        eyebrow="Your LostLink"
        title={`Good to see you, ${user?.name.split(" ")[0]}.`}
        description="Track reports, possible matches, and recovery requests."
        action={
          <Link className="button button-dark" to="/report/lost">
            <Plus size={15} /> New report
          </Link>
        }
      />
      {error && <Notice>{error}</Notice>}
      {busy ? (
        <Loading label="Loading your dashboard..." />
      ) : (
        <>
          <div className="dashboard-stats">
            {[
              ["Open lost", openLost],
              ["Open found", openFound],
              [
                "My claims",
                data?.claims.filter((c) => c.claimant_id === user?.id).length ||
                  0,
              ],
              ["Unread updates", data?.unread_notifications || 0],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className="dashboard-columns">
            <section className="dashboard-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Your activity</p>
                  <h2>My reports</h2>
                </div>
                <Link to="/report/found" className="text-link">
                  Report a find <Plus size={14} />
                </Link>
              </div>
              {data?.reports.length ? (
                data.reports.map((item) => (
                  <div className="dashboard-report" key={item.id}>
                    <span className="dashboard-report-icon">
                      <PackageCheck size={18} />
                    </span>
                    <div className="dashboard-report-copy">
                      <Link to={`/items/${item.id}`}>
                        <strong>{item.title}</strong>
                      </Link>
                      <span>
                        <Badge type={item.item_type} /> · {item.location} ·{" "}
                        {item.status.replace("_", " ")}
                      </span>
                      <Link className="report-edit-link" to={`/items/${item.id}/edit`}>
                        <Pencil size={12} /> Edit report
                      </Link>
                    </div>
                    {item.status === "open" && (
                      <button
                        className="icon-button"
                        title="Close report"
                        aria-label={`Close ${item.title}`}
                        onClick={() => close(item)}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <Empty title="No reports yet">
                  New lost or found reports appear here.
                </Empty>
              )}
            </section>
            <section className="dashboard-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Stay in the loop</p>
                  <h2>
                    Notifications{" "}
                    <span className="count-pill">
                      {data?.unread_notifications || 0}
                    </span>
                  </h2>
                </div>
                <Bell size={19} />
              </div>
              {data?.notifications.length ? (
                data.notifications.slice(0, 8).map((note) => (
                  <button
                    className={`notification-row ${note.is_read ? "" : "unread"}`}
                    key={note.id}
                    onClick={() => read(note)}
                  >
                    <span className="notification-dot" />
                    <span>
                      <strong>{note.title}</strong>
                      <small>{note.message}</small>
                      <time>{formatDate(note.created_at)}</time>
                    </span>
                  </button>
                ))
              ) : (
                <Empty title="You're all caught up">
                  Match and claim updates appear here.
                </Empty>
              )}
            </section>
          </div>
          <section className="dashboard-section full-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Worth a closer look</p>
                <h2>Suggested matches</h2>
              </div>
              <Sparkles size={19} />
            </div>
            {data?.matches.length ? (
              data.matches.map((match) => (
                <MatchRow key={match.id} match={match} />
              ))
            ) : (
              <Empty title="No possible matches yet">
                Relevant reports will appear here when found.
              </Empty>
            )}
          </section>
          <section className="dashboard-section full-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Recovery progress</p>
                <h2>My claims</h2>
              </div>
              <MessageCircle size={19} />
            </div>
            {claimMessage && <Notice success>{claimMessage}</Notice>}
            {data?.claims.length ? (
              data.claims.map((claim) => (
                <div className="claim-row" key={claim.id}>
                  <div>
                    <strong>Report {claim.item_id.slice(0, 8)}</strong>
                    <p>{claim.private_evidence}</p>
                    <span className={`status-label status-${claim.status}`}>
                      {claim.status.replace("_", " ")}
                    </span>
                  </div>
                  <span className="claim-date">
                    {formatDate(claim.created_at)}
                  </span>
                  {claim.status === "approved" &&
                    data.reports.some((report) => report.id === claim.item_id) && (
                      <button
                        className="button button-approve button-compact"
                        onClick={() => confirmReturn(claim)}
                      >
                        <Check size={13} /> Confirm return
                      </button>
                    )}
                </div>
              ))
            ) : (
              <Empty title="No claim requests">
                Private requests and status changes are tracked here.
              </Empty>
            )}
          </section>
          <section className="profile-panel">
            <div>
              <p className="eyebrow">Account</p>
              <h2>Profile settings</h2>
              <p>{user?.email}</p>
            </div>
            <form onSubmit={save} className="profile-edit">
              <label htmlFor="profile-name">Display name</label>
              <input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={100}
              />
              <button className="button button-outline">Save name</button>
              {profileMessage && <span role="status">{profileMessage}</span>}
            </form>
            <form onSubmit={savePassword} className="profile-password-edit">
              <label>
                Current password
                <input name="current_password" type="password" autoComplete="current-password" required />
              </label>
              <label>
                New password
                <input name="new_password" type="password" autoComplete="new-password" minLength={10} maxLength={128} required />
              </label>
              <button className="button button-outline">Update password</button>
              {passwordMessage && <span role="status">{passwordMessage}</span>}
            </form>
          </section>
        </>
      )}
    </div>
  );
}

function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null),
    [claims, setClaims] = useState<Claim[]>([]),
    [users, setUsers] = useState<User[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [message, setMessage] = useState("");
  const { user: currentUser } = useAuth();
  async function load() {
    try {
      const [s, c, u] = await Promise.all([
        api<AdminStats>("/admin/stats"),
        api<Claim[]>("/admin/claims"),
        api<User[]>("/admin/users"),
      ]);
      setStats(s);
      setClaims(c);
      setUsers(u);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load admin data.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);
  async function review(claim: Claim, status: string) {
    try {
      await api(`/claims/${claim.id}`, {
        method: "PATCH",
        body: jsonBody({ status }),
      });
      setMessage(`Claim ${status.replace("_", " ")}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Claim update failed.");
    }
  }
  async function changeRole(person: User, role: string) {
    try {
      await api(`/admin/users/${person.id}/role?role=${role}`, {
        method: "PATCH",
      });
      setMessage(`${person.name}'s role updated.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Role update failed.");
    }
  }
  return (
    <div className="page-wrap">
      <PageHeading
        eyebrow="Campus operations"
        title="Administrator dashboard"
        description="Review campus activity and manage recovery requests."
      />
      {error && <Notice>{error}</Notice>}
      {message && <Notice success>{message}</Notice>}
      {busy ? (
        <Loading label="Loading campus activity..." />
      ) : (
        stats && (
          <>
            <div className="admin-metrics">
              {[
                ["Members", stats.users],
                ["Lost reports", stats.lost_reports],
                ["Found reports", stats.found_reports],
                ["Claims to review", stats.pending_claims],
                ["Returned", stats.returned_items],
              ].map(([label, value]) => (
                <div className="metric-card" key={label}>
                  <strong>{value}</strong>
                  <small>{label}</small>
                </div>
              ))}
            </div>
            <div className="admin-grid">
              <section className="dashboard-section">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Private evidence</p>
                    <h2>Pending claims</h2>
                  </div>
                </div>
                {claims.length ? (
                  claims.map((claim) => (
                    <article className="admin-claim" key={claim.id}>
                      <div className="admin-claim-head">
                        <strong>Report {claim.item_id.slice(0, 8)}</strong>
                        <span className={`status-label status-${claim.status}`}>
                          {claim.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="admin-claim-meta">
                        Submitted {formatDate(claim.created_at)}
                      </p>
                      <blockquote>{claim.private_evidence}</blockquote>
                      <div className="admin-actions">
                        <button
                          className="button button-outline button-compact"
                          onClick={() => review(claim, "under_review")}
                        >
                          Under review
                        </button>
                        <button
                          className="button button-approve button-compact"
                          onClick={() => review(claim, "approved")}
                        >
                          <Check size={13} /> Approve
                        </button>
                        <button
                          className="button button-reject button-compact"
                          onClick={() => {
                            if (window.confirm("Reject this recovery request?"))
                              void review(claim, "rejected");
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <Empty title="No claims waiting">
                    New requests will show here.
                  </Empty>
                )}
              </section>
              <section className="dashboard-section">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Platform activity</p>
                    <h2>Recent reports</h2>
                  </div>
                </div>
                <ModerationPanel reports={stats.recent_reports} />
                <div className="bar-groups">
                  <h3>Reports by category</h3>
                  {stats.by_category.map((row) => (
                    <BarRow
                      key={row.category}
                      label={row.category}
                      count={row.count}
                      max={Math.max(
                        1,
                        ...stats.by_category.map((x) => x.count),
                      )}
                    />
                  ))}
                  <h3>Campus locations</h3>
                  {stats.by_location.map((row) => (
                    <BarRow
                      key={row.location}
                      label={row.location}
                      count={row.count}
                      max={Math.max(
                        1,
                        ...stats.by_location.map((x) => x.count),
                      )}
                    />
                  ))}
                </div>
              </section>
            </div>
            <section className="dashboard-section full-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Access control</p>
                  <h2>Manage campus roles</h2>
                </div>
                <ShieldCheck size={19} />
              </div>
              <div className="user-table">
                <div className="user-table-head">
                  <span>Member</span>
                  <span>Joined</span>
                  <span>Role</span>
                </div>
                {users.map((person) => (
                  <div className="user-row" key={person.id}>
                    <span>
                      <strong>{person.name}</strong>
                      <small>{person.email}</small>
                    </span>
                    <span>{formatDate(person.created_at)}</span>
                    <select
                      aria-label={`Role for ${person.name}`}
                      value={person.role}
                      disabled={person.id === currentUser?.id}
                      onChange={(e) => changeRole(person, e.target.value)}
                    >
                      <option value="student">Student</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                ))}
              </div>
            </section>
          </>
        )
      )}
    </div>
  );
}
function ModerationPanel({
  reports,
}: {
  reports: AdminStats["recent_reports"];
}) {
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<
    {
      id: string;
      action: string;
      affected_type: string;
      affected_id: string;
      created_at: string;
    }[]
  >([]);
  const [message, setMessage] = useState("");
  useEffect(() => {
    api<typeof logs>("/admin/audit-logs")
      .then(setLogs)
      .catch(() => setLogs([]));
  }, []);
  async function updateStatus(id: string, item_status: string) {
    try {
      await api(`/admin/items/${id}/status?item_status=${item_status}`, {
        method: "PATCH",
      });
      setStatuses((current) => ({ ...current, [id]: item_status }));
      setMessage("Report status updated.");
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Could not update report status.",
      );
    }
  }
  return (
    <>
      <div className="admin-report-list">
        {reports.map((report) => (
          <div className="admin-report-row" key={report.id}>
            <Link to={`/items/${report.id}`}>
              <strong>{report.title}</strong>
              <small>{report.item_type}</small>
            </Link>
            <select
              aria-label={`Moderate ${report.title}`}
              value={statuses[report.id] || report.status}
              onChange={(e) => updateStatus(report.id, e.target.value)}
            >
              <option value="open">Open</option>
              <option value="returned">Returned</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        ))}
      </div>
      {message && (
        <p className="admin-inline-message" role="status">
          {message}
        </p>
      )}
      <div className="admin-audit">
        <h3>Recent audit activity</h3>
        {logs.length ? (
          logs.slice(0, 8).map((log) => (
            <div className="audit-row" key={log.id}>
              <span>
                <strong>{log.action.replaceAll(".", " ")}</strong>
                <small>
                  {log.affected_type} · {log.affected_id.slice(0, 8)}
                </small>
              </span>
              <time>{formatDate(log.created_at)}</time>
            </div>
          ))
        ) : (
          <p className="quiet-note">
            Administrative actions will be recorded here.
          </p>
        )}
      </div>
    </>
  );
}

function BarRow({
  label,
  count,
  max,
}: {
  label: string;
  count: number;
  max: number;
}) {
  return (
    <div className="bar-row">
      <span>{label}</span>
      <div className="bar-track">
        <span style={{ width: `${Math.max(5, (count / max) * 100)}%` }} />
      </div>
      <strong>{count}</strong>
    </div>
  );
}

function About() {
  return (
    <div className="page-wrap about-wrap">
      <PageHeading
        eyebrow="About LostLink"
        title={
          <>
            A campus is better
            <br />
            when it looks out for itself.
          </>
        }
        description="LostLink brings reports, possible matches, and safe recovery requests together in one campus community space."
      />
      <div className="about-image">
        <span>One campus. More eyes on what matters.</span>
      </div>
      <div className="about-grid">
        <section>
          <p className="eyebrow">The problem</p>
          <h2>Good belongings go missing. The process shouldn't.</h2>
          <p>
            Disconnected office lists and scattered posts make a simple return
            harder than it needs to be.
          </p>
        </section>
        <section>
          <p className="eyebrow">The approach</p>
          <h2>A shared board, with privacy built in.</h2>
          <p>
            Similarity can connect likely reports, while private recovery
            evidence and human review protect the handoff.
          </p>
        </section>
      </div>
      <section className="steps-band">
        <div className="steps-heading">
          <p className="eyebrow">Recovery process</p>
          <h2>Clarity at every step.</h2>
        </div>
        <div className="step-list">
          <div className="step-row">
            <span>01</span>
            <div>
              <h3>Report</h3>
              <p>Share the general description, date, and location.</p>
            </div>
          </div>
          <div className="step-row">
            <span>02</span>
            <div>
              <h3>Compare</h3>
              <p>Review suggestions. Similarity is guidance, never proof.</p>
            </div>
          </div>
          <div className="step-row">
            <span>03</span>
            <div>
              <h3>Verify and return</h3>
              <p>Keep unique details private and use an authorized handoff.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Help() {
  const [sent, setSent] = useState(false),
    [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api("/contact", {
        method: "POST",
        body: jsonBody({
          name: form.get("name"),
          email: form.get("email"),
          subject: form.get("subject"),
          message: form.get("message"),
        }),
      });
      setSent(true);
      event.currentTarget.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send your message.");
    }
  }
  return (
    <div className="page-wrap">
      <PageHeading
        eyebrow="Help &amp; safety"
        title="A safe return starts with a good handoff."
        description="LostLink helps you connect. A few simple steps help protect everyone."
      />
      <div className="help-layout">
        <section className="safety-list">
          {[
            [
              "Keep a detail back",
              "Leave one identifying detail out of the public report. Ask claimants to describe it privately.",
            ],
            [
              "Meet somewhere staffed",
              "Choose campus security, student services, or another busy staffed location.",
            ],
            [
              "Keep contact details private",
              "Use the platform claim flow instead of posting personal information.",
            ],
            [
              "Trust the human check",
              "Similarity can point the way; it cannot verify ownership.",
            ],
          ].map(([title, copy], i) => (
            <article key={title}>
              <span>0{i + 1}</span>
              <div>
                <h2>{title}</h2>
                <p>{copy}</p>
              </div>
            </article>
          ))}
        </section>
        <section className="contact-panel">
          <p className="eyebrow">Campus support</p>
          <h2>Need help with a report?</h2>
          <p>
            Send a note to campus support. Never include passwords or sensitive
            details.
          </p>
          {sent ? (
            <Notice success>
              Your message was sent to the campus support queue.
            </Notice>
          ) : (
            <form className="contact-form" onSubmit={submit}>
              {error && <Notice>{error}</Notice>}
              {[
                ["Your name", "name", "text"],
                ["Email", "email", "email"],
                ["Subject", "subject", "text"],
              ].map(([label, name, type]) => (
                <label className="field" key={name}>
                  <span>{label} *</span>
                  <input name={name} type={type} required />
                </label>
              ))}
              <label className="field">
                <span>Message *</span>
                <textarea
                  name="message"
                  minLength={10}
                  maxLength={3000}
                  rows={4}
                  required
                />
              </label>
              <button className="button button-dark">
                Send to support <ArrowRight size={14} />
              </button>
            </form>
          )}
        </section>
      </div>
      <section className="faq-grid">
        <article>
          <h3>Can a match prove an item is mine?</h3>
          <p>No. A person verifies private identifying details.</p>
        </article>
        <article>
          <h3>Who can see claim evidence?</h3>
          <p>The report owner and authorized administrators.</p>
        </article>
        <article>
          <h3>What if I left it with staff?</h3>
          <p>Mark the report as transferred to an authorized office.</p>
        </article>
      </section>
    </div>
  );
}

function NotFound() {
  return (
    <div className="page-wrap not-found">
      <FileQuestion size={32} />
      <p className="eyebrow">404 · Nothing here</p>
      <h1>This trail went cold.</h1>
      <p>That page isn't on the campus board.</p>
      <Link className="button button-dark" to="/">
        Back to LostLink <ArrowRight size={15} />
      </Link>
    </div>
  );
}
