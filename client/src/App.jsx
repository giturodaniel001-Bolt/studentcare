import { useState, useEffect } from "react";
import "./App.css";
import "./redesign.css";
import heroImage from "./assets/wellness-hero.webp";
import {
  createAppointment,
  getAppointmentStatus,
  login as apiLogin,
  logout as apiLogout,
  getCurrentUser,
  listAppointments,
  updateAppointmentStatus,
  getAuditLog,
} from "./api";

function App() {
  const [page, setPage] = useState("home");
  const [counsellor, setCounsellor] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // On load, check if a counsellor session exists
  useEffect(() => {
    (async () => {
      const res = await getCurrentUser();
      if (res.authenticated) setCounsellor(res.user);
      setAuthChecked(true);
    })();
  }, []);

  async function handleLogout() {
    try {
      await apiLogout();
    } catch (e) {
      /* ignore */
    }
    setCounsellor(null);
    setPage("home");
  }

  function goToSection(id) {
    setPage("home");
    window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  return (
    <div className="app">
      <header className="site-header">
        <div className="topline">
          <div className="topline-inner">
            <span>Confidential support for university students</span>
            <button className="topline-start" onClick={() => setPage("appointment")}>
              Start today →
            </button>
            <span className="topline-emergency">Not an emergency service · Crisis line 999 or 112</span>
          </div>
        </div>

        <div className="navbar">
          <a
            className="brand"
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              setPage("home");
            }}
          >
            <span className="brand-mark">+</span>
            <span>StudentCare</span>
          </a>

          <nav className="nav-links" aria-label="Main navigation">
            <button onClick={() => setPage("home")} className={page === "home" ? "active" : ""}>
              Home
            </button>
            <button onClick={() => goToSection("how-it-works")}>How it works</button>
            <button onClick={() => setPage("privacy")} className={page === "privacy" ? "active" : ""}>
              Confidentiality
            </button>
            <button onClick={() => setPage("appointment")} className={page === "appointment" ? "active" : ""}>
              Get support
            </button>
            <button onClick={() => setPage("status")} className={page === "status" ? "active" : ""}>
              Check status
            </button>
          </nav>

          <div className="nav-actions">
            {authChecked && !counsellor && (
              <button className="nav-staff" onClick={() => setPage("login")}>
                Staff login
              </button>
            )}
            {counsellor && (
              <>
                <button className="nav-staff" onClick={() => setPage("dashboard")}>
                  Dashboard
                </button>
                <button className="nav-link" onClick={() => setPage("audit")}>
                  Audit log
                </button>
                <button className="nav-logout" onClick={handleLogout}>
                  Log out
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {page === "home" && <HomePage setPage={setPage} goToSection={goToSection} />}
        {page === "privacy" && <PrivacyPage setPage={setPage} />}
        {page === "appointment" && <AppointmentPage setPage={setPage} />}
        {page === "confirmation" && <ConfirmationPage setPage={setPage} />}
        {page === "status" && <StatusPage />}
        {page === "login" && (
          <LoginPage
            onLogin={(user) => {
              setCounsellor(user);
              setPage("dashboard");
            }}
            setPage={setPage}
          />
        )}
        {page === "dashboard" && counsellor && (
          <DashboardPage counsellor={counsellor} />
        )}
        {page === "audit" && counsellor && <AuditPage />}

        {/* Guard: if a non-counsellor somehow gets to a counsellor page */}
        {(page === "dashboard" || page === "audit") && !counsellor && (
          <section className="content">
            <h1>Access restricted</h1>
            <p>You must log in as a counsellor to view this page.</p>
            <button className="primary" onClick={() => setPage("login")}>
              Go to login
            </button>
          </section>
        )}
      </main>

      <SiteFooter setPage={setPage} goToSection={goToSection} />
    </div>
  );
}

// ────────────────────────────────────────────────
// HOME
// ────────────────────────────────────────────────
const HOW_STEPS = [
  {
    title: "Request privately",
    body: "Share your email and how you'd like to be contacted. No personal story needed at this stage.",
  },
  {
    title: "A counsellor reaches out",
    body: "Your campus counselling team reviews the request and contacts you the way you chose.",
  },
  {
    title: "Meet at your pace",
    body: "Talk in a safe, private space — in person or arranged around your timetable.",
  },
  {
    title: "Track with your code",
    body: "Follow progress anytime with your anonymous tracking code. No email exposed.",
  },
];

function HomePage({ setPage, goToSection }) {
  return (
    <>
      <section className="hero hero-split">
        <div className="hero-copy">
          <p className="eyebrow">YOUR WELLBEING MATTERS</p>
          <h1>You don&rsquo;t have to face everything alone.</h1>
          <p className="intro">
            StudentCare quietly connects you with your university&rsquo;s counselling
            team. Ask for support in under a minute, choose how you&rsquo;d like to be
            contacted, and follow up with an anonymous tracking code.
          </p>

          <div className="hero-actions">
            <button className="primary large" onClick={() => setPage("appointment")}>
              Request support
            </button>
            <button className="secondary large" onClick={() => goToSection("how-it-works")}>
              How it works
            </button>
          </div>

          <p className="hero-note">
            <span className="pulse-dot" aria-hidden="true" />
            Confidential by design — your story stays between you and your counsellor.
          </p>
        </div>

        <div className="hero-art">
          <span className="blob blob-one" aria-hidden="true" />
          <span className="blob blob-two" aria-hidden="true" />
          <figure className="hero-figure">
            <img
              src={heroImage}
              alt="A student in a calm conversation with a university counsellor in a bright room with plants"
            />
          </figure>
          <div className="float-card">
            <span className="float-mark" aria-hidden="true">+</span>
            <div>
              <strong>Your wellbeing matters.</strong>
              <span>Support at your own pace.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="What to expect">
        <div className="trust-item">
          <strong>Private by design</strong>
          <span>Only what&rsquo;s needed is collected.</span>
        </div>
        <div className="trust-item">
          <strong>No story required</strong>
          <span>Share when you&rsquo;re ready, not before.</span>
        </div>
        <div className="trust-item">
          <strong>A real person replies</strong>
          <span>Your campus counselling team, not a bot.</span>
        </div>
      </section>

      <section id="how-it-works" className="section how-section">
        <div className="section-head centered">
          <p className="eyebrow">HOW IT WORKS</p>
          <h2>Simple, private, on your schedule.</h2>
          <p className="section-sub">Four gentle steps between you and support.</p>
        </div>

        <ol className="steps">
          {HOW_STEPS.map((step, index) => (
            <li className="step" key={step.title}>
              <span className="step-number">{String(index + 1).padStart(2, "0")}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="section split-promo">
        <article className="promo-card">
          <p className="promo-kicker">CONFIDENTIALITY</p>
          <h3>Know exactly how your information is handled.</h3>
          <p>
            Before you share anything, see what is collected, who can access it, and
            the limits of confidentiality.
          </p>
          <button className="text-link" onClick={() => setPage("privacy")}>
            Read the confidentiality guide →
          </button>
        </article>

        <article className="promo-card promo-alt">
          <p className="promo-kicker">ANONYMOUS TRACKING</p>
          <h3>Check in without being identified.</h3>
          <p>
            Every request gets a code like <code>SC-4F8A2B</code>. Use it to follow
            your request — no email ever exposed.
          </p>
          <button className="text-link" onClick={() => setPage("status")}>
            Check a request →
          </button>
        </article>
      </section>

      <section className="cta-band">
        <div>
          <h2>Ready when you are.</h2>
          <p>
            Take it at your own pace. StudentCare is a prototype service and is not
            an emergency service.
          </p>
        </div>
        <button className="primary large on-dark" onClick={() => setPage("appointment")}>
          Request support
        </button>
      </section>
    </>
  );
}

function SiteFooter({ setPage, goToSection }) {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="footer-brand">
          <a
            className="brand"
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              setPage("home");
            }}
          >
            <span className="brand-mark">+</span>
            <span>StudentCare</span>
          </a>
          <p>
            A privacy-first way for university students to reach campus counselling
            support — without explaining everything at once.
          </p>
        </div>

        <div className="footer-col">
          <h3>About StudentCare</h3>
          <button onClick={() => setPage("home")}>Home</button>
          <button onClick={() => goToSection("how-it-works")}>How it works</button>
          <button onClick={() => setPage("privacy")}>Confidentiality guide</button>
        </div>

        <div className="footer-col">
          <h3>Get support</h3>
          <button onClick={() => setPage("appointment")}>Request an appointment</button>
          <button onClick={() => setPage("status")}>Check request status</button>
          <button onClick={() => setPage("login")}>Counsellor login</button>
        </div>

        <div className="footer-col">
          <h3>Contact</h3>
          <a href="mailto:counselling@your-university.ac.ke">counselling@your-university.ac.ke</a>
          <span>Student Wellness Centre, Main Campus</span>
          <span>Monday – Friday, 8:00 – 17:00</span>
        </div>
      </div>

      <div className="emergency-note" role="note">
        <strong>StudentCare is not an emergency service.</strong>
        <span>
          If you or someone else is in immediate danger, contact campus security or
          Kenya&rsquo;s emergency services on 999 or 112.
        </span>
      </div>

      <div className="footer-legal">
        <span>© {new Date().getFullYear()} StudentCare · Student wellbeing and support</span>
        <button onClick={() => setPage("privacy")}>Privacy</button>
      </div>
    </footer>
  );
}

// ────────────────────────────────────────────────
// PRIVACY
// ────────────────────────────────────────────────
function PrivacyPage({ setPage }) {
  return (
    <section className="content">
      <h1>Your privacy matters</h1>
      <p>
        Before requesting support, you should understand what information is
        collected, who can access it, and how it is protected.
      </p>
      <ul>
        <li>Only necessary information should be collected.</li>
        <li>Access to counselling records must be restricted.</li>
        <li>Confidentiality has limits that must be explained.</li>
        <li>You should know how to ask questions about privacy.</li>
      </ul>
      <button className="primary" onClick={() => setPage("appointment")}>
        Continue to appointment request
      </button>
    </section>
  );
}

// ────────────────────────────────────────────────
// APPOINTMENT FORM
// ────────────────────────────────────────────────
function AppointmentPage({ setPage }) {
  const [email, setEmail] = useState("");
  const [preferredContact, setPreferredContact] = useState("email");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const data = await createAppointment({ email, preferredContact });
      sessionStorage.setItem("lastTrackingCode", data.tracking_code);
      sessionStorage.setItem("lastPreferredContact", preferredContact);
      setPage("confirmation");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="content">
      <h1>Request support</h1>
      <p>
        You only need to provide your email and a preferred contact method. You
        can share more when you meet a counsellor.
      </p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />

        <label htmlFor="contact">Preferred contact method</label>
        <select
          id="contact"
          value={preferredContact}
          onChange={(e) => setPreferredContact(e.target.value)}
        >
          <option value="email">Email</option>
          <option value="phone">Phone call</option>
          <option value="in-person">In-person arrangement</option>
        </select>

        <label htmlFor="message">
          Anything you want us to know? (Optional — not stored)
        </label>
        <textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="You do not need to share your personal story here."
        />

        {error && <p className="error">{error}</p>}

        <button className="primary" type="submit" disabled={loading}>
          {loading ? "Submitting…" : "Submit request"}
        </button>
      </form>

      <p className="note">
        You can also{" "}
        <button
          type="button"
          className="linklike"
          onClick={() => setPage("status")}
        >
          check an existing request
        </button>{" "}
        using your tracking code.
      </p>
    </section>
  );
}

// ────────────────────────────────────────────────
// CONFIRMATION
// ────────────────────────────────────────────────
function ConfirmationPage({ setPage }) {
  const code = sessionStorage.getItem("lastTrackingCode") || "";
  const contact = sessionStorage.getItem("lastPreferredContact") || "email";

  return (
    <section className="content confirmation">
      <h1>Request received ✅</h1>
      <p>
        A counsellor will reach out through your preferred method:{" "}
        <strong>{contact}</strong>.
      </p>

      <div className="code-box">
        <p className="code-label">Your tracking code</p>
        <p className="code">{code}</p>
        <p className="code-note">
          Save this code. You will need it to check your appointment status. It
          does not reveal your email address.
        </p>
      </div>

      <button className="primary" onClick={() => setPage("status")}>
        Check appointment status
      </button>
      <button className="secondary" onClick={() => setPage("home")}>
        Back to home
      </button>
    </section>
  );
}

// ────────────────────────────────────────────────
// STATUS CHECK
// ────────────────────────────────────────────────
function StatusPage() {
  const [code, setCode] = useState(
    sessionStorage.getItem("lastTrackingCode") || ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function handleCheck(event) {
    event.preventDefault();
    setError("");
    setResult(null);

    if (!code.trim()) {
      setError("Please enter a tracking code.");
      return;
    }

    setLoading(true);
    try {
      const data = await getAppointmentStatus(code.trim());
      setResult(data);
    } catch (err) {
      setError(err.message || "Could not find that appointment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="content">
      <h1>Check appointment status</h1>
      <p>Enter your tracking code to see the current status of your request.</p>

      <form onSubmit={handleCheck}>
        <label htmlFor="code">Tracking code</label>
        <input
          id="code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="SC-XXXXXX"
        />

        {error && <p className="error">{error}</p>}

        <button className="primary" type="submit" disabled={loading}>
          {loading ? "Checking…" : "Check status"}
        </button>
      </form>

      {result && (
        <div className="status-box">
          <p>
            <strong>Status:</strong>{" "}
            <span className={`badge badge-${result.status}`}>
              {result.status}
            </span>
          </p>
          <p>
            <strong>Preferred contact:</strong> {result.preferred_contact}
          </p>
          <p>
            <strong>Requested:</strong>{" "}
            {new Date(result.created_at).toLocaleString()}
          </p>
          <p>
            <strong>Last updated:</strong>{" "}
            {new Date(result.updated_at).toLocaleString()}
          </p>
        </div>
      )}
    </section>
  );
}

// ────────────────────────────────────────────────
// LOGIN (Counsellor)
// ────────────────────────────────────────────────
function LoginPage({ onLogin, setPage }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiLogin(email, password);
      onLogin(data.user);
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="login-page">
      <aside className="login-aside">
        <p className="eyebrow light">COUNSELLOR PORTAL</p>
        <h1>Support starts with someone who listens.</h1>
        <p className="login-aside-copy">
          Sign in to review appointment requests, update their status, and keep
          every access accountable.
        </p>
        <ul className="login-points">
          <li>Session-based authentication</li>
          <li>Passwords stored as salted hashes</li>
          <li>Every action recorded in the audit log</li>
        </ul>
      </aside>

      <div className="login-card">
        <div className="login-card-head">
          <span className="login-mark">+</span>
          <div>
            <h2>Counsellor sign in</h2>
            <p>Use the staff account issued by the counselling office.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            required
            autoFocus
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="counsellor@example.com"
          />

          <label htmlFor="login-password">Password</label>
          <div className="password-wrap">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="show-password"
              onClick={() => setShowPassword((s) => !s)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          <button className="primary login-submit" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="login-foot">
          Not a counsellor?{" "}
          <button
            type="button"
            className="linklike"
            onClick={() => setPage("home")}
          >
            Return to home
          </button>
        </p>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────
// DASHBOARD (Counsellor)
// ────────────────────────────────────────────────
function DashboardPage({ counsellor }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await listAppointments();
      setAppointments(data.appointments || []);
    } catch (err) {
      setError(err.message || "Could not load appointments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function changeStatus(id, newStatus) {
    setUpdatingId(id);
    try {
      await updateAppointmentStatus(id, newStatus);
      await load();
    } catch (err) {
      setError(err.message || "Could not update status.");
    } finally {
      setUpdatingId(null);
    }
  }

  const statuses = ["pending", "scheduled", "completed", "cancelled"];

  return (
    <section className="content wide">
      <h1>Appointment dashboard</h1>
      <p className="subtle">
        Logged in as <strong>{counsellor.email}</strong>
      </p>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p>Loading appointments…</p>
      ) : appointments.length === 0 ? (
        <p>No appointment requests yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="appointments-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Preferred</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((apt) => (
                <tr key={apt.id}>
                  <td className="mono">{apt.tracking_code}</td>
                  <td>{apt.preferred_contact}</td>
                  <td>
                    <span className={`badge badge-${apt.status}`}>
                      {apt.status}
                    </span>
                  </td>
                  <td className="small">
                    {new Date(apt.created_at).toLocaleString()}
                  </td>
                  <td>
                    <div className="action-row">
                      {statuses.map((s) => (
                        <button
                          key={s}
                          className="mini"
                          disabled={s === apt.status || updatingId === apt.id}
                          onClick={() => changeStatus(apt.id, s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button className="secondary" onClick={load} disabled={loading}>
        Refresh
      </button>
    </section>
  );
}

// ────────────────────────────────────────────────
// AUDIT LOG (Counsellor)
// ────────────────────────────────────────────────
function AuditPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await getAuditLog();
      setEntries(data.entries || []);
    } catch (err) {
      setError(err.message || "Could not load audit log.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="content wide">
      <h1>Audit log</h1>
      <p className="subtle">
        Every access and status change is recorded. This supports accountability
        and transparency.
      </p>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p>Loading audit entries…</p>
      ) : entries.length === 0 ? (
        <p>No audit entries yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="appointments-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Performed by</th>
                <th>Action</th>
                <th>Target</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="small">
                    {new Date(e.created_at).toLocaleString()}
                  </td>
                  <td>{e.performed_by}</td>
                  <td><code>{e.action}</code></td>
                  <td>{e.target_id ?? "—"}</td>
                  <td className="small">{e.details || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button className="secondary" onClick={load} disabled={loading}>
        Refresh
      </button>
    </section>
  );
}

export default App;