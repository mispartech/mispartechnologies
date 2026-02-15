/**
 * Demo Session Manager
 * Manages anonymous demo sessions with 7-day expiry using localStorage.
 */

const DEMO_SESSION_KEY = 'mispar_demo_session';
const DEMO_EXPIRY_DAYS = 7;

interface DemoSession {
  demoId: string;
  enrolledAt: string | null;
  expiresAt: string;
  createdAt: string;
}

function generateDemoId(): string {
  return 'demo-' + crypto.randomUUID();
}

export function getDemoSession(): DemoSession | null {
  try {
    const raw = localStorage.getItem(DEMO_SESSION_KEY);
    if (!raw) return null;

    const session: DemoSession = JSON.parse(raw);

    // Check expiry
    if (new Date(session.expiresAt) < new Date()) {
      localStorage.removeItem(DEMO_SESSION_KEY);
      return null;
    }

    return session;
  } catch {
    localStorage.removeItem(DEMO_SESSION_KEY);
    return null;
  }
}

export function getOrCreateDemoSession(): DemoSession {
  const existing = getDemoSession();
  if (existing) return existing;

  const now = new Date();
  const expiresAt = new Date(now.getTime() + DEMO_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const session: DemoSession = {
    demoId: generateDemoId(),
    enrolledAt: null,
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
  };

  localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
  return session;
}

export function markDemoEnrolled(): void {
  const session = getDemoSession();
  if (session) {
    session.enrolledAt = new Date().toISOString();
    localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
  }
}

export function isDemoEnrolled(): boolean {
  const session = getDemoSession();
  return !!session?.enrolledAt;
}

export function getDemoId(): string {
  return getOrCreateDemoSession().demoId;
}

export function getDemoTimeRemaining(): { days: number; hours: number } | null {
  const session = getDemoSession();
  if (!session?.enrolledAt) return null;

  const now = new Date();
  const expires = new Date(session.expiresAt);
  const diff = expires.getTime() - now.getTime();

  if (diff <= 0) return null;

  return {
    days: Math.floor(diff / (24 * 60 * 60 * 1000)),
    hours: Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000)),
  };
}

export function clearDemoSession(): void {
  localStorage.removeItem(DEMO_SESSION_KEY);
}
