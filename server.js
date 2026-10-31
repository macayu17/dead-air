import http from "node:http";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { MODEL, modelState, transmit } from "./model.js";

const files = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/style.css", ["style.css", "text/css; charset=utf-8"]],
  ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
  ["/favicon.svg", ["favicon.svg", "image/svg+xml"]],
]);

export function validateInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Send a place, a detail, and a mood.");
  const { place, detail, mood } = input;
  if (typeof place !== "string" || !place.trim() || place.length > 100)
    throw new Error("Choose a place between 1 and 100 characters.");
  if (typeof detail !== "string" || !detail.trim() || detail.length > 300)
    throw new Error("Leave a detail between 1 and 300 characters.");
  if (!["unsettling", "melancholy", "strange"].includes(mood))
    throw new Error("Choose one of the three station moods.");
  return { place: place.trim(), detail: detail.trim(), mood };
}

export function createRadioServer(generate = transmit, state = modelState) {
  let busy = false;
  return http.createServer(async (req, res) => {
    const host = req.headers.host;
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    );
    const json = (status, data) => {
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
      });
      res.end(JSON.stringify(data));
    };
    if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host ?? ""))
      return json(403, { error: "This receiver is local only." });
    if (req.headers.origin && req.headers.origin !== `http://${host}`)
      return json(403, { error: "Use the radio from its local page." });
    let path;
    try {
      path = new URL(req.url, `http://${host}`).pathname;
    } catch {
      return json(400, { error: "Invalid receiver address." });
    }
    if (req.method === "GET" && path === "/api/status")
      return json(200, { ...state, busy, model: MODEL });
    if (req.method === "POST" && path === "/api/transmit") {
      if (!req.headers["content-type"]?.startsWith("application/json"))
        return json(415, { error: "Send JSON to the receiver." });
      if (busy)
        return json(409, {
          error: "A transmission is already coming through. Please wait.",
        });
      let input;
      try {
        const chunks = [];
        let bytes = 0;
        for await (const chunk of req) {
          bytes += chunk.length;
          if (bytes > 4096)
            return json(413, { error: "The listener note is too long." });
          chunks.push(chunk);
        }
        input = validateInput(
          JSON.parse(Buffer.concat(chunks).toString("utf8")),
        );
      } catch (error) {
        return json(400, {
          error:
            error instanceof SyntaxError
              ? "The listener note must be valid JSON."
              : error.message,
        });
      }
      // Recheck after reading the body: another request may have claimed the model.
      if (busy)
        return json(409, {
          error: "A transmission is already coming through. Please wait.",
        });
      busy = true;
      const started = performance.now();
      try {
        const text = await generate(input);
        json(200, {
          text,
          model: MODEL,
          seconds: Number(((performance.now() - started) / 1000).toFixed(1)),
          receivedAt: new Date().toISOString(),
          ...input,
        });
      } catch (error) {
        console.error("Transmission failed:", error.message);
        json(503, {
          error:
            "The receiver could not reach the model. Check the terminal and your connection if this is the first download, then try again.",
        });
      } finally {
        busy = false;
      }
      return;
    }
    const file = files.get(path);
    if (req.method !== "GET" || !file)
      return json(404, { error: "Nothing broadcasting here." });
    try {
      const data = await readFile(
        new URL(`./public/${file[0]}`, import.meta.url),
      );
      res.writeHead(200, { "Content-Type": file[1] });
      res.end(data);
    } catch {
      json(500, { error: "The receiver files could not be read." });
    }
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const port = Number(process.env.PORT || 8808);
  const server = createRadioServer();
  server.requestTimeout = 300_000;
  server.on("error", (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  server.listen(port, "127.0.0.1", () =>
    console.log(`Dead Air is listening at http://127.0.0.1:${port}`),
  );
}
