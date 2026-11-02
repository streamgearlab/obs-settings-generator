# OBS Settings Generator

Get recommended OBS output settings (bitrate, resolution, FPS, keyframe interval, encoder preset, audio) for Twitch, YouTube or Kick from your upload speed, encoder and CPU.

**Live tool:** https://streamgearlab.com/tools/obs-settings-generator/

## Features

- Platforms: Twitch, YouTube and Kick, using each platform's published ingest limits
- Encoders: NVIDIA NVENC, AMD AMF, Intel QuickSync, Apple VideoToolbox and x264 (CPU)
- Picks the highest safe resolution/FPS tier for your upload speed, with headroom
- Content-aware: fast-paced games, other games, just chatting or creative streams
- Optional YouTube AV1/HEVC mode
- Shows every setting with where to find it in OBS, plus a one-click "Copy as text" summary
- No tracking, no build step, works offline

## Usage

No install and no build step. It's plain HTML, CSS and JavaScript.

- **Online:** use the live tool at https://streamgearlab.com/tools/obs-settings-generator/ or the GitHub Pages demo at https://streamgearlab.github.io/obs-settings-generator/
- **Locally:** download or clone this repo and open `index.html` in your browser (it works straight from `file://`).

```sh
git clone https://github.com/streamgearlab/obs-settings-generator.git
cd obs-settings-generator
open index.html   # macOS; use xdg-open on Linux or just double-click it on Windows
```

You can prefill the form from the URL with these parameters: `p` (twitch, youtube, kick), `up` (upload Mbps), `enc`, `cpu`, `canvas`, `target`, `content`, `av1`. Example: `index.html?p=youtube&up=25&enc=nvenc`

## Files

- `index.html`: page and form
- `app.js`: tool logic
- `stream-rules.js`: platform limits and bitrate tiers shared with the site
- `style.css`: styles

## License

[MIT](LICENSE) © StreamGearLab

---

Made by [StreamGearLab](https://streamgearlab.com): free, no-nonsense tools and guides for streamers.
