Event program media (deployed with the site — same files on every browser)

1. Copy MP3s and MP4s into THIS folder (not src/program/) — only files here are served on Netlify, e.g.:
   public/assets/program/dinner-01.mp3
   public/assets/program/highlight.mp4

2. Edit manifest.json:
   - tracks: each needs id (must start with "site:"), fileName, path
   - videos: same pattern
   - stepTracks: optional map of segment title -> list of track ids
   - stepVideo: optional map of segment title -> one video id

Example track entry:
  { "id": "site:dinner-01", "fileName": "Dinner mood.mp3", "path": "/assets/program/dinner-01.mp3" }

3. git add, commit, push — Netlify deploy publishes files for production.

Device-only uploads on /program still work but stay in that browser only.
