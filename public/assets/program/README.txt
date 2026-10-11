Event program media (static — same on every browser after deploy)

1. Put MP3s and MP4s in this folder, e.g.:
   public/assets/program/dinner-01.mp3

2. Edit manifest.json:
   - tracks: id (must start with "site:"), fileName, path
   - stepTracks: segment title -> list of track ids (optional defaults)
   - stepVideo: segment title -> one video id

3. git commit and push — Netlify serves these files.

Timeline edits (titles, notes, add/remove segments) sync via /api/program when the admin PIN is set on /admin.
