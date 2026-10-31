# Verification — October 31, 2026

Local checks on Windows with Node 22.22.3, Python 3.13.5, and Python Playwright 1.64.1 using installed Chrome. The app runs with `npm start` at **http://127.0.0.1:8808**. No separate build step exists.

## Results

| Check | Observation |
| --- | --- |
| Clean install | `npm ci --ignore-scripts --prefer-offline --no-audit --no-fund` installed 42 packages successfully. Native CPU inference worked with those installed files. Install-time scripts were not exercised. |
| HTTP and prompt tests | `npm test`: 3 test groups passed, 0 failed. Covers input bounds and types, malformed JSON, oversized bodies, content type, host and origin boundaries (including a different scheme), static-file allowlisting, model exclusivity, and failure recovery. |
| Dependency audit | `npm audit --omit=dev --json`: 0 reported vulnerabilities. This is an advisory check, not a complete security audit. |
| Browser flow | `python scripts/browser-check.py`: all recorded checks passed; 0 page JavaScript errors. Real model inference, example prompts and mood selection, busy state, download contents, keyboard skip link, mobile layout, whitespace validation, and recovery from an injected HTTP 503. |
| Responsive layout | No horizontal overflow at viewport widths 320, 390, 768, 1024, and 1440 pixels. |
| Offline inference | Fresh process, `OFFLINE=1`, and `env.fetch` replaced with a function that throws on any network attempt. SmolLM2-1.7B generated a house remembrance in 28.3 seconds, including loading cached weights; network attempts: **0**. |
| Recorded request | Railway station prompt, actual local model, 27.7 seconds including cached-weight loading. Text and metadata saved to `artifacts/browser-result.json`. |
| Demo | Real browser recording, no cuts or speed changes. `docs/demo.mp4`: 54.04 seconds, H.264, 1440 × 1100, silent, about 955 KB. The static demo page loaded and parsed the video in Chrome 156. A frame from the encoded MP4 was inspected. |
| Published submission | The DEV article returned HTTP 200 in a fresh Chrome context without login. All five required headings, both challenge tags, repository and demo URLs, and AI-use disclosure were verified. Evidence: `artifacts/submission-result.json`. |

The tests intentionally log one simulated model failure to verify that a later request can succeed. It is expected test output.

## Model choice and integrity

The 360M model was quick for short responses but often lost the requested detail. The final app uses **HuggingFaceTB/SmolLM2-1.7B-Instruct**, q4, CPU. A short example in the prompt improved the radio-message style in the local experiments. These were qualitative checks, not a formal model benchmark. Output varies between requests.

The downloaded q4 file is 1,411,969,607 bytes. Its SHA-256 matched the Hugging Face model repository's LFS metadata:

```text
Model repository revision at download: 31b70e2e869a7173562077fd711b654946d38674
SHA-256: 467b7b8f62d99f184d3628d24b8d65c151e331695f6e9ea997616c4e279e9a51
```

The application loads the repository's default revision into its normal Transformers.js cache. It does not promise that future upstream model files will have the same hash. The current cached weights were verified. Large downloads on this machine required ranged requests; the native runtime tarball also matched npm's published SHA-512 integrity value.

## Evidence files

Screenshots are from the real app at http://127.0.0.1:8808, not generated images:

- `artifacts/desktop.png`: initial state, viewport 1440 × 1100, full page.
- `artifacts/desktop-transmission.png`: real received transmission, same viewport, full page.
- `artifacts/cover.png`: real received transmission, same viewport, viewport capture.
- `artifacts/mobile.png`: initial state, viewport 390 × 844, full page.
- `artifacts/browser-result.json`: checks, browser request URLs, and actual transmission metadata.
- `artifacts/sample-transmission.txt`: the text file saved through the UI.
- `artifacts/offline-result.json`: independent offline generation result.
- `docs/demo.mp4`: portable recording for publication; original capture is `artifacts/demo.webm`.

The browser made requests only to the local receiver. The separate backend offline check is what verifies network-free generation; a browser request log alone cannot establish that.

## Repeat the browser check

Start the app, then run the following in a second terminal. These Python tools are for verification and are not application dependencies:

```powershell
python -m pip install playwright
python -m playwright install ffmpeg
python scripts/browser-check.py
```

Chrome must be installed. Re-running this script records a new demo and overwrites the browser evidence. If replacing the publication MP4, encode the new `artifacts/demo.webm` and update any quoted timings or output to match.

## Submission state

The user authorized public publication on October 31, 2026. The repository is public at https://github.com/macayu17/dead-air. The recorded demo is hosted at https://macayu17.github.io/dead-air/; its page and video playback were verified in a fresh Chrome context without login. The entry was published at https://dev.to/macayu17/dead-air-a-ghost-station-running-on-my-own-cpu-k0n before the deadline. Its required sections, challenge tags, code and demo links, and anonymous accessibility were verified. DEV displays the Fully Autonomous AI disclosure for this agent-written article.

Interactive inference was not deployed to a public server. GitHub Pages builds host the recorded demo; no remote application test suite, automated content-moderation service, cross-platform runtime check, or formal accessibility audit was performed. The interface uses labels, keyboard focus, a skip link, live status, reduced-motion support, and mobile touch targets; those features were checked locally. The model can still produce poor or unsuitable fiction.
