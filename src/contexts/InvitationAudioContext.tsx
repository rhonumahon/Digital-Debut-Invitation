import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

type InvitationAudioContextValue = {
  setMomentVideosVisible: (visible: boolean) => void;
};

const InvitationAudioContext = createContext<InvitationAudioContextValue | null>(
  null,
);

export const INVITATION_USER_ACTIVATED = "invitation-user-activated";

export function notifyInvitationUserActivation() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(INVITATION_USER_ACTIVATED));
}

function getInvitationAudio() {
  if (typeof document === "undefined") return null;
  return document.getElementById("invitation-audio") as HTMLAudioElement | null;
}

export function InvitationAudioProvider({ children }: { children: ReactNode }) {
  const visibleMomentsRef = useRef(0);
  const pausedForVideoRef = useRef(false);

  const setMomentVideosVisible = useCallback((visible: boolean) => {
    if (visible) {
      visibleMomentsRef.current += 1;
      if (visibleMomentsRef.current !== 1) return;
      const audio = getInvitationAudio();
      if (audio && !audio.paused) {
        pausedForVideoRef.current = true;
        audio.pause();
      } else {
        pausedForVideoRef.current = false;
      }
      return;
    }

    visibleMomentsRef.current = Math.max(0, visibleMomentsRef.current - 1);
    if (visibleMomentsRef.current !== 0 || !pausedForVideoRef.current) return;
    pausedForVideoRef.current = false;
    const audio = getInvitationAudio();
    if (!audio) return;
    audio.play().catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ setMomentVideosVisible }),
    [setMomentVideosVisible],
  );

  return (
    <InvitationAudioContext.Provider value={value}>
      {children}
    </InvitationAudioContext.Provider>
  );
}

export function useInvitationVideoAudio() {
  const ctx = useContext(InvitationAudioContext);
  if (!ctx) {
    throw new Error("useInvitationVideoAudio must be used within InvitationAudioProvider");
  }
  return ctx;
}
