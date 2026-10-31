import { test } from "node:test";
import assert from "node:assert/strict";
import { get } from "node:http";
import { createRadioServer, validateInput } from "../server.js";
import { messagesFor } from "../model.js";

const note = {
  place: " a railway station ",
  detail: " my voice on the tannoy ",
  mood: "unsettling",
};

test("listener notes are bounded, trimmed, and restricted to known moods", () => {
  assert.equal(validateInput(note).place, "a railway station");
  for (const input of [
    null,
    [],
    {},
    { ...note, place: " " },
    { ...note, detail: 3 },
    { ...note, place: "x".repeat(101) },
    { ...note, detail: "x".repeat(301) },
    { ...note, mood: "execute" },
  ]) {
    assert.throws(() => validateInput(input));
  }
  assert.doesNotThrow(() =>
    validateInput({ ...note, place: "x".repeat(100), detail: "x".repeat(300) }),
  );
  const messages = messagesFor(validateInput(note));
  assert.equal(messages[0].role, "system");
  assert.match(messages.at(-1).content, /railway station/);
  assert.match(messages.at(-1).content, /my voice on the tannoy/);
});

async function receiver(t, generate) {
  const server = createRadioServer(generate, { status: "ready" });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}`;
  const send = (body, headers = {}) =>
    fetch(`${url}/api/transmit`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body,
    });
  return { url, send };
}

test("HTTP validation, same-origin boundary, static allowlist, and successful generation", async (t) => {
  let calls = 0;
  const { url, send } = await receiver(t, async (input) => {
    calls++;
    assert.equal(input.detail, "my voice on the tannoy");
    return "<script>fiction</script>";
  });
  assert.equal((await send("{")).status, 400);
  assert.equal(
    (await send(JSON.stringify({ ...note, place: "" }))).status,
    400,
  );
  assert.equal(
    (await send(JSON.stringify(note), { Origin: "https://example.com" }))
      .status,
    403,
  );
  assert.equal(
    (
      await send(JSON.stringify(note), {
        Origin: url.replace("http:", "https:"),
      })
    ).status,
    403,
  );
  assert.equal(
    (await send(JSON.stringify(note), { "Content-Type": "text/plain" })).status,
    415,
  );
  assert.equal((await send("x".repeat(4097))).status, 413);
  assert.equal((await fetch(`${url}/package.json`)).status, 404);
  assert.equal((await fetch(`${url}/.cache/models/model.onnx`)).status, 404);
  assert.equal(
    await new Promise((resolve, reject) => {
      get(url, { headers: { Host: "evil.example" } }, (response) => {
        response.resume();
        resolve(response.statusCode);
      }).on("error", reject);
    }),
    403,
  );
  const page = await fetch(url);
  assert.match(
    page.headers.get("content-security-policy"),
    /frame-ancestors 'none'/,
  );
  assert.match(await page.text(), /Dead Air/);
  const result = await send(JSON.stringify(note));
  assert.equal(result.status, 200);
  assert.equal((await result.json()).text, "<script>fiction</script>");
  assert.equal(calls, 1);
});

test("one generation at a time, and busy state clears after model failures", async (t) => {
  let release;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  let started;
  const began = new Promise((resolve) => {
    started = resolve;
  });
  let calls = 0;
  const { url, send } = await receiver(t, async () => {
    calls++;
    if (calls === 1) {
      started();
      await pending;
      throw new Error("test model failure");
    }
    return "The station answers.";
  });
  const first = send(JSON.stringify(note));
  await began;
  assert.equal((await send(JSON.stringify(note))).status, 409);
  assert.equal((await (await fetch(`${url}/api/status`)).json()).busy, true);
  release();
  assert.equal((await first).status, 503);
  assert.equal((await (await fetch(`${url}/api/status`)).json()).busy, false);
  assert.equal((await send(JSON.stringify(note))).status, 200);
});
