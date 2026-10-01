export const GUEST_SESSION_KEY = "jaylyn-guest-id";
export const ADMIN_PIN_KEY = "jaylyn-admin-pin";

export function readGuestSession(): string | null {
  try {
    const saved = localStorage.getItem(GUEST_SESSION_KEY);
    if (saved) return saved;
    const earlier = sessionStorage.getItem(GUEST_SESSION_KEY);
    if (!earlier) return null;
    localStorage.setItem(GUEST_SESSION_KEY, earlier);
    return earlier;
  } catch {
    return null;
  }
}

export function rememberGuest(guestId: string) {
  localStorage.setItem(GUEST_SESSION_KEY, guestId);
}
