# video_stream

Small example project demonstrating an Express file-upload server that converts uploaded videos to HLS (m3u8 + .ts segments) using ffmpeg, and a React + Vite frontend that plays the generated HLS stream with video.js.

This README covers what the project contains, how it works, how to run it locally, and important production/security notes.

---

## Project structure (relevant files)

- `index.js` — Express server: accepts uploads, saves files under `uploads/`, runs `ffmpeg` to produce HLS output in `uploads/courses/lesson-<id>/index.m3u8`, and serves `uploads/` as static.
- `package.json` — root package.json for the server (start script uses `nodemon`).
- `uploads/` — storage directory (sample mp4 files and any generated HLS playlists/segments).
- `frontend/` — React + Vite app (video.js-based player). Start the frontend with `npm run dev` inside this folder.
  - `frontend/src/VideoPlayer.jsx` — Video.js React wrapper.
  - `frontend/src/App.jsx` — Example that points to a local HLS URL.


## How it works (high level)

1. Client uploads a video to `POST /upload` (multipart form, field name `file`).
2. Server uses `multer` to store the uploaded file in `uploads/`.
3. Server runs an `ffmpeg` command (via `child_process.exec`) to transcode/segment the video into HLS format (`index.m3u8` + `segmentXXX.ts`) under `uploads/courses/lesson-<uuid>/`.
4. When ffmpeg finishes, the server responds with JSON containing `lessonId` and the public `videoUrl` (e.g. `http://localhost:8000/uploads/courses/<lessonId>/index.m3u8`).
5. The frontend (video.js) loads the HLS playlist URL and plays the segmented stream.


## Requirements

- Node.js (v16+ recommended)
- ffmpeg installed on the machine and available in PATH
- (Optional) Yarn or npm

Install ffmpeg on Debian/Ubuntu:

    sudo apt update && sudo apt install -y ffmpeg


## Local development — server

1. Install server deps (from project root):

    npm install

2. Start the server (defaults to port 8000):

    npm run start

The server will:
- serve static files from `/uploads` (so generated playlists and .ts files are reachable)
- accept uploads at `POST /upload`

CORS is configured to allow `http://localhost:8000` and `http://localhost:5173` by default.


## Local development — frontend

1. Change into the frontend folder and install deps:

    cd frontend
    npm install

2. Start Vite dev server:

    npm run dev

Open the Vite app (usually at `http://localhost:5173`). The sample App points to an HLS URL at `http://localhost:8000/uploads/courses/<id>/index.m3u8` — update that string or use the upload flow to generate a new lesson and replace the id.


## API

- GET /
  - Returns a small JSON message.

- POST /upload
  - Expects: multipart/form-data with a single file field named `file`.
  - Behavior: server stores the file with `multer`, generates a unique lesson id, creates `uploads/courses/lesson-<id>/` and runs ffmpeg to produce HLS (`index.m3u8` + `segmentNNN.ts`).
  - Response (success):
    ```json
    {
      "message": "Video uploaded and processed successfully",
      "lessonId": "<uuid>",
      "videoUrl": "http://localhost:8000/uploads/courses/<uuid>/index.m3u8"
    }
    ```

Notes:
- The server runs `ffmpeg` with an example command in `index.js`. ffmpeg can be slow — the current implementation runs ffmpeg synchronously via `exec` and replies when it finishes.
- The `ffmpeg` command used in the project (see `index.js`) produces HLS segments of 10s and a VOD playlist.


## Sample files

The repository includes a few sample mp4 files in `uploads/` which you can use to test the ffmpeg flow (or to play directly). There are also example generated HLS files under `uploads/courses/` used by the frontend earlier during development.


## Troubleshooting

- If uploads work but the player shows errors:
  - Verify the playlist URL is reachable in the browser (open the `.m3u8` URL directly).
  - Make sure the `.ts` segment files are present in the same folder as the `.m3u8` and the paths inside the `.m3u8` are correct.
- If `ffmpeg` fails:
  - Confirm ffmpeg is installed and available on PATH (`ffmpeg -version`).
  - Inspect server logs — stderr from ffmpeg is printed to console.
- If CORS issues occur, adjust the origin list in `index.js` or set `Access-Control-Allow-Origin` appropriately.


## Production & security notes

- Running arbitrary shell commands with `exec` is dangerous. The current example uses `child_process.exec` directly with interpolated paths. Do not use this in production without strict validation and escaping of inputs.
- ffmpeg is CPU- and I/O-intensive. In production, run video processing jobs in a separate worker or queue (e.g. Bull, Sidekiq, or an external transcoding service).
- Validate uploaded file types and sizes with `multer` filters to prevent abuse.
- Store uploads in durable object storage (S3, GCS) rather than local disk if you plan to scale.
- Implement authentication/authorization for upload endpoints in real apps.


## Improvements / TODOs

- Move ffmpeg invocation to a background job/queue and return a 202 with a processing status endpoint.
- Validate mime type and set file size limits in multer.
- Add TLS, authentication, and rate limiting.
- Serve HLS via CDN for production streaming performance.


## Contributing

Small project template. Contributions welcome — open a PR with improvements or fixes.


## License

MIT (add a LICENSE file if needed)
