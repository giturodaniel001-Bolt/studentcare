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

  const isCounsellor = Boolean(counsellor && counsellor.role === "counsellor");

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
            {authChecked && !isCounsellor && (
              <button
                className={`nav-login${page === "login" ? " active" : ""}`}
                onClick={() => setPage("login")}
              >
                Counsellor login
              </button>
            )}
          </nav>

          {isCounsellor && (
            <div className="nav-actions">
              <button className="nav-staff" onClick={() => setPage("dashboard")}>
                Dashboard
              </button>
              <button className="nav-link" onClick={() => setPage("audit")}>
                Audit log
              </button>
              <button className="nav-logout" onClick={handleLogout}>
                Log out
              </button>
            </div>
          )}
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
        {page === "dashboard" && isCounsellor && (
          <DashboardPage counsellor={counsellor} />
        )}
        {page === "audit" && isCounsellor && <AuditPage />}

        {/* Guard: if a non-counsellor somehow gets to a counsellor page */}
        {(page === "dashboard" || page === "audit") && !isCounsellor && (
          <section className="content">
            <h1>Access restricted</h1>
            <p>You must log in as a counsellor to view this page.</p>
            <button className="primary" onClick={() => setPage("login")}>
              Go to login
            </button>
          </section>
        )}
      </main>

      <SiteFooter setPage={setPage} goToSection={goToSection} isCounsellor={isCounsellor} />
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
    body: "Your campus counselling team reviews the request and emails you to arrange the contact method you chose.",
  },
  {
    title: "Meet at your pace",
    body: "Talk in a safe, private space — in person or arranged around your timetable.",
  },
  {
    title: "Track privately with your code",
    body: "Follow progress anytime. The status page shows your request details, never your email.",
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
            contacted, and follow up with a private tracking code that never shows
            your email.
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
            No account needed — your email is used only so a counsellor can reach you.
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
          <strong>Privacy first</strong>
          <span>Only your email, contact choice and request status are stored.</span>
        </div>
        <div className="trust-item">
          <strong>Simple requests</strong>
          <span>No account needed — ask for support in under a minute.</span>
        </div>
        <div className="trust-item">
          <strong>Secure access</strong>
          <span>Staff sign-in is password-protected; sign-ins and status changes are logged.</span>
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
            Before you share anything, see what is collected, who can access it,
            how it is protected — and what &ldquo;anonymous&rdquo; does and does
            not mean here.
          </p>
          <button className="text-link" onClick={() => setPage("privacy")}>
            Read the confidentiality guide →
          </button>
        </article>

        <article className="promo-card promo-alt">
          <p className="promo-kicker">PRIVATE TRACKING</p>
          <h3>Check in without showing your email.</h3>
          <p>
            Every request gets a code like <code>SC-4F8A2B</code>. The status page
            shows progress without displaying your email — though your email is
            stored so a counsellor can reach you.
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

function SiteFooter({ setPage, goToSection, isCounsellor }) {
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
          {isCounsellor ? (
            <button onClick={() => setPage("dashboard")}>Counsellor dashboard</button>
          ) : (
            <button onClick={() => setPage("login")}>Counsellor login</button>
          )}
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
    <section className="content privacy-page">
      <p className="eyebrow">PRIVACY &amp; CONFIDENTIALITY</p>
      <h1>Your privacy, explained</h1>
      <p>
        Before you request support, here is exactly what happens to your
        information: what &ldquo;anonymous&rdquo; means, what we store, who can
        see it, and how it is protected.
      </p>

      <div className="privacy-callout">
        <strong>What &ldquo;anonymous&rdquo; means on StudentCare</strong>
        <p>
          Your tracking code lets you check progress without typing your email,
          and the status page never displays your email. It is not full
          anonymity: your email is stored with your request so a counsellor can
          reach you, and anyone who has your code can see the limited status
          details below. Keep your code private.
        </p>
      </div>

      <div className="privacy-grid">
        <article className="privacy-card">
          <h2>What we collect</h2>
          <ul>
            <li>Your email address — the only contact detail the request form asks for.</li>
            <li>Your preferred contact method: email, phone call or in-person.</li>
            <li>Your request status and timestamps, plus the tracking code.</li>
          </ul>
          <p className="privacy-small">
            The optional &ldquo;anything you want us to know?&rdquo; box is never
            sent to the server or stored. This site does not ask for a phone
            number; if you choose a phone call, a counsellor will email you first
            to arrange it.
          </p>
        </article>

        <article className="privacy-card">
          <h2>Who can see it</h2>
          <ul>
            <li>
              The public status page shows your status, preferred contact method
              and timestamps to anyone who has your tracking code. It never shows
              your email.
            </li>
            <li>Request records are available only to accounts signed in as counsellors.</li>
            <li>Your email is used to contact you about your request, not for marketing.</li>
            <li>
              As with any online service, the administrators who operate the
              database and hosting infrastructure can technically access stored
              data.
            </li>
          </ul>
        </article>

        <article className="privacy-card">
          <h2>How it is protected</h2>
          <ul>
            <li>Counsellor passwords are stored as salted scrypt hashes, never as plain text.</li>
            <li>
              Staff sign-in uses a server-side session cookie marked HttpOnly and
              SameSite=Lax. HTTPS deployments also mark it Secure.
            </li>
            <li>The server checks the counsellor role on every staff request.</li>
            <li>Sign-ins, request-list views and status changes are written to an audit log.</li>
          </ul>
        </article>

        <article className="privacy-card">
          <h2>Limits and your choices</h2>
          <ul>
            <li>This is not full anonymity — your email is linked to your request.</li>
            <li>
              Confidentiality in counselling is not absolute. At your first
              meeting, ask your counsellor to explain when they may need to share
              information, for example where there is a risk of serious harm.
            </li>
            <li>You decide how much to share, and you can ask privacy questions before sharing more.</li>
          </ul>
          <p className="privacy-small">
            Privacy questions:{" "}
            <a href="mailto:counselling@your-university.ac.ke">
              counselling@your-university.ac.ke
            </a>
          </p>
        </article>
      </div>

      <div className="privacy-actions">
        <button className="primary" onClick={() => setPage("appointment")}>
          Continue to request support
        </button>
        <button className="secondary" onClick={() => setPage("status")}>
          Check a request
        </button>
      </div>
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
        We store your email and preferred contact method so a counsellor can
        reach you. You can share more when you meet a counsellor — the optional
        note below is never sent.
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
        {preferredContact === "phone" && (
          <p className="field-hint">
            We don&rsquo;t collect phone numbers on this site — a counsellor will
            email you first to arrange the call.
          </p>
        )}

        <label htmlFor="message">
          Anything you want us to know? (Optional — never sent or stored)
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
        using your tracking code. Read{" "}
        <button type="button" className="linklike" onClick={() => setPage("privacy")}>
          how your information is handled
        </button>
        .
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
        A counsellor will reach out using the email you provided to arrange your
        preferred contact: <strong>{contact}</strong>.
      </p>

      <div className="code-box">
        <p className="code-label">Your tracking code</p>
        <p className="code">{code}</p>
        <p className="code-note">
          Save this code. The status page never displays your email, but anyone
          who has the code can see your request status — so keep it private.
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
      <p className="field-hint">
        This lookup never shows your email. Anyone with the code can see your
        status, preferred contact method and timestamps — so keep it private.
      </p>

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
          Sign in to review appointment requests and update their status. Staff
          sign-ins, request-list views and status changes are recorded.
        </p>
        <ul className="login-points">
          <li>Session-based authentication</li>
          <li>Passwords stored as salted hashes</li>
          <li>Sign-ins and status changes recorded in an audit log</li>
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
                <th>Student email</th>
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
                  <td className="small">{apt.student_email}</td>
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