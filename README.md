# WebVLC

WebVLC is a modern, web-based media player inspired by the versatility of VLC. It runs entirely in your browser, allowing you to play local audio and video files without uploading them to any server.

[**Live Demo**](https://webvlc.addy.ie)

![Image](https://github.com/user-attachments/assets/4823dce7-1ec0-4d0a-9360-cff222c2bfaa)

## ✨ Features

- **Local Playback**: Play video and audio files directly from your computer. Supports MP4, MKV, WebM, MP3, FLAC, OGG, WAV, and more.
- **Playlist Management**:
  - Drag and drop files or folders to create playlists.
  - Support for `.m3u` and `.pls` playlist files.
  - Reorder tracks with drag and drop.
  - Shuffle and Loop modes (Repeat One, Repeat All).
- **Subtitle Support**: Load subtitles in `.srt`, `.vtt`, `.ass`, `.ssa`, and `.sub` formats.
- **Advanced Controls**:
  - Variable playback speed (0.25x - 4x).
  - Keyboard shortcuts for power users.
  - Fullscreen toggle.
- **Privacy First**: No files are ever uploaded. Everything stays on your device.

## ⌨️ Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `Space` / `k` | Play / Pause |
| `f` / `F` | Toggle Fullscreen |
| `m` / `M` | Toggle Mute |
| `↑` / `↓` | Volume Up / Down (5%) |
| `←` / `→` | Seek -10s / +10s |
| `Shift` + `←` / `→` | Seek -3s / +3s |
| `n` / `N` | Next Track |
| `p` / `P` | Previous Track |
| `l` / `L` | Toggle Loop Mode |
| `s` / `S` | Toggle Shuffle |
| `[` / `]` | Decrease / Increase Playback Speed |
| `=` | Reset Playback Speed to 1x |
| `Home` / `End` | Seek to Start / End |
| `0` - `9` | Seek to 0% - 90% |

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm, yarn, or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/addyosmani/webvlc.git
   cd webvlc
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`.

## 🛠️ Built With

- [React](https://react.dev/) - UI Library
- [Vite](https://vitejs.dev/) - Build Tool
- [ESLint](https://eslint.org/) - Linting

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. This project is not officially affiliated with the VideoLAN project or VLC media player. All trademarks and copyrights belong to their respective owners.
