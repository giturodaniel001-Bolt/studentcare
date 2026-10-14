import { useState, useEffect } from "react";
import "./App.css";
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

  return (
    <div className="app">
      <header className="navbar">
        <a className="brand" href="#home" onClick={() => setPage("home")}>
          <span className="brand-icon">+</span>
          StudentCare
        </a>

        <nav>
          <button onClick={() => setPage("home")}>Home</button>
          <button onClick={() => setPage("privacy")}>Confidentiality</button>
          <button onClick={() => setPage("appointment")}>Get Support</button>
          <button onClick={() => setPage("status")}>Check Status</button>

          {authChecked && !counsellor && (
            <button onClick={() => setPage("login")} className="nav-cta">
              Counsellor Login
            </button>
          )}

          {counsellor && (
            <>
              <button onClick={() => setPage("dashboard")}>Dashboard</button>
              <button onClick={() => setPage("audit")}>Audit Log</button>
              <button onClick={handleLogout} className="nav-logout">
                Logout
              </button>
            </>
          )}
        </nav>
      </header>

      <main>
        {page === "home" && <HomePage setPage={setPage} />}
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

      <footer>StudentCare · Student wellbeing and support</footer>
    </div>
  );
}

// ────────────────────────────────────────────────
// HOME
// ────────────────────────────────────────────────
function HomePage({ setPage }) {
  return (
    <section className="hero">
      <p className="eyebrow">YOUR WELLBEING MATTERS</p>
      <h1>
        You deserve support.
        <br />
        Your story matters.
      </h1>
      <p className="intro">
        A simple, private way to explore counselling services and request an
        appointment. You don't have to explain everything at once.
      </p>

      <button className="primary" onClick={() => setPage("appointment")}>
        Request an appointment
      </button>
      <button className="secondary" onClick={() => setPage("privacy")}>
        Understand your privacy
      </button>

      <div className="note">
        You can seek support at your own pace. This service is a prototype, not
        an emergency service.
      </div>
    </section>
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
    <section className="content">
      <h1>Counsellor login</h1>
      <p>
        This area is only for authorised counselling staff. Students do not need
        to log in to request support.
      </p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="counsellor@example.com"
        />

        <label htmlFor="login-password">Password</label>
        <input
          id="login-password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="error">{error}</p>}

        <button className="primary" type="submit" disabled={loading}>
          {loading ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="note">
        Not a counsellor?{" "}
        <button
          type="button"
          className="linklike"
          onClick={() => setPage("home")}
        >
          Return to home
        </button>
      </p>
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