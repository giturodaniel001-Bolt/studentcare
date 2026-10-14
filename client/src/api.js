// Central place for API configuration.
// If your Flask server runs on a different host/port later, change it here only.

export const API_BASE_URL = "http://localhost:5000";

// Common options for every fetch — includes cookies/session
const withCredentials = {
  credentials: "include",
  headers: { "Content-Type": "application/json" },
};

// ────────────────────────────────────────────────
// PUBLIC (Student side)
// ────────────────────────────────────────────────

export async function createAppointment({ email, preferredContact }) {
  const response = await fetch(`${API_BASE_URL}/api/appointments`, {
    ...withCredentials,
    method: "POST",
    body: JSON.stringify({
      email,
      preferred_contact: preferredContact,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not submit appointment.");
  return data;
}

export async function getAppointmentStatus(trackingCode) {
  const response = await fetch(
    `${API_BASE_URL}/api/appointments/${encodeURIComponent(trackingCode)}`,
    { credentials: "include" }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Appointment not found.");
  return data;
}

// ────────────────────────────────────────────────
// AUTH
// ────────────────────────────────────────────────

export async function login(email, password) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    ...withCredentials,
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Login failed.");
  return data;
}

export async function logout() {
  const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    ...withCredentials,
    method: "POST",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Logout failed.");
  return data;
}

export async function getCurrentUser() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      credentials: "include",
    });
    const data = await response.json().catch(() => ({}));
    return data; // { authenticated: bool, user?: {...} }
  } catch {
    return { authenticated: false };
  }
}

// ────────────────────────────────────────────────
// COUNSELLOR
// ────────────────────────────────────────────────

export async function listAppointments() {
  const response = await fetch(`${API_BASE_URL}/api/appointments`, {
    credentials: "include",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not load appointments.");
  return data;
}

export async function updateAppointmentStatus(appointmentId, newStatus) {
  const response = await fetch(
    `${API_BASE_URL}/api/appointments/${appointmentId}/status`,
    {
      ...withCredentials,
      method: "PATCH",
      body: JSON.stringify({ status: newStatus }),
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not update status.");
  return data;
}

export async function getAuditLog() {
  const response = await fetch(`${API_BASE_URL}/api/audit-log`, {
    credentials: "include",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not load audit log.");
  return data;
}