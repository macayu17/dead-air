const $ = (id) => document.getElementById(id);
const form = $("radio-form");
const tune = $("tune");
const status = $("status");
const error = $("error");
const examples = {
  station: [
    "an abandoned railway station",
    "The next train is announced in my own voice.",
    "unsettling",
  ],
  house: [
    "the house where I grew up",
    "Someone has set the table for a person we lost years ago.",
    "melancholy",
  ],
  sea: [
    "a lighthouse with no keeper",
    "The foghorn answers a question I haven’t asked yet.",
    "strange",
  ],
};
let lastTransmission;
let count = 0;
let inFlight = false;

document.querySelectorAll("[data-example]").forEach((button) => {
  button.addEventListener("click", () => {
    const [place, detail, mood] = examples[button.dataset.example];
    $("place").value = place;
    $("detail").value = detail;
    form.elements.mood.value = mood;
    $("place").focus();
  });
});

async function checkReceiver() {
  try {
    const response = await fetch("/api/status");
    if (!response.ok) return;
    const state = await response.json();
    $("power-light").classList.toggle("on", state.status === "ready");
    if (!inFlight) return;
    if (state.status === "loading") {
      status.textContent = `Loading the local model${state.file ? ` · ${state.file} · ${state.progress}%` : ""}. First download needs internet.`;
    } else if (state.status === "ready") {
      status.textContent =
        "The model is listening. Generating on your CPU; this can take a little while.";
    }
  } catch {
    if (inFlight) status.textContent = "Waiting for the local receiver…";
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (inFlight) return;
  const input = Object.fromEntries(new FormData(form));
  if (!input.place.trim() || !input.detail.trim()) {
    error.textContent = "Leave both a place and a strange detail to tune in.";
    error.hidden = false;
    return;
  }
  inFlight = true;
  error.hidden = true;
  tune.disabled = true;
  $("tune-label").textContent = "Finding a signal…";
  $("display").setAttribute("aria-busy", "true");
  document.querySelector(".radio").classList.add("tuning");
  $("signal").textContent = "◌ TUNING";
  status.textContent =
    "Waking the receiver. Loading the model may take a few minutes on the first run.";
  const polling = setInterval(checkReceiver, 1200);
  checkReceiver();
  try {
    const response = await fetch("/api/transmit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "The signal was lost. Try again.");
    lastTransmission = data;
    count++;
    const paragraph = document.createElement("p");
    paragraph.className = "story";
    paragraph.textContent = data.text;
    $("transmission").replaceChildren(paragraph);
    $("channel").textContent =
      `NO. ${String(count).padStart(3, "0")} / TRANSMISSION RECEIVED`;
    $("signal").textContent = "● SIGNAL FOUND";
    $("receipt").textContent =
      `${new Date(data.receivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${data.seconds}s · LOCAL INFERENCE`;
    $("save").hidden = false;
    $("needle").style.left = `${18 + ((count * 17) % 65)}%`;
    status.textContent = `Received from ${data.place}. Tune again for another version, or save this one. Nothing is saved automatically.`;
  } catch (failure) {
    error.textContent = failure.message;
    error.hidden = false;
    $("signal").textContent = "○ SIGNAL LOST";
    status.textContent =
      "Your listener note is still here. Check the receiver and try again.";
  } finally {
    clearInterval(polling);
    inFlight = false;
    tune.disabled = false;
    $("tune-label").textContent = "Tune in again";
    $("display").setAttribute("aria-busy", "false");
    document.querySelector(".radio").classList.remove("tuning");
    checkReceiver();
  }
});

$("save").addEventListener("click", () => {
  if (!lastTransmission) return;
  const { place, detail, mood, text, model, receivedAt } = lastTransmission;
  const contents = `DEAD AIR / FICTIONAL TRANSMISSION\n\nPlace: ${place}\nListener note: ${detail}\nMood: ${mood}\nReceived: ${receivedAt}\nModel: ${model} (q4, local CPU)\n\n${text}\n\nAll transmissions are invented.\n`;
  const url = URL.createObjectURL(
    new Blob([contents], { type: "text/plain;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `dead-air-${receivedAt.replaceAll(":", "-")}.txt`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

checkReceiver();
