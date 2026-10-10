import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useDebutProgram } from "../hooks/useDebutProgram";
import {
  deleteTrack,
  deleteVideo,
  getTrackBlob,
  getVideoBlob,
  listTracks,
  listVideos,
  saveTrack,
  saveVideo,
} from "../program/audioDb";
import { WELCOME_PROGRAM_TITLE } from "../program/defaultProgram";
import { addBlankStep, loadProgramState, moveStep, moveStepTrackIds, removeStep } from "../program/programStore";
import type { ProgramStep, ProgramTrack, ProgramVideo } from "../program/types";
import {
  getInvitationBackgroundAudio,
  holdInvitationBackgroundAudio,
  releaseInvitationBackgroundAudio,
} from "../utils/invitationBackgroundAudio";
import DjSoundPad from "./DjSoundPad";

type NowPlaying = {
  trackId: string;
  label: string;
  fileName: string;
};

type NoteModalState = { stepId: string; title: string; draft: string } | null;
type MusicModalState = { stepId: string; title: string } | null;
type VideoModalState = { stepId: string; title: string } | null;
type TitleModalState = { stepId: string; draft: string } | null;
type ActiveVideo = { id: string; label: string; fileName: string; url: string };

export default function ProgramPage() {
  const { state, persist } = useDebutProgram();
  const [tracks, setTracks] = useState<ProgramTrack[]>([]);
  const [videos, setVideos] = useState<ProgramVideo[]>([]);
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeVideo, setActiveVideo] = useState<ActiveVideo | null>(null);
  const [loadError, setLoadError] = useState("");
  const [noteModal, setNoteModal] = useState<NoteModalState>(null);
  const [musicModal, setMusicModal] = useState<MusicModalState>(null);
  const [videoModal, setVideoModal] = useState<VideoModalState>(null);
  const [titleModal, setTitleModal] = useState<TitleModalState>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const videoObjectUrlRef = useRef<string | null>(null);
  const playlistQueueRef = useRef<{ ids: string[]; segmentLabel: string } | null>(null);
  const [musicPickId, setMusicPickId] = useState("");

  const refreshTracks = useCallback(async () => {
    try {
      setTracks(await listTracks());
    } catch {
      setLoadError("Could not read saved MP3 library on this device.");
    }
  }, []);

  const refreshVideos = useCallback(async () => {
    try {
      setVideos(await listVideos());
    } catch {
      setLoadError("Could not read saved videos on this device.");
    }
  }, []);

  useEffect(() => {
    void refreshTracks();
    void refreshVideos();
  }, [refreshTracks, refreshVideos]);

  useEffect(() => {
    holdInvitationBackgroundAudio();
    const invitationAudio = getInvitationBackgroundAudio();
    const keepSilent = () => {
      if (!window.__invitationMusicHeld || !invitationAudio) return;
      invitationAudio.pause();
      invitationAudio.muted = true;
    };
    invitationAudio?.addEventListener("play", keepSilent);
    return () => {
      invitationAudio?.removeEventListener("play", keepSilent);
      releaseInvitationBackgroundAudio();
    };
  }, []);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const revokeVideoObjectUrl = useCallback(() => {
    if (videoObjectUrlRef.current) {
      URL.revokeObjectURL(videoObjectUrlRef.current);
      videoObjectUrlRef.current = null;
    }
  }, []);

  const closeVideoPlayer = useCallback(() => {
    revokeVideoObjectUrl();
    setActiveVideo(null);
  }, [revokeVideoObjectUrl]);

  useEffect(() => () => revokeVideoObjectUrl(), [revokeVideoObjectUrl]);

  const playTrackById = useCallback(
    async (trackId: string, segmentLabel: string) => {
      setLoadError("");
      const blob = await getTrackBlob(trackId);
      if (!blob) {
        setLoadError("That MP3 is missing from this browser’s storage.");
        playlistQueueRef.current = null;
        return;
      }
      const track = tracks.find((item) => item.id === trackId);
      revokeObjectUrl();
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      const audio = audioRef.current;
      if (!audio) return;
      audio.src = url;
      audio.load();
      await audio.play();
      setNowPlaying({ trackId, label: segmentLabel, fileName: track?.fileName ?? "Track" });
      setIsPlaying(true);
    },
    [revokeObjectUrl, tracks],
  );

  const playTrack = useCallback(
    (trackId: string, label: string) => {
      playlistQueueRef.current = null;
      void playTrackById(trackId, label);
    },
    [playTrackById],
  );

  const playSegmentPlaylist = useCallback(
    (step: ProgramStep) => {
      if (!step.trackIds.length) return;
      const [first, ...rest] = step.trackIds;
      playlistQueueRef.current = rest.length ? { ids: rest, segmentLabel: step.title } : null;
      void playTrackById(first, step.title);
    },
    [playTrackById],
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      const queue = playlistQueueRef.current;
      if (queue?.ids.length) {
        const [next, ...rest] = queue.ids;
        playlistQueueRef.current = rest.length ? { ids: rest, segmentLabel: queue.segmentLabel } : null;
        void playTrackById(next, queue.segmentLabel);
        return;
      }
      playlistQueueRef.current = null;
      setIsPlaying(false);
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      revokeObjectUrl();
    };
  }, [playTrackById, revokeObjectUrl]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  };

  const uploadFiles = async (files: FileList | null, assignStepId?: string) => {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("audio/") && !file.name.toLowerCase().endsWith(".mp3")) continue;
      const saved = await saveTrack(file);
      if (assignStepId) {
        const current = loadProgramState();
        persist({
          steps: current.steps.map((step) => {
            if (step.id !== assignStepId) return step;
            if (step.trackIds.includes(saved.id)) return step;
            return { ...step, trackIds: [...step.trackIds, saved.id] };
          }),
        });
      }
    }
    await refreshTracks();
  };

  const uploadVideos = async (files: FileList | null, assignStepId?: string) => {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      const isVideo =
        file.type.startsWith("video/") || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
      if (!isVideo) continue;
      const saved = await saveVideo(file);
      if (assignStepId) {
        persist({
          steps: state.steps.map((step) =>
            step.id === assignStepId ? { ...step, videoId: saved.id } : step,
          ),
        });
      }
    }
    await refreshVideos();
  };

  const playVideo = useCallback(
    async (videoId: string, label: string) => {
      setLoadError("");
      const blob = await getVideoBlob(videoId);
      if (!blob) {
        setLoadError("That video is missing from this browser’s storage.");
        return;
      }
      const item = videos.find((video) => video.id === videoId);
      revokeVideoObjectUrl();
      const url = URL.createObjectURL(blob);
      videoObjectUrlRef.current = url;
      setActiveVideo({ id: videoId, label, fileName: item?.fileName ?? "Video", url });
    },
    [revokeVideoObjectUrl, videos],
  );

  const onDeleteTrack = async (trackId: string) => {
    if (!window.confirm("Remove this MP3 from the library? Steps using it will lose their assignment.")) return;
    await deleteTrack(trackId);
    persist({
      steps: state.steps.map((step) => ({
        ...step,
        trackIds: step.trackIds.filter((id) => id !== trackId),
      })),
    });
    if (nowPlaying?.trackId === trackId) {
      audioRef.current?.pause();
      setNowPlaying(null);
      revokeObjectUrl();
    }
    await refreshTracks();
  };

  const onDeleteVideo = async (videoId: string) => {
    if (!window.confirm("Remove this video from the library? Segments using it will lose their assignment.")) return;
    await deleteVideo(videoId);
    persist({
      steps: state.steps.map((step) => (step.videoId === videoId ? { ...step, videoId: null } : step)),
    });
    if (activeVideo?.id === videoId) {
      closeVideoPlayer();
    }
    await refreshVideos();
  };

  const updateStep = (id: string, patch: Partial<ProgramStep>) => {
    persist({
      steps: state.steps.map((step) => (step.id === id ? { ...step, ...patch } : step)),
    });
  };

  const stepById = (id: string) => state.steps.find((step) => step.id === id);

  const saveNote = () => {
    if (!noteModal) return;
    updateStep(noteModal.stepId, { note: noteModal.draft.trim() });
    setNoteModal(null);
  };

  const saveTitle = () => {
    if (!titleModal) return;
    const title = titleModal.draft.trim();
    if (title) updateStep(titleModal.stepId, { title });
    setTitleModal(null);
  };

  const musicStep = musicModal ? stepById(musicModal.stepId) : undefined;
  const videoStep = videoModal ? stepById(videoModal.stepId) : undefined;

  const addTrackToStep = (stepId: string, trackId: string) => {
    if (!trackId) return;
    const step = stepById(stepId);
    if (!step || step.trackIds.includes(trackId)) return;
    updateStep(stepId, { trackIds: [...step.trackIds, trackId] });
    setMusicPickId("");
  };

  const removeTrackFromStep = (stepId: string, trackId: string) => {
    const step = stepById(stepId);
    if (!step) return;
    updateStep(stepId, { trackIds: step.trackIds.filter((id) => id !== trackId) });
  };

  return (
    <div className="min-h-screen bg-[#06101c] text-[#f6f0e6] pb-28">
      <audio ref={audioRef} preload="auto" className="hidden" />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
        <p className="font-cinzel text-xs tracking-[0.2em] uppercase text-[#f09060]">Event desk</p>
        <h1 className="font-playfair text-3xl sm:text-4xl mt-2">Program & music</h1>
        <p className="font-garamond text-[#f0d2b0] mt-3 max-w-2xl leading-relaxed">
          Run the night from the timeline. Notes appear as descriptions—use Add note to edit in a dialog.
        </p>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] lg:items-start">
          {/* Left: vertical timeline */}
          <section className="relative min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <h2 className="font-cinzel text-xs tracking-wider uppercase text-[#f09060]">Timeline</h2>
              <button
                type="button"
                onClick={() => persist({ steps: addBlankStep(state.steps) })}
                className="font-cinzel text-[10px] tracking-wider uppercase px-3 py-1.5 rounded-full border border-[#f09060]/50 text-[#f09060]"
              >
                Add segment
              </button>
            </div>

            <div className="relative pl-8 sm:pl-10 pb-4">
              <div
                className="absolute left-[11px] sm:left-[13px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-[#f09060]/50 via-[#f09060]/25 to-[#f09060]/50"
                aria-hidden
              />

              <ol className="space-y-8 sm:space-y-10">
                {state.steps.map((step, index) => (
                  <li key={step.id} className="relative">
                    <div
                      className="absolute -left-8 sm:-left-10 top-1.5 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-[#f09060] bg-[#07182e] z-10"
                      aria-hidden
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-[#f09060]" />
                    </div>

                    <div className="rounded-lg border border-[#f09060]/15 bg-[#0e2744]/40 px-4 py-3 sm:py-4">
                      <div className="flex flex-wrap items-start gap-2">
                        <button
                          type="button"
                          onClick={() => setTitleModal({ stepId: step.id, draft: step.title })}
                          className="font-playfair text-left text-lg sm:text-xl text-[#f6f0e6] italic font-semibold leading-snug hover:text-[#f09060] transition-colors"
                        >
                          {step.title}
                        </button>
                        <span className="font-cinzel text-[10px] tracking-widest text-[#f09060]/70 mt-1.5">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </div>

                      {step.title === WELCOME_PROGRAM_TITLE && (
                        <Link
                          to="/#countdown"
                          className="inline-flex items-center gap-1.5 mt-2 font-garamond text-sm text-[#f09060] underline underline-offset-4 decoration-[#f09060]/50 hover:text-[#f6f0e6] hover:decoration-[#f09060] transition-colors"
                        >
                          View grand-entry countdown on invitation
                          <span aria-hidden>→</span>
                        </Link>
                      )}

                      {step.note.trim() ? (
                        <p className="font-garamond text-sm sm:text-base text-[#f0d2b0] leading-relaxed mt-2 whitespace-pre-wrap">
                          {step.note}
                        </p>
                      ) : null}

                      {step.trackIds.length > 0 && (
                        <ul className="font-garamond text-xs text-[#f09060]/90 mt-2 space-y-0.5">
                          {step.trackIds.map((trackId, trackIndex) => (
                            <li key={trackId} className="flex items-center gap-1.5 min-w-0">
                              <span aria-hidden>♪</span>
                              <span className="truncate">
                                {tracks.find((t) => t.id === trackId)?.fileName ?? `Track ${trackIndex + 1}`}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}

                      {step.videoId && (
                        <p className="font-garamond text-xs text-[#f0d2b0]/90 mt-2 flex items-center gap-1.5">
                          <span aria-hidden>▶</span>
                          <span className="truncate">
                            {videos.find((v) => v.id === step.videoId)?.fileName ?? "Video cue"}
                          </span>
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <GhostButton onClick={() => setNoteModal({ stepId: step.id, title: step.title, draft: step.note })}>
                          {step.note.trim() ? "Edit note" : "Add note"}
                        </GhostButton>
                        <GhostButton onClick={() => setMusicModal({ stepId: step.id, title: step.title })}>
                          Music
                        </GhostButton>
                        <GhostButton onClick={() => setVideoModal({ stepId: step.id, title: step.title })}>
                          Video
                        </GhostButton>
                        {step.trackIds.length > 0 && (
                          <GhostButton onClick={() => playSegmentPlaylist(step)}>
                            {step.trackIds.length > 1 ? "Play playlist" : "Play audio"}
                          </GhostButton>
                        )}
                        {step.videoId && (
                          <GhostButton onClick={() => void playVideo(step.videoId!, step.title)}>Play video</GhostButton>
                        )}
                        <span className="w-px h-6 bg-[#f09060]/20 mx-0.5 hidden sm:block" />
                        <IconButton label="Move up" disabled={index === 0} onClick={() => persist({ steps: moveStep(state.steps, index, -1) })}>↑</IconButton>
                        <IconButton label="Move down" disabled={index === state.steps.length - 1} onClick={() => persist({ steps: moveStep(state.steps, index, 1) })}>↓</IconButton>
                        <IconButton
                          label="Remove segment"
                          onClick={() => {
                            if (window.confirm("Remove this program segment?")) persist({ steps: removeStep(state.steps, step.id) });
                          }}
                        >
                          ×
                        </IconButton>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* Right: DJ pad + library */}
          <aside className="space-y-5 lg:sticky lg:top-8">
            <DjSoundPad />

          <div className="rounded-xl border border-[#f09060]/25 bg-[#0e2744]/70 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-cinzel text-xs tracking-wider uppercase text-[#f09060]">MP3 library</h2>
              <label className="font-cinzel text-[10px] tracking-wider uppercase cursor-pointer px-3 py-1.5 rounded-full bg-[#f09060] text-[#06101c] hover:brightness-110">
                Upload
                <input
                  type="file"
                  accept="audio/mpeg,audio/mp3,audio/*,.mp3"
                  multiple
                  className="sr-only"
                  onChange={(event) => void uploadFiles(event.target.files)}
                />
              </label>
            </div>
            {tracks.length === 0 ? (
              <p className="font-garamond text-sm text-[#f0d2b0] mt-4">Upload MP3s, then assign them from Music on each segment.</p>
            ) : (
              <ul className="mt-4 space-y-2 max-h-[min(60vh,28rem)] overflow-y-auto pr-1">
                {tracks.map((track) => (
                  <li
                    key={track.id}
                    className="flex items-center gap-2 rounded-lg border border-[#f09060]/20 bg-[#06101c]/50 px-2 py-2"
                  >
                    <span className="font-garamond text-xs text-[#f6f0e6] flex-1 min-w-0 truncate">{track.fileName}</span>
                    <button
                      type="button"
                      onClick={() => void playTrack(track.id, track.fileName)}
                      className="shrink-0 font-cinzel text-[9px] tracking-wider uppercase text-[#f09060] px-2 py-0.5"
                    >
                      Play
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDeleteTrack(track.id)}
                      className="shrink-0 font-cinzel text-[9px] tracking-wider uppercase text-[#f0d2b0]/70"
                    >
                      Del
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-[#f09060]/25 bg-[#0e2744]/70 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-cinzel text-xs tracking-wider uppercase text-[#f09060]">Video library</h2>
              <label className="font-cinzel text-[10px] tracking-wider uppercase cursor-pointer px-3 py-1.5 rounded-full bg-[#f09060] text-[#06101c] hover:brightness-110">
                Upload
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm,.m4v"
                  multiple
                  className="sr-only"
                  onChange={(event) => void uploadVideos(event.target.files)}
                />
              </label>
            </div>
            <p className="font-garamond text-[11px] text-[#f0d2b0]/80 mt-2">MP4 or WebM · stored on this device only</p>
            {videos.length === 0 ? (
              <p className="font-garamond text-sm text-[#f0d2b0] mt-4">Upload clips, then assign them from Video on each segment.</p>
            ) : (
              <ul className="mt-4 space-y-2 max-h-[min(40vh,20rem)] overflow-y-auto pr-1">
                {videos.map((video) => (
                  <li
                    key={video.id}
                    className="flex items-center gap-2 rounded-lg border border-[#f09060]/20 bg-[#06101c]/50 px-2 py-2"
                  >
                    <span className="font-garamond text-xs text-[#f6f0e6] flex-1 min-w-0 truncate">{video.fileName}</span>
                    <button
                      type="button"
                      onClick={() => void playVideo(video.id, video.fileName)}
                      className="shrink-0 font-cinzel text-[9px] tracking-wider uppercase text-[#f09060] px-2 py-0.5"
                    >
                      Play
                    </button>
                    <button
                      type="button"
                      onClick={() => void onDeleteVideo(video.id)}
                      className="shrink-0 font-cinzel text-[9px] tracking-wider uppercase text-[#f0d2b0]/70"
                    >
                      Del
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          </aside>
        </div>

        {loadError && (
          <p className="mt-6 font-garamond text-sm text-[#f09060] border border-[#f09060]/30 rounded-lg px-4 py-3">{loadError}</p>
        )}

        <Link to="/" className="inline-block mt-10 font-cinzel text-xs tracking-wider uppercase text-[#f09060]/90 hover:text-[#f09060]">
          ← Back to invitation
        </Link>
      </div>

      {noteModal && (
        <Modal
          title={noteModal.title}
          subtitle={noteModal.draft.trim() ? "Edit note" : "Add note"}
          onClose={() => setNoteModal(null)}
          footer={
            <>
              <ModalButton variant="ghost" onClick={() => setNoteModal(null)}>Cancel</ModalButton>
              <ModalButton onClick={saveNote}>Save note</ModalButton>
            </>
          }
        >
          <textarea
            autoFocus
            value={noteModal.draft}
            rows={5}
            placeholder="Cues, speakers, costume changes…"
            onChange={(event) => setNoteModal({ ...noteModal, draft: event.target.value })}
            className="w-full rounded-md border border-[#f09060]/35 bg-[#06101c] px-3 py-2 font-garamond text-sm text-[#f0d2b0] resize-y min-h-[7rem] focus:outline-none focus:border-[#f09060]/70"
          />
        </Modal>
      )}

      {titleModal && (
        <Modal
          title="Segment title"
          subtitle="Shown on the timeline and invitation"
          onClose={() => setTitleModal(null)}
          footer={
            <>
              <ModalButton variant="ghost" onClick={() => setTitleModal(null)}>Cancel</ModalButton>
              <ModalButton onClick={saveTitle}>Save</ModalButton>
            </>
          }
        >
          <input
            autoFocus
            value={titleModal.draft}
            onChange={(event) => setTitleModal({ ...titleModal, draft: event.target.value })}
            className="w-full rounded-md border border-[#f09060]/35 bg-[#06101c] px-3 py-2 font-playfair text-lg text-[#f6f0e6] focus:outline-none focus:border-[#f09060]/70"
          />
        </Modal>
      )}

      {musicModal && musicStep && (
        <Modal
          title={musicModal.title}
          subtitle="Playlist for this segment (plays in order)"
          onClose={() => {
            setMusicModal(null);
            setMusicPickId("");
          }}
          footer={<ModalButton variant="ghost" onClick={() => setMusicModal(null)}>Done</ModalButton>}
        >
          <div className="space-y-4">
            {musicStep.trackIds.length === 0 ? (
              <p className="font-garamond text-sm text-[#f0d2b0]">No tracks yet. Add MP3s below—for Dinner you can stack several songs.</p>
            ) : (
              <ol className="space-y-2">
                {musicStep.trackIds.map((trackId, index) => {
                  const name = tracks.find((t) => t.id === trackId)?.fileName ?? "Missing track";
                  return (
                    <li
                      key={trackId}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-[#f09060]/25 bg-[#06101c]/50 px-2 py-2"
                    >
                      <span className="font-cinzel text-[9px] text-[#f09060] w-5">{index + 1}</span>
                      <span className="font-garamond text-sm text-[#f6f0e6] flex-1 min-w-0 truncate">{name}</span>
                      <button
                        type="button"
                        onClick={() => void playTrack(trackId, musicStep.title)}
                        className="font-cinzel text-[9px] uppercase text-[#f09060]"
                      >
                        Play
                      </button>
                      <IconButton
                        label="Move up"
                        disabled={index === 0}
                        onClick={() =>
                          updateStep(musicStep.id, moveStepTrackIds(musicStep, index, -1))
                        }
                      >
                        ↑
                      </IconButton>
                      <IconButton
                        label="Move down"
                        disabled={index === musicStep.trackIds.length - 1}
                        onClick={() =>
                          updateStep(musicStep.id, moveStepTrackIds(musicStep, index, 1))
                        }
                      >
                        ↓
                      </IconButton>
                      <button
                        type="button"
                        aria-label="Remove track"
                        onClick={() => removeTrackFromStep(musicStep.id, trackId)}
                        className="font-cinzel text-[9px] text-[#f0d2b0]/80 px-1"
                      >
                        ×
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}

            <div className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[10rem]">
                <label className="font-garamond text-xs text-[#f0d2b0] block mb-1">Add from library</label>
                <select
                  value={musicPickId}
                  onChange={(event) => setMusicPickId(event.target.value)}
                  className="w-full rounded-md border border-[#f09060]/35 bg-[#06101c] px-3 py-2 font-garamond text-sm text-[#f6f0e6]"
                >
                  <option value="">— Pick MP3 —</option>
                  {tracks.map((track) => (
                    <option key={track.id} value={track.id} disabled={musicStep.trackIds.includes(track.id)}>
                      {track.fileName}
                    </option>
                  ))}
                </select>
              </div>
              <ModalButton onClick={() => addTrackToStep(musicStep.id, musicPickId)}>Add</ModalButton>
            </div>

            <label className="font-cinzel text-[10px] tracking-wider uppercase cursor-pointer inline-block px-3 py-2 rounded-full border border-[#f09060]/45 text-[#f09060]">
              Upload MP3 (adds to playlist)
              <input
                type="file"
                accept="audio/mpeg,audio/mp3,audio/*,.mp3"
                multiple
                className="sr-only"
                onChange={(event) => {
                  void uploadFiles(event.target.files, musicStep.id);
                  event.target.value = "";
                }}
              />
            </label>

            {musicStep.trackIds.length > 0 && (
              <button
                type="button"
                onClick={() => playSegmentPlaylist(musicStep)}
                className="font-cinzel text-[10px] tracking-wider uppercase text-[#f09060] underline underline-offset-4"
              >
                Preview full playlist
              </button>
            )}
          </div>
        </Modal>
      )}

      {videoModal && videoStep && (
        <Modal
          title={videoModal.title}
          subtitle="Video cue for this segment"
          onClose={() => setVideoModal(null)}
          footer={<ModalButton variant="ghost" onClick={() => setVideoModal(null)}>Done</ModalButton>}
        >
          <div className="space-y-3">
            <label className="font-garamond text-xs text-[#f0d2b0] block">Choose from library</label>
            <select
              value={videoStep.videoId ?? ""}
              onChange={(event) => updateStep(videoStep.id, { videoId: event.target.value || null })}
              className="w-full rounded-md border border-[#f09060]/35 bg-[#06101c] px-3 py-2 font-garamond text-sm text-[#f6f0e6]"
            >
              <option value="">— No video —</option>
              {videos.map((video) => (
                <option key={video.id} value={video.id}>
                  {video.fileName}
                </option>
              ))}
            </select>
            <label className="font-cinzel text-[10px] tracking-wider uppercase cursor-pointer inline-block px-3 py-2 rounded-full border border-[#f09060]/45 text-[#f09060]">
              Upload video for this segment
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime,.mp4,.mov,.webm,.m4v"
                className="sr-only"
                onChange={(event) => {
                  void uploadVideos(event.target.files, videoStep.id);
                  event.target.value = "";
                }}
              />
            </label>
            {videoStep.videoId && (
              <button
                type="button"
                onClick={() => void playVideo(videoStep.videoId!, videoStep.title)}
                className="font-cinzel text-[10px] tracking-wider uppercase text-[#f09060] underline underline-offset-4"
              >
                Preview video
              </button>
            )}
          </div>
        </Modal>
      )}

      {activeVideo && (
        <VideoPlayerModal
          title={activeVideo.label}
          fileName={activeVideo.fileName}
          url={activeVideo.url}
          onClose={closeVideoPlayer}
        />
      )}

      <div className="fixed bottom-0 inset-x-0 border-t border-[#f09060]/30 bg-[#07182e]/95 backdrop-blur-md px-4 py-3">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!nowPlaying}
            onClick={togglePlayPause}
            className="font-cinzel text-xs tracking-wider uppercase w-10 h-10 rounded-full bg-[#f09060] text-[#06101c] disabled:opacity-40"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? "❚❚" : "▶"}
          </button>
          <div className="min-w-0 flex-1">
            <p className="font-playfair text-sm text-[#f6f0e6] truncate">{nowPlaying?.label ?? "Nothing playing"}</p>
            <p className="font-garamond text-xs text-[#f0d2b0] truncate">{nowPlaying?.fileName ?? "Play from timeline or library"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function GhostButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-cinzel text-[9px] sm:text-[10px] tracking-wider uppercase px-2.5 py-1 rounded-full border border-[#f09060]/35 text-[#f0d2b0] hover:border-[#f09060]/60 hover:text-[#f6f0e6] transition-colors"
    >
      {children}
    </button>
  );
}

function IconButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="w-7 h-7 rounded-md border border-[#f09060]/30 text-[#f0d2b0] text-sm disabled:opacity-30 hover:bg-[#f09060]/10"
    >
      {children}
    </button>
  );
}

function Modal({
  title,
  subtitle,
  children,
  footer,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-[#020810]/80" aria-label="Close dialog" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl border border-[#f09060]/30 bg-[#0e2744] shadow-2xl p-5 sm:p-6">
        <p className="font-playfair text-xl text-[#f6f0e6] leading-snug">{title}</p>
        {subtitle && <p className="font-cinzel text-[10px] tracking-wider uppercase text-[#f09060] mt-1">{subtitle}</p>}
        <div className="mt-4">{children}</div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div>
      </div>
    </div>
  );
}

function VideoPlayerModal({
  title,
  fileName,
  url,
  onClose,
}: {
  title: string;
  fileName: string;
  url: string;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    void video.play().catch(() => {});
  }, [url]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-8" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-[#020810]/90" aria-label="Close video" onClick={onClose} />
      <div className="relative w-full max-w-4xl">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <p className="font-playfair text-lg text-[#f6f0e6] truncate">{title}</p>
            <p className="font-garamond text-xs text-[#f0d2b0] truncate">{fileName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="font-cinzel text-[10px] tracking-wider uppercase px-3 py-1.5 rounded-full border border-[#f09060]/50 text-[#f0d2b0]"
          >
            Close
          </button>
        </div>
        <video
          ref={videoRef}
          src={url}
          controls
          playsInline
          className="w-full max-h-[min(75vh,720px)] rounded-lg bg-black shadow-2xl"
        />
      </div>
    </div>
  );
}

function ModalButton({
  children,
  onClick,
  variant = "primary",
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: "primary" | "ghost";
}) {
  const className =
    variant === "primary"
      ? "font-cinzel text-[10px] tracking-wider uppercase px-4 py-2 rounded-full bg-[#f09060] text-[#06101c]"
      : "font-cinzel text-[10px] tracking-wider uppercase px-4 py-2 rounded-full border border-[#f09060]/40 text-[#f0d2b0]";
  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}
