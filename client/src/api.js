// Central place for API configuration.
// Empty base means same origin: Vite proxies /api to Flask in development,
// and Flask serves the built client in production.

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

// Common options for every fetch — includes cookies/session
const withCredentials = {
  credentials: "include",
  headers: { "Content-Type": "application/json" },
};

// ────────────────────────────────────────────────
// PUBLIC (Student side)
// ────────────────────────────────────────────────

export async function createAppointment({ email, preferredContact, urgency }) {
  const response = await fetch(`${API_BASE_URL}/api/appointments`, {
    ...withCredentials,
    method: "POST",
    body: JSON.stringify({
      email,
      preferred_contact: preferredContact,
      urgency,
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

export async function acknowledgeAppointment(appointmentId) {
  const response = await fetch(
    `${API_BASE_URL}/api/appointments/${appointmentId}/acknowledge`,
    { ...withCredentials, method: "POST" }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not acknowledge request.");
  return data;
}

export async function scheduleAppointment(appointmentId, scheduledFor) {
  const response = await fetch(
    `${API_BASE_URL}/api/appointments/${appointmentId}/schedule`,
    {
      ...withCredentials,
      method: "PATCH",
      body: JSON.stringify({ scheduled_for: scheduledFor }),
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not update the appointment time.");
  return data;
}

// ────────────────────────────────────────────────
// MESSAGES (student side uses the tracking code)
// ────────────────────────────────────────────────

export async function getStudentThread(trackingCode) {
  const response = await fetch(
    `${API_BASE_URL}/api/requests/${encodeURIComponent(trackingCode)}/messages`,
    { credentials: "include" }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not load messages.");
  return data;
}

export async function sendStudentMessage(trackingCode, body) {
  const response = await fetch(
    `${API_BASE_URL}/api/requests/${encodeURIComponent(trackingCode)}/messages`,
    {
      ...withCredentials,
      method: "POST",
      body: JSON.stringify({ body }),
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not send the message.");
  return data;
}

export async function getStaffThread(appointmentId) {
  const response = await fetch(
    `${API_BASE_URL}/api/appointments/${appointmentId}/messages`,
    { credentials: "include" }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not load the conversation.");
  return data;
}

export async function sendStaffMessage(appointmentId, body) {
  const response = await fetch(
    `${API_BASE_URL}/api/appointments/${appointmentId}/messages`,
    {
      ...withCredentials,
      method: "POST",
      body: JSON.stringify({ body }),
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not send the message.");
  return data;
}

// ────────────────────────────────────────────────
// CHECK-INS, FEEDBACK, ADMIN
// ────────────────────────────────────────────────

export async function createCheckin({ mood, trackingCode }) {
  const response = await fetch(`${API_BASE_URL}/api/checkins`, {
    ...withCredentials,
    method: "POST",
    body: JSON.stringify({ mood, tracking_code: trackingCode }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not save your check-in.");
  return data;
}

export async function submitFeedback({ rating, comment, trackingCode }) {
  const response = await fetch(`${API_BASE_URL}/api/feedback`, {
    ...withCredentials,
    method: "POST",
    body: JSON.stringify({ rating, comment, tracking_code: trackingCode }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not submit feedback.");
  return data;
}

export async function getAdminSummary() {
  const response = await fetch(`${API_BASE_URL}/api/admin/summary`, {
    credentials: "include",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not load the summary.");
  return data;
}

export async function getAdminFeedback() {
  const response = await fetch(`${API_BASE_URL}/api/admin/feedback`, {
    credentials: "include",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Could not load feedback.");
  return data;
}