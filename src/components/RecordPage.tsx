import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

type RecordPhase = "idle" | "picking" | "recording" | "done" | "error";

type QualityPreset = "high" | "best";

const QUALITY_BITRATE: Record<QualityPreset, number> = {
  high: 256_000,
  best: 510_000,
};

function pickAudioMimeType(): string | undefined {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "video/webm;codecs=opus",
    "video/webm",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function parseStopDuration(minutes: number, seconds: number): number | null {
  const total = clampInt(minutes, 0, 999) * 60 + clampInt(seconds, 0, 59);
  return total > 0 ? total : null;
}

export default function RecordPage() {
  const [phase, setPhase] = useState<RecordPhase>("idle");
  const [message, setMessage] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState("");
  const [fileSizeLabel, setFileSizeLabel] = useState("");

  const [autoStop, setAutoStop] = useState(true);
  const [stopMinutes, setStopMinutes] = useState(3);
  const [stopSeconds, setStopSeconds] = useState(36);
  const [quality, setQuality] = useState<QualityPreset>("best");

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<number | null>(null);
  const mimeTypeRef = useRef("");
  const stopAfterRef = useRef<number | null>(null);
  const stopRecordingRef = useRef<() => void>(() => {});

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      cleanupStream();
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [cleanupStream, downloadUrl]);

  const stopRecording = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      cleanupStream();
      setPhase("idle");
    }
  }, [cleanupStream]);

  stopRecordingRef.current = stopRecording;

  const startRecording = useCallback(async () => {
    setMessage("");
    setFileSizeLabel("");
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl(null);
    }

    stopAfterRef.current = autoStop ? parseStopDuration(stopMinutes, stopSeconds) : null;

    if (!navigator.mediaDevices?.getDisplayMedia) {
      setPhase("error");
      setMessage("This browser does not support screen/tab audio capture. Try Chrome or Edge on desktop.");
      return;
    }

    setPhase("picking");

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          suppressLocalAudioPlayback: false,
        } as MediaTrackConstraints,
      });

      const audioTracks = displayStream.getAudioTracks();
      displayStream.getVideoTracks().forEach((track) => track.stop());

      if (audioTracks.length === 0) {
        audioTracks.forEach((track) => track.stop());
        setPhase("error");
        setMessage(
          "No audio track was shared. Pick a Chrome tab that is playing sound and turn on “Share tab audio”, or share your screen with “Share system audio” if shown.",
        );
        return;
      }

      const audioStream = new MediaStream(audioTracks);
      streamRef.current = audioStream;

      const mimeType = pickAudioMimeType();
      if (!mimeType) {
        cleanupStream();
        setPhase("error");
        setMessage("MediaRecorder has no supported format on this browser.");
        return;
      }
      mimeTypeRef.current = mimeType;

      chunksRef.current = [];
      const recorder = new MediaRecorder(audioStream, {
        mimeType,
        audioBitsPerSecond: QUALITY_BITRATE[quality],
      });
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        cleanupStream();
        recorderRef.current = null;
        const blob = new Blob(chunksRef.current, {
          type: mimeTypeRef.current.split(";")[0] ?? "audio/webm",
        });
        chunksRef.current = [];
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        const name = `machine-audio-${stamp}.webm`;
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setDownloadName(name);
        setFileSizeLabel(formatBytes(blob.size));
        setPhase("done");
      };

      audioTracks[0]?.addEventListener("ended", () => {
        stopRecordingRef.current();
      });

      recorder.start(250);
      setElapsed(0);
      timerRef.current = window.setInterval(() => {
        setElapsed((value) => {
          const next = value + 1;
          const limit = stopAfterRef.current;
          if (limit !== null && next >= limit) {
            window.setTimeout(() => stopRecordingRef.current(), 0);
          }
          return next;
        });
      }, 1000);
      setPhase("recording");
    } catch (err) {
      cleanupStream();
      const name = err instanceof Error ? err.name : "";
      if (name === "NotAllowedError") {
        setPhase("idle");
        setMessage("Capture was cancelled. Try again when you are ready.");
      } else {
        setPhase("error");
        setMessage(err instanceof Error ? err.message : "Could not start capture.");
      }
    }
  }, [autoStop, cleanupStream, downloadUrl, quality, stopMinutes, stopSeconds]);

  const stopLimit = autoStop ? parseStopDuration(stopMinutes, stopSeconds) : null;
  const remaining =
    phase === "recording" && stopLimit !== null ? Math.max(0, stopLimit - elapsed) : null;

  const settingsLocked = phase === "picking" || phase === "recording";

  return (
    <div className="min-h-screen bg-[#06101c] text-[#f6f0e6] px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-lg">
        <p className="font-cinzel text-xs tracking-[0.2em] uppercase text-[#f09060]">Local utility</p>
        <h1 className="font-playfair text-3xl sm:text-4xl mt-2 text-[#f6f0e6]">Record machine audio</h1>
        <p className="font-garamond text-base text-[#f0d2b0] mt-4 leading-relaxed">
          This page records <strong className="font-normal text-[#f6f0e6]">digital audio</strong> from what you share
          (a browser tab or your screen)—not your microphone—so room noise is not picked up.
        </p>

        <fieldset
          disabled={settingsLocked}
          className="mt-8 rounded-lg border border-[#f09060]/25 bg-[#0e2744]/60 px-4 py-4 disabled:opacity-60"
        >
          <legend className="font-cinzel text-xs tracking-wider uppercase text-[#f09060] px-1">Before you record</legend>

          <label className="mt-2 flex items-center gap-3 font-garamond text-sm text-[#f0d2b0] cursor-pointer">
            <input
              type="checkbox"
              checked={autoStop}
              onChange={(event) => setAutoStop(event.target.checked)}
              className="size-4 accent-[#f09060]"
            />
            Stop automatically after
          </label>

          {autoStop && (
            <div className="mt-3 flex flex-wrap items-center gap-2 font-garamond text-sm text-[#f0d2b0]">
              <label className="flex items-center gap-1.5">
                <span className="sr-only">Minutes</span>
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={stopMinutes}
                  onChange={(event) => setStopMinutes(clampInt(Number(event.target.value), 0, 999))}
                  className="w-16 rounded-md border border-[#f09060]/40 bg-[#06101c] px-2 py-1.5 text-[#f6f0e6] tabular-nums"
                />
                <span>min</span>
              </label>
              <label className="flex items-center gap-1.5">
                <span className="sr-only">Seconds</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={stopSeconds}
                  onChange={(event) => setStopSeconds(clampInt(Number(event.target.value), 0, 59))}
                  className="w-16 rounded-md border border-[#f09060]/40 bg-[#06101c] px-2 py-1.5 text-[#f6f0e6] tabular-nums"
                />
                <span>sec</span>
              </label>
              {stopLimit !== null && (
                <span className="text-[#f6f0e6]/90">({formatElapsed(stopLimit)} total)</span>
              )}
            </div>
          )}

          {!autoStop && (
            <p className="mt-2 font-garamond text-xs text-[#f0d2b0]/90">Recording runs until you tap Stop.</p>
          )}

          <div className="mt-4">
            <p className="font-cinzel text-[10px] tracking-wider uppercase text-[#f09060]">Quality</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(
                [
                  ["high", "High (256 kbps)"],
                  ["best", "Best (510 kbps)"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setQuality(id)}
                  className={`font-garamond text-sm px-3 py-1.5 rounded-full border transition ${
                    quality === id
                      ? "border-[#f09060] bg-[#f09060]/15 text-[#f6f0e6]"
                      : "border-[#f09060]/35 text-[#f0d2b0] hover:border-[#f09060]/60"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 font-garamond text-xs text-[#f0d2b0]/85">
              Opus WebM at the highest bitrate your browser allows. Processing (noise cancel / auto-gain) is turned off
              for a cleaner capture.
            </p>
          </div>
        </fieldset>

        <ol className="font-garamond text-sm text-[#f0d2b0] mt-6 space-y-2 list-decimal list-inside">
          <li>Start playback in a <strong className="font-normal text-[#f6f0e6]">Chrome tab</strong> (or app via screen share).</li>
          <li>Tap Record, pick the source, enable <strong className="font-normal text-[#f6f0e6]">Share tab audio</strong>.</li>
          <li>
            {autoStop && stopLimit !== null
              ? `Recording stops at ${formatElapsed(stopLimit)} unless you stop sooner.`
              : "Tap Stop when finished."}
          </li>
        </ol>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          {phase !== "recording" ? (
            <button
              type="button"
              disabled={phase === "picking" || (autoStop && stopLimit === null)}
              onClick={() => void startRecording()}
              className="font-cinzel text-sm tracking-wider uppercase px-6 py-3 rounded-full bg-[#f09060] text-[#06101c] disabled:opacity-50 hover:brightness-110 transition"
            >
              {phase === "picking" ? "Choose source…" : "Record"}
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="font-cinzel text-sm tracking-wider uppercase px-6 py-3 rounded-full border border-[#f09060] text-[#f09060] hover:bg-[#f09060]/10 transition"
            >
              Stop
            </button>
          )}
          {phase === "recording" && (
            <div className="font-garamond text-lg text-[#f6f0e6] tabular-nums">
              <span>{formatElapsed(elapsed)}</span>
              {remaining !== null && (
                <span className="ml-3 text-sm text-[#f0d2b0]">
                  · {formatElapsed(remaining)} left
                </span>
              )}
            </div>
          )}
        </div>

        {autoStop && stopLimit === null && phase === "idle" && (
          <p className="font-garamond text-sm mt-4 text-[#f09060]">Set a duration above zero, or turn off auto-stop.</p>
        )}

        {message && (
          <p className="font-garamond text-sm mt-6 text-[#f0d2b0] border border-[#f09060]/30 rounded-lg px-4 py-3" role="status">
            {message}
          </p>
        )}

        {downloadUrl && phase === "done" && (
          <div className="mt-6 rounded-lg border border-[#f09060]/25 bg-[#0e2744] px-4 py-4">
            <p className="font-garamond text-[#f6f0e6]">Recording ready</p>
            {fileSizeLabel && (
              <p className="font-garamond text-xs text-[#f0d2b0] mt-1">{fileSizeLabel}</p>
            )}
            <a
              href={downloadUrl}
              download={downloadName}
              className="inline-block mt-3 font-cinzel text-xs tracking-wider uppercase text-[#f09060] underline underline-offset-4"
            >
              Download {downloadName}
            </a>
          </div>
        )}

        <p className="font-garamond text-xs text-[#f0d2b0]/80 mt-10">
          Files stay on this device unless you upload them elsewhere. Only use audio you may legally keep or publish.
        </p>

        <Link to="/" className="inline-block mt-6 font-cinzel text-xs tracking-wider uppercase text-[#f09060]/90 hover:text-[#f09060]">
          ← Back to invitation
        </Link>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
