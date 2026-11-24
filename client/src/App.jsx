import { Fragment, useState, useEffect } from "react";
import "./App.css";
import "./redesign.css";
import heroPhoto from "./assets/wellness-hero-photo.webp";
import {
  createAppointment,
  getAppointmentStatus,
  login as apiLogin,
  logout as apiLogout,
  getCurrentUser,
  listAppointments,
  updateAppointmentStatus,
  getAuditLog,
  acknowledgeAppointment,
  scheduleAppointment,
  getStudentThread,
  sendStudentMessage,
  getStaffThread,
  sendStaffMessage,
  createCheckin,
  submitFeedback,
  getAdminSummary,
  getAdminFeedback,
} from "./api";

function ShieldIcon({ className = "icon" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3.2 18.8 6v5.1c0 4.4-2.8 8.1-6.8 9.1-4-1-6.8-4.7-6.8-9.1V6L12 3.2Z" />
      <path d="m9.2 11.8 2 2 3.6-3.7" />
    </svg>
  );
}

function ClockIcon({ className = "icon" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7.6V12l3 1.8" />
    </svg>
  );
}

function LockIcon({ className = "icon" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5.2" y="10.2" width="13.6" height="9.6" rx="2.2" />
      <path d="M8.4 10.2V7.6a3.6 3.6 0 0 1 7.2 0v2.6" />
      <path d="M12 14v2.2" />
    </svg>
  );
}

function PhoneIcon({ className = "icon" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5.2 3.8h3l1.6 4.4-2.1 1.5a11.4 11.4 0 0 0 6.6 6.6l1.5-2.1 4.4 1.6v3a2 2 0 0 1-2.2 2A16.2 16.2 0 0 1 3.2 6a2 2 0 0 1 2-2.2Z" />
    </svg>
  );
}

function ArrowRightIcon({ className = "icon" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

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
    } catch {
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
  const isAdmin = Boolean(counsellor && counsellor.role === "admin");

  return (
    <div className="app">
      <header className="site-header">
        <div className="topline">
          <div className="topline-inner">
            <span className="topline-group">
              <ShieldIcon className="topline-icon" />
              <span>Confidential support for university students</span>
            </span>
            <span className="topline-rule" aria-hidden="true" />
            <button className="topline-start" onClick={() => setPage("appointment")}>
              Start today <ArrowRightIcon className="topline-arrow" />
            </button>
            <span className="topline-emergency">
              <PhoneIcon className="topline-icon" />
              Not an emergency service · Crisis line 999 or 112
            </span>
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
            <button onClick={() => setPage("resources")} className={page === "resources" ? "active" : ""}>
              Resources
            </button>
            <button onClick={() => setPage("appointment")} className={page === "appointment" ? "active" : ""}>
              Get support
            </button>
            <button onClick={() => setPage("checkin")} className={page === "checkin" ? "active" : ""}>
              Check-in
            </button>
            <button onClick={() => setPage("status")} className={page === "status" ? "active" : ""}>
              Check status
            </button>
          </nav>

          <div className="nav-actions">
            {isCounsellor ? (
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
            ) : isAdmin ? (
              <>
                <button className="nav-staff" onClick={() => setPage("admin")}>
                  Admin insights
                </button>
                <button className="nav-logout" onClick={handleLogout}>
                  Log out
                </button>
              </>
            ) : (
              authChecked && (
                <button className="nav-staff" onClick={() => setPage("login")}>
                  Counsellor Login
                </button>
              )
            )}
          </div>
        </div>
      </header>

      <main>
        {page === "home" && <HomePage setPage={setPage} goToSection={goToSection} />}
        {page === "privacy" && <PrivacyPage setPage={setPage} />}
        {page === "resources" && <ResourcesPage setPage={setPage} />}
        {page === "checkin" && <CheckinPage setPage={setPage} />}
        {page === "appointment" && <AppointmentPage setPage={setPage} />}
        {page === "confirmation" && <ConfirmationPage setPage={setPage} />}
        {page === "status" && <StatusPage setPage={setPage} />}
        {page === "login" && (
          <LoginPage
            onLogin={(user) => {
              setCounsellor(user);
              setPage(user.role === "admin" ? "admin" : "dashboard");
            }}
            setPage={setPage}
          />
        )}
        {page === "dashboard" && isCounsellor && (
          <DashboardPage counsellor={counsellor} />
        )}
        {page === "audit" && isCounsellor && <AuditPage />}
        {page === "admin" && isAdmin && <AdminPage />}

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
        {page === "admin" && !isAdmin && (
          <section className="content">
            <h1>Access restricted</h1>
            <p>You must log in as an administrator to view this page.</p>
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
          <p className="eyebrow">
            <span>YOUR WELLBEING MATTERS</span>
            <span className="eyebrow-rule" aria-hidden="true" />
          </p>
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
              <ArrowRightIcon className="cta-arrow" />
            </button>
            <button className="secondary large" onClick={() => goToSection("how-it-works")}>
              How it works
            </button>
          </div>
        </div>

        <figure className="hero-art">
          <img
            src={heroPhoto}
            alt="A student and his counsellor in a calm conversation in a bright campus wellbeing office"
          />
        </figure>

        <div className="trust-card" aria-label="What to expect">
          <div className="trust-item">
            <ShieldIcon className="trust-icon" />
            <strong>Privacy first</strong>
          </div>
          <div className="trust-item">
            <ClockIcon className="trust-icon" />
            <strong>Simple requests</strong>
          </div>
          <div className="trust-item">
            <LockIcon className="trust-icon" />
            <strong>Secure access</strong>
          </div>
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
          <button onClick={() => setPage("resources")}>Resource centre</button>
        </div>

        <div className="footer-col">
          <h3>Get support</h3>
          <button onClick={() => setPage("appointment")}>Request an appointment</button>
          <button onClick={() => setPage("status")}>Check request status</button>
          <button onClick={() => setPage("checkin")}>Wellbeing check-in</button>
          {isCounsellor ? (
            <button onClick={() => setPage("dashboard")}>Counsellor dashboard</button>
          ) : (
            <button onClick={() => setPage("login")}>Counsellor login</button>
          )}
        </div>

        <div className="footer-col">
          <h3>Contact</h3>
          <a href="mailto:counselling@kisiiuniversity.ac.ke">counselling@kisiiuniversity.ac.ke</a>
          <span>Student Wellness Centre, Kisii University</span>
          <span>Open 24 hours, every day</span>
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
          reach you. Anyone who has your code can see the limited status details
          below, read and write in the message thread, and see check-in history
          linked to that code. Keep your code private. Marking a request urgent
          alerts the counselling team&rsquo;s dashboard; it is not an emergency
          response service.
        </p>
      </div>

      <div className="privacy-grid">
        <article className="privacy-card">
          <h2>What we collect</h2>
          <ul>
            <li>Your email address — the only contact detail the request form asks for.</li>
            <li>Your preferred contact method: email, phone call or in-person.</li>
            <li>
              Your priority level (urgent, high or normal), request status,
              tracking code, appointment time, and timestamps — including when a
              counsellor acknowledges or a request escalates.
            </li>
            <li>Messages you choose to send in the request&rsquo;s private thread.</li>
            <li>
              Optional wellbeing check-ins (a mood score from 1 to 5, no email)
              and optional feedback (a rating and comment, no email).
            </li>
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
              The public status page shows your status, priority, preferred
              contact method, acknowledgement, appointment time and timestamps to
              anyone who has your tracking code. It never shows your email.
            </li>
            <li>
              Message threads are visible to counsellors and to anyone holding
              the tracking code — treat the code like a password.
            </li>
            <li>Request records are available only to accounts signed in as counsellors.</li>
            <li>
              Administrators see aggregate statistics only: counts, response
              times and anonymous feedback. They do not see student emails,
              message threads or individual check-ins.
            </li>
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
            <li>
              The server checks the role on every staff request; administrator
              endpoints return aggregates only.
            </li>
            <li>
              Sign-ins, request-list views, acknowledgements, status changes,
              replies and automatic escalations are written to an audit log.
            </li>
          </ul>
        </article>

        <article className="privacy-card">
          <h2>Limits and your choices</h2>
          <ul>
            <li>This is not full anonymity — your email is linked to your request.</li>
            <li>
              Urgent marking notifies the team in its dashboard; it does not
              guarantee that someone has seen the request or can respond
              instantly. For immediate danger, use emergency services.
            </li>
            <li>
              Confidentiality in counselling is not absolute. At your first
              meeting, ask your counsellor to explain when they may need to share
              information, for example where there is a risk of serious harm.
            </li>
            <li>You decide how much to share, and you can ask privacy questions before sharing more.</li>
          </ul>
          <p className="privacy-small">
            Privacy questions:{" "}
            <a href="mailto:counselling@kisiiuniversity.ac.ke">
              counselling@kisiiuniversity.ac.ke
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
const URGENCY_OPTIONS = [
  {
    value: "normal",
    label: "Normal",
    hint: "General counselling support. Added to the standard queue.",
  },
  {
    value: "high",
    label: "High",
    hint: "You need support soon. The request moves near the top of the queue with a 24-hour follow-up target.",
  },
  {
    value: "urgent",
    label: "Urgent",
    hint: "You need immediate support. The team is alerted on its dashboard, and the request escalates to a backup counsellor if nobody acknowledges it quickly.",
  },
];

function AppointmentPage({ setPage }) {
  const [email, setEmail] = useState("");
  const [preferredContact, setPreferredContact] = useState("email");
  const [urgency, setUrgency] = useState("normal");
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
      const data = await createAppointment({ email, preferredContact, urgency });
      sessionStorage.setItem("lastTrackingCode", data.tracking_code);
      sessionStorage.setItem("lastPreferredContact", preferredContact);
      sessionStorage.setItem("lastUrgency", data.urgency || urgency);
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

        <fieldset className="urgency-fieldset">
          <legend>How soon do you need support?</legend>
          {URGENCY_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`urgency-option${urgency === option.value ? " selected" : ""}`}
            >
              <input
                type="radio"
                name="urgency"
                value={option.value}
                checked={urgency === option.value}
                onChange={(e) => setUrgency(e.target.value)}
              />
              <span>
                <strong>{option.label}</strong>
                <small>{option.hint}</small>
              </span>
            </label>
          ))}
        </fieldset>

        {urgency === "urgent" && (
          <div className="emergency-panel" role="alert">
            <strong>StudentCare is not an emergency service.</strong>
            <p>
              Marking a request urgent alerts the counselling team on its
              dashboard — it does not summon help or guarantee that someone is
              available this minute. If you are in immediate danger, contact
              campus security or Kenya&rsquo;s emergency services on 999 or 112
              now.
            </p>
          </div>
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
  const urgency = sessionStorage.getItem("lastUrgency") || "normal";

  return (
    <section className="content confirmation">
      <h1>Request received</h1>
      <p>
        A counsellor will reach out using the email you provided to arrange your
        preferred contact: <strong>{contact}</strong>.
      </p>

      <p className="priority-line">
        Priority: <PriorityBadge urgency={urgency} />
      </p>

      {urgency === "urgent" ? (
        <div className="emergency-panel" role="alert">
          <strong>This request is flagged urgent — it is not proof someone has seen it.</strong>
          <p>
            The request now appears at the top of the counselling team&rsquo;s
            dashboard with a visible acknowledgement step. If no counsellor
            acknowledges it within 10 minutes, it is escalated to the backup
            counsellor. If you are in danger while you wait, contact campus
            security or Kenya&rsquo;s emergency services on 999 or 112 — do not
            wait for this page.
          </p>
        </div>
      ) : (
        <p className="field-hint">
          {urgency === "high"
            ? "High priority: the team targets a follow-up within 24 hours."
            : "Standard queue: the team targets a follow-up within 48 hours."}
        </p>
      )}

      <div className="code-box">
        <p className="code-label">Your tracking code</p>
        <p className="code">{code}</p>
        <p className="code-note">
          Use this code on the status page to see whether your request has been
          acknowledged, your appointment time, and messages from the team. The
          status page never displays your email, but anyone who has the code can
          see these details — so keep it private.
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
function StatusPage({ setPage }) {
  const [code, setCode] = useState(
    sessionStorage.getItem("lastTrackingCode") || ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const activeCode = result?.tracking_code || "";

  async function lookup(value) {
    setLoading(true);
    setError("");
    try {
      const data = await getAppointmentStatus(value);
      setResult(data);
    } catch (err) {
      setError(err.message || "Could not find that appointment.");
    } finally {
      setLoading(false);
    }
  }

  function handleCheck(event) {
    event.preventDefault();
    if (!code.trim()) {
      setError("Please enter a tracking code.");
      return;
    }
    lookup(code.trim());
  }

  useEffect(() => {
    if (code.trim()) {
      lookup(code.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeCode) return undefined;
    const timer = window.setInterval(() => {
      getAppointmentStatus(activeCode)
        .then(setResult)
        .catch(() => {});
    }, 30000);
    return () => window.clearInterval(timer);
  }, [activeCode]);

  return (
    <section className="content">
      <h1>Check appointment status</h1>
      <p>Enter your tracking code to see the current status of your request.</p>
      <p className="field-hint">
        This lookup never shows your email. Anyone with the code can see your
        status, priority, acknowledgement, appointment time and message thread —
        so keep it private.
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
        <>
          <div className="status-box">
            <div className="status-headline">
              <span className={`badge badge-${result.status}`}>
                {result.status}
              </span>
              <PriorityBadge urgency={result.urgency} />
            </div>
            <p>
              <strong>Preferred contact:</strong> {result.preferred_contact}
            </p>
            <p>
              <strong>Appointment:</strong>{" "}
              {result.scheduled_for
                ? formatDateTime(result.scheduled_for)
                : "Not scheduled yet"}
            </p>
            <p>
              <strong>Acknowledgement:</strong>{" "}
              {result.acknowledged
                ? `A counsellor acknowledged this request on ${formatDateTime(result.acknowledged_at)}.`
                : "Waiting for a counsellor to acknowledge this request."}
            </p>
            <p>
              <strong>Requested:</strong> {formatDateTime(result.created_at)}
            </p>
            <p>
              <strong>Last updated:</strong> {formatDateTime(result.updated_at)}
            </p>
          </div>

          {result.urgency === "urgent" && !result.acknowledged && (
            <div className="emergency-panel" role="alert">
              <strong>An urgent request is waiting for acknowledgement.</strong>
              <p>
                This page does not summon help and cannot guarantee that a
                counsellor is available right now. If you are in immediate
                danger, contact campus security or Kenya&rsquo;s emergency
                services on 999 or 112.
              </p>
            </div>
          )}

          <ThreadPanel trackingCode={result.tracking_code} />
          <FeedbackForm trackingCode={result.tracking_code} />

          <p className="note">
            Looking for ways to steady yourself while you wait?{" "}
            <button type="button" className="linklike" onClick={() => setPage("resources")}>
              Browse the resource centre
            </button>
            .
          </p>
        </>
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
        <p className="eyebrow light">STAFF PORTAL</p>
        <h1>Support starts with someone who listens.</h1>
        <p className="login-aside-copy">
          Counsellors sign in to review requests, acknowledge them and update
          status. Administrators see aggregated statistics only — never student
          emails, messages or individual check-ins.
        </p>
        <ul className="login-points">
          <li>Role-based access — counsellors vs. administrators</li>
          <li>Passwords stored as salted hashes</li>
          <li>Sign-ins, acknowledgements and status changes recorded in an audit log</li>
        </ul>
      </aside>

      <div className="login-card">
        <div className="login-card-head">
          <span className="login-mark">+</span>
          <div>
            <h2>Staff sign in</h2>
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
const STATUS_VALUES = ["pending", "scheduled", "completed", "cancelled"];

function DashboardPage({ counsellor }) {
  const [data, setData] = useState({
    appointments: [],
    alerts: [],
    stats: null,
    escalation_minutes: 10,
    email_alerts_enabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [openThread, setOpenThread] = useState(null);

  async function load({ silent = false } = {}) {
    if (!silent) setLoading(true);
    setError("");
    try {
      const result = await listAppointments();
      setData({
        appointments: result.appointments || [],
        alerts: result.alerts || [],
        stats: result.stats || null,
        escalation_minutes: result.escalation_minutes ?? 10,
        email_alerts_enabled: Boolean(result.email_alerts_enabled),
      });
    } catch (err) {
      setError(err.message || "Could not load appointments.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => load({ silent: true }), 30000);
    return () => window.clearInterval(timer);
  }, []);

  async function changeStatus(id, newStatus) {
    setUpdatingId(id);
    try {
      await updateAppointmentStatus(id, newStatus);
      await load({ silent: true });
    } catch (err) {
      setError(err.message || "Could not update status.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function acknowledge(id) {
    setUpdatingId(id);
    try {
      await acknowledgeAppointment(id);
      await load({ silent: true });
    } catch (err) {
      setError(err.message || "Could not acknowledge the request.");
    } finally {
      setUpdatingId(null);
    }
  }

  const stats = data.stats || {
    open: 0,
    pending: 0,
    scheduled: 0,
    urgent_unacknowledged: 0,
    follow_ups_overdue: 0,
  };

  return (
    <section className="content wide dashboard">
      <div className="dash-head">
        <div>
          <p className="eyebrow">COUNSELLOR DASHBOARD</p>
          <h1>Appointment queue</h1>
          <p className="subtle">Logged in as {counsellor.email}</p>
        </div>
        <button className="secondary" onClick={() => load()} disabled={loading}>
          Refresh
        </button>
      </div>

      <div className="stat-grid">
        <article className="stat-card">
          <span>Open requests</span>
          <strong>{stats.open}</strong>
        </article>
        <article className={`stat-card${stats.urgent_unacknowledged ? " stat-alert" : ""}`}>
          <span>Urgent awaiting acknowledgement</span>
          <strong>{stats.urgent_unacknowledged}</strong>
        </article>
        <article className="stat-card">
          <span>Scheduled</span>
          <strong>{stats.scheduled}</strong>
        </article>
        <article className={`stat-card${stats.follow_ups_overdue ? " stat-warn" : ""}`}>
          <span>Follow-ups overdue</span>
          <strong>{stats.follow_ups_overdue}</strong>
        </article>
      </div>

      <p className="dash-note">
        Urgent requests escalate to the backup counsellor after{" "}
        {data.escalation_minutes} minutes without acknowledgement.{" "}
        {data.email_alerts_enabled
          ? "Email alerts are enabled for the team."
          : "Email alerts are not configured — this dashboard is the notification channel."}
      </p>

      {error && <p className="error">{error}</p>}

      {data.alerts.length > 0 && (
        <div className="alert-banner" role="alert">
          <h2>Urgent requests waiting for acknowledgement</h2>
          {data.alerts.map((alert) => (
            <div className="alert-row" key={alert.appointment_id}>
              <span className="mono">{alert.tracking_code}</span>
              <span>Waiting {alert.minutes_waiting} min</span>
              {alert.escalated && (
                <span className="badge badge-escalated">Escalated to backup</span>
              )}
              <button
                className="mini ack"
                onClick={() => acknowledge(alert.appointment_id)}
                disabled={updatingId === alert.appointment_id}
              >
                Acknowledge
              </button>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <p>Loading appointments…</p>
      ) : data.appointments.length === 0 ? (
        <p>No appointment requests yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="appointments-table">
            <thead>
              <tr>
                <th>Priority</th>
                <th>Code</th>
                <th>Student email</th>
                <th>Preferred</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Acknowledgement</th>
                <th>Follow-up</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.appointments.map((apt) => {
                const isOpen = apt.status !== "completed" && apt.status !== "cancelled";
                return (
                  <Fragment key={apt.id}>
                    <tr className={apt.needs_acknowledgement ? "row-urgent" : ""}>
                      <td>
                        <PriorityBadge urgency={apt.urgency} />
                      </td>
                      <td className="mono">{apt.tracking_code}</td>
                      <td className="small">{apt.student_email}</td>
                      <td>{apt.preferred_contact}</td>
                      <td>
                        <span className={`badge badge-${apt.status}`}>{apt.status}</span>
                      </td>
                      <td className="small">{formatDateTime(apt.created_at)}</td>
                      <td className="small">
                        {apt.acknowledged_at ? (
                          <span className="ack-done">
                            {formatDateTime(apt.acknowledged_at)}
                            {apt.acknowledged_by_email
                              ? ` · ${apt.acknowledged_by_email}`
                              : ""}
                          </span>
                        ) : isOpen ? (
                          <button
                            className="mini ack"
                            onClick={() => acknowledge(apt.id)}
                            disabled={updatingId === apt.id}
                          >
                            Acknowledge
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className={`small${apt.follow_up_overdue ? " overdue" : ""}`}>
                        {apt.follow_up_due
                          ? `${apt.follow_up_overdue ? "Overdue " : "Due "}${formatDateTime(apt.follow_up_due)}`
                          : "—"}
                      </td>
                      <td>
                        <div className="action-row">
                          {STATUS_VALUES.map((s) => (
                            <button
                              key={s}
                              className="mini"
                              disabled={s === apt.status || updatingId === apt.id}
                              onClick={() => changeStatus(apt.id, s)}
                            >
                              {s}
                            </button>
                          ))}
                          <ScheduleInline appointment={apt} onSaved={() => load({ silent: true })} />
                          <button
                            className="mini"
                            onClick={() =>
                              setOpenThread(openThread === apt.id ? null : apt.id)
                            }
                          >
                            Thread{apt.message_count ? ` (${apt.message_count})` : ""}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {openThread === apt.id && (
                      <tr key={`thread-${apt.id}`} className="thread-row">
                        <td colSpan={9}>
                          <ThreadPanel appointmentId={apt.id} asCounsellor />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
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

// ────────────────────────────────────────────────
// SHARED HELPERS
// ────────────────────────────────────────────────

const PRIORITY_LABELS = { urgent: "Urgent", high: "High priority", normal: "Normal" };

function PriorityBadge({ urgency = "normal" }) {
  const value = PRIORITY_LABELS[urgency] ? urgency : "normal";
  return <span className={`priority priority-${value}`}>{PRIORITY_LABELS[value]}</span>;
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function toLocalInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function ScheduleInline({ appointment, onSaved }) {
  const [value, setValue] = useState(toLocalInput(appointment.scheduled_for));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    try {
      await scheduleAppointment(appointment.id, value || null);
      onSaved();
    } catch (err) {
      setError(err.message || "Could not save the time.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <span className="schedule-inline">
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label={`Appointment time for ${appointment.tracking_code}`}
      />
      <button className="mini" onClick={save} disabled={saving}>
        {saving ? "Saving…" : value ? "Save time" : "Clear"}
      </button>
      {error && <span className="error-inline">{error}</span>}
    </span>
  );
}

function ThreadPanel({ trackingCode, appointmentId, asCounsellor = false }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = asCounsellor
        ? await getStaffThread(appointmentId)
        : await getStudentThread(trackingCode);
      setMessages(result.messages || []);
    } catch (err) {
      setError(err.message || "Could not load messages.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackingCode, appointmentId, asCounsellor]);

  async function handleSend(event) {
    event.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    setError("");
    try {
      const result = asCounsellor
        ? await sendStaffMessage(appointmentId, body.trim())
        : await sendStudentMessage(trackingCode, body.trim());
      setMessages(result.messages || []);
      setBody("");
    } catch (err) {
      setError(err.message || "Could not send the message.");
    } finally {
      setSending(false);
    }
  }

  const inputId = `thread-${asCounsellor ? `a${appointmentId}` : trackingCode}`;

  return (
    <div className="thread">
      <div className="thread-head">
        <h3>Secure messages</h3>
        <p className="thread-note">
          {asCounsellor
            ? "The student reads this thread with their tracking code. Only share what the request needs."
            : "Anyone with your tracking code can read and write here — treat the code like a password."}
        </p>
      </div>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="thread-empty">Loading messages…</p>
      ) : messages.length === 0 ? (
        <p className="thread-empty">No messages yet. You can start the conversation here.</p>
      ) : (
        <ul className="thread-list">
          {messages.map((message) => (
            <li
              key={message.id}
              className={`thread-message ${message.sender === "student" ? "from-student" : "from-counsellor"}`}
            >
              <span className="thread-meta">
                {message.sender === "student" ? "Student" : "Counsellor"} ·{" "}
                {formatDateTime(message.created_at)}
              </span>
              <p>{message.body}</p>
            </li>
          ))}
        </ul>
      )}

      <form className="thread-form" onSubmit={handleSend}>
        <label htmlFor={inputId} className="sr-only">
          Message
        </label>
        <textarea
          id={inputId}
          rows={3}
          maxLength={2000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message…"
        />
        <button className="primary" type="submit" disabled={sending || !body.trim()}>
          {sending ? "Sending…" : "Send message"}
        </button>
      </form>
    </div>
  );
}

const RATING_LABELS = {
  1: "Very poor",
  2: "Poor",
  3: "Okay",
  4: "Good",
  5: "Very good",
};

function FeedbackForm({ trackingCode }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    if (!rating) {
      setError("Choose a rating first.");
      return;
    }
    setSending(true);
    setError("");
    try {
      await submitFeedback({ rating, comment, trackingCode });
      setSent(true);
    } catch (err) {
      setError(err.message || "Could not submit feedback.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="feedback-done">
        <strong>Thank you for the feedback.</strong>
        <p>It is stored anonymously and is not linked to your email.</p>
      </div>
    );
  }

  return (
    <div className="feedback">
      <h3>Rate your experience</h3>
      <p className="thread-note">
        Optional and anonymous: ratings and comments help improve the service
        and are not shown with your email.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="rating-row" role="group" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              type="button"
              key={value}
              className={`rating-btn${rating === value ? " active" : ""}`}
              aria-pressed={rating === value}
              onClick={() => setRating(value)}
            >
              <strong>{value}</strong>
              <span>{RATING_LABELS[value]}</span>
            </button>
          ))}
        </div>
        <label htmlFor="feedback-comment">What could we improve? (Optional)</label>
        <textarea
          id="feedback-comment"
          maxLength={500}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Please do not include personal or identifying details."
        />
        {error && <p className="error">{error}</p>}
        <button className="primary" type="submit" disabled={sending}>
          {sending ? "Submitting…" : "Send feedback"}
        </button>
      </form>
    </div>
  );
}

// ────────────────────────────────────────────────
// RESOURCE CENTRE
// ────────────────────────────────────────────────
const RESOURCES = [
  {
    title: "Managing stress",
    items: [
      "Name one thing you can control today and one thing you can set down.",
      "Short breaks between tasks help more than one long push.",
      "Sleep, food and movement are part of studying, not a distraction from it.",
      "If stress is constant for weeks, a counsellor can help you build a plan.",
    ],
  },
  {
    title: "Academic pressure",
    items: [
      "Break big assignments into steps you can finish in 30–45 minutes.",
      "Talk to your lecturer early if deadlines collide — options usually exist.",
      "Compare your progress with your own plan, not with classmates' highlights.",
      "Ask for support before results are released, not only after.",
    ],
  },
  {
    title: "Anxiety",
    items: [
      "A slow breath out (longer than the breath in) can settle the body a little.",
      "Write down the worry, then what part of it is happening right now.",
      "Limit doom-scrolling and late-night news where you can.",
      "If anxiety affects sleep, eating or attending classes, speak to a counsellor.",
    ],
  },
  {
    title: "Healthy relationships",
    items: [
      "Boundaries are allowed — you can say no without explaining everything.",
      "Consent and respect are not optional, in person or online.",
      "Jealousy, control or fear are reasons to seek support, not to blame yourself.",
      "The counselling team can talk through relationship concerns confidentially.",
    ],
  },
  {
    title: "Study–life balance",
    items: [
      "Protect one regular rest block each week, the way you protect a class.",
      "Plan your week around energy, not only around hours.",
      "Keep at least one connection that has nothing to do with grades.",
      "A sustainable routine beats an unsustainable one every semester.",
    ],
  },
  {
    title: "Where to get professional help",
    items: [
      "Request counselling here and keep your tracking code to follow progress.",
      "The counselling office is open 24 hours; replies happen as staff are available.",
      "For urgent concerns, mark your request urgent so it escalates on the staff dashboard.",
      "In immediate danger, contact campus security or Kenya's emergency services on 999 or 112.",
    ],
  },
];

function ResourcesPage({ setPage }) {
  return (
    <section className="content wide resources-page">
      <p className="eyebrow">RESOURCE CENTRE</p>
      <h1>Practical guides for hard weeks.</h1>
      <p>
        General wellbeing information for university life — not a diagnosis, and
        not a replacement for professional support.
      </p>

      <div className="crisis-panel" role="note">
        <strong>If you are in immediate danger</strong>
        <p>
          StudentCare is not an emergency service. Contact campus security or
          Kenya&rsquo;s emergency services on 999 or 112.
        </p>
      </div>

      <div className="resources-grid">
        {RESOURCES.map((resource) => (
          <article className="resource-card" key={resource.title}>
            <h2>{resource.title}</h2>
            <ul>
              {resource.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="resources-actions">
        <button className="primary" onClick={() => setPage("checkin")}>
          Take a wellbeing check-in
        </button>
        <button className="secondary" onClick={() => setPage("appointment")}>
          Request support
        </button>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────
// WELLBEING CHECK-IN
// ────────────────────────────────────────────────
const MOODS = [
  { value: 1, label: "Really struggling" },
  { value: 2, label: "Low" },
  { value: 3, label: "Just okay" },
  { value: 4, label: "Good" },
  { value: 5, label: "Really good" },
];

const CHECKIN_TIPS = {
  1: "Thank you for being honest. Reaching out is a strong next step — consider requesting support or talking to someone you trust today.",
  2: "Some days are heavy. Small basics — water, food, a short walk, a message to a friend — can help. Support is available if this lasts.",
  3: "Steady is okay. A short break, a walk or a chat with a friend can help keep the week balanced.",
  4: "Good to hear. Notice what helped today and keep it in your routine.",
  5: "That is worth noticing. Keep doing what supports you, and check in with friends who may need a hand too.",
};

function CheckinPage({ setPage }) {
  const [mood, setMood] = useState(0);
  const [code, setCode] = useState(sessionStorage.getItem("lastTrackingCode") || "");
  const [history, setHistory] = useState([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    if (!mood) {
      setError("Choose how you are feeling first.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await createCheckin({ mood, trackingCode: code.trim() });
      setHistory(result.history || []);
      setSaved(true);
    } catch (err) {
      setError(err.message || "Could not save your check-in.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="content">
      <h1>Wellbeing check-in</h1>
      <p>
        A quick, private way to notice how you are doing. There is no right
        answer and no score you need to reach.
      </p>
      <p className="field-hint">
        Check-ins store only your mood score and the time. Add your tracking
        code to see your recent check-ins and link them to your request.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="mood-grid" role="group" aria-label="How are you feeling?">
          {MOODS.map((option) => (
            <button
              type="button"
              key={option.value}
              className={`mood-option${mood === option.value ? " active" : ""}`}
              aria-pressed={mood === option.value}
              onClick={() => setMood(option.value)}
            >
              <strong>{option.value}</strong>
              <span>{option.label}</span>
            </button>
          ))}
        </div>

        <label htmlFor="checkin-code">Tracking code (optional)</label>
        <input
          id="checkin-code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="SC-XXXXXX"
        />

        {error && <p className="error">{error}</p>}

        <button className="primary" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save check-in"}
        </button>
      </form>

      {saved && (
        <div className="checkin-result">
          <strong>Check-in saved.</strong>
          <p>{CHECKIN_TIPS[mood]}</p>
          {history.length > 0 && (
            <>
              <h3>Recent check-ins</h3>
              <div className="mood-history">
                {history.map((entry, index) => (
                  <div
                    className="mood-bar"
                    key={`${entry.created_at}-${index}`}
                    title={`${entry.mood}/5 on ${formatDateTime(entry.created_at)}`}
                  >
                    <div
                      className="mood-bar-fill"
                      style={{ height: `${entry.mood * 20}%` }}
                    />
                    <span>{entry.mood}</span>
                  </div>
                ))}
              </div>
              <p className="mood-history-note">
                Oldest to newest. Each bar is one check-in score from 1 to 5.
              </p>
            </>
          )}
          <div className="checkin-actions">
            <button className="secondary" onClick={() => setPage("resources")}>
              Browse resources
            </button>
            <button className="primary" onClick={() => setPage("appointment")}>
              Request support
            </button>
          </div>
        </div>
      )}

      <p className="note">
        This check-in is not a diagnosis or a substitute for professional
        assessment. If you are in immediate danger, call campus security or
        Kenya&rsquo;s emergency services on 999 or 112.
      </p>
    </section>
  );
}

// ────────────────────────────────────────────────
// ADMIN INSIGHTS (aggregates only)
// ────────────────────────────────────────────────
function AdminPage() {
  const [summary, setSummary] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [summaryData, feedbackData] = await Promise.all([
        getAdminSummary(),
        getAdminFeedback(),
      ]);
      setSummary(summaryData);
      setFeedback(feedbackData.entries || []);
    } catch (err) {
      setError(err.message || "Could not load statistics.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const requests = summary?.requests || {};
  const total = requests.total_requests || 0;
  const checkinDays = summary?.checkins_last_14_days || [];
  const maxCheckins = Math.max(1, ...checkinDays.map((day) => day.count));

  return (
    <section className="content wide admin-page">
      <p className="eyebrow">ADMINISTRATION</p>
      <h1>Service overview</h1>
      <p className="subtle">
        Aggregates only. Student emails, message threads and individual
        check-ins are not available on this page.
      </p>

      {error && <p className="error">{error}</p>}

      {loading ? (
        <p>Loading statistics…</p>
      ) : summary && (
        <>
          <div className="stat-grid">
            <article className="stat-card">
              <span>Total requests</span>
              <strong>{total}</strong>
            </article>
            <article className="stat-card">
              <span>Open requests</span>
              <strong>{(requests.pending || 0) + (requests.scheduled || 0)}</strong>
            </article>
            <article className={`stat-card${requests.urgent_unacknowledged ? " stat-alert" : ""}`}>
              <span>Urgent unacknowledged</span>
              <strong>{requests.urgent_unacknowledged || 0}</strong>
            </article>
            <article className={`stat-card${requests.follow_ups_overdue ? " stat-warn" : ""}`}>
              <span>Follow-ups overdue</span>
              <strong>{requests.follow_ups_overdue || 0}</strong>
            </article>
            <article className="stat-card">
              <span>Avg time to acknowledge</span>
              <strong>
                {requests.avg_ack_minutes != null ? `${requests.avg_ack_minutes} min` : "—"}
              </strong>
            </article>
            <article className="stat-card">
              <span>Upcoming appointments</span>
              <strong>{requests.upcoming_appointments || 0}</strong>
            </article>
          </div>

          <div className="admin-columns">
            <article className="admin-panel">
              <h2>Priority mix</h2>
              <div className="bar-list">
                {[
                  { key: "urgent", label: "Urgent", cls: "urgent" },
                  { key: "high", label: "High", cls: "high" },
                  { key: "normal", label: "Normal", cls: "normal" },
                ].map((item) => (
                  <div className="bar-row" key={item.key}>
                    <span className="bar-label">{item.label}</span>
                    <div className="bar-track">
                      <div
                        className={`bar-fill ${item.cls}`}
                        style={{
                          width: `${total ? ((requests[item.key] || 0) / total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="bar-value">{requests[item.key] || 0}</span>
                  </div>
                ))}
              </div>

              <h2>Status</h2>
              <div className="chip-row">
                <span className="chip">Pending {requests.pending || 0}</span>
                <span className="chip">Scheduled {requests.scheduled || 0}</span>
                <span className="chip">Completed {requests.completed || 0}</span>
                <span className="chip">Cancelled {requests.cancelled || 0}</span>
              </div>

              <p className="admin-note">
                Messages exchanged (all time): {summary.messages.total}; in the
                last 7 days: {summary.messages.last_7_days}.
              </p>
            </article>

            <article className="admin-panel">
              <h2>Wellbeing check-ins (14 days)</h2>
              {checkinDays.length === 0 ? (
                <p className="subtle">No check-ins recorded yet.</p>
              ) : (
                <div className="checkin-chart">
                  {checkinDays.map((day) => (
                    <div
                      className="chart-col"
                      key={day.day}
                      title={`${day.count} check-in(s), average mood ${day.avg_mood ?? "—"}`}
                    >
                      <div className="chart-bar">
                        <div style={{ height: `${Math.max(8, (day.count / maxCheckins) * 100)}%` }} />
                      </div>
                      <span>{day.day.slice(5)}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="admin-note">
                Daily counts only; individual mood records and identities are not
                shown.
              </p>

              <h2>Feedback</h2>
              <p className="admin-note">
                Average rating: <strong>{summary.feedback.average ?? "—"}</strong>{" "}
                from {summary.feedback.count} response(s).
              </p>
              {feedback.length === 0 ? (
                <p className="subtle">No anonymous feedback yet.</p>
              ) : (
                <ul className="feedback-list">
                  {feedback.map((entry) => (
                    <li key={entry.id}>
                      <span className="feedback-rating">{entry.rating}/5</span>
                      <p>{entry.comment || "No comment left."}</p>
                      <span className="small">{formatDateTime(entry.created_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </div>
        </>
      )}

      <button className="secondary" onClick={load} disabled={loading}>
        Refresh
      </button>
    </section>
  );
}

export default App;