# Dead Air

Build a fictional shortwave station for Hacktoberfest Week 4. A visitor supplies a place and an unsettling detail; a local open-weight language model writes a brief transmission. Nothing is executed from the generated text. No analytics, accounts, remote inference, or persistent storage of prompts.

Use Node's HTTP server, vanilla HTML/CSS/JavaScript, and Transformers.js with HuggingFaceTB/SmolLM2-1.7B-Instruct. Download the quantized ONNX model once, then use the cache offline. Bind to loopback. Treat supplied text as untrusted and render it with textContent. Allow one generation at a time and cap inputs and output tokens.

Scope: model loading and inference, validated HTTP endpoints, responsive radio UI, saved transmission export, three sample starting points, tests, browser evidence, demo video, README, attribution, license, DEV draft, and submission checklist.

Tracer: download the model and generate one real transmission before committing to the rest of the interface.

Verification: npm test; real inference; desktop and mobile browser checks; keyboard and export checks; record a real browser demo. Document exact observations. No fabricated success, testimonials, or partner-category claims.

Public actions: the user authorized repository creation, commits and push, demo hosting, and DEV publication on October 31, 2026. Publish under macayu17/dead-air, serve the recorded demo through GitHub Pages, verify anonymous access, and publish the DEV post with the required tags. Keep local model weights and dependencies out of Git.

Completed: repository and demo published; DEV submission published at https://dev.to/macayu17/dead-air-a-ghost-station-running-on-my-own-cpu-k0n. Anonymous post access, required headings, tags, and links were verified.
