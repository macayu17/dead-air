import { loadModel, MODEL, transmit } from "../model.js";

console.log(`Loading ${MODEL} (q4, CPU). The first run downloads the weights.`);
await loadModel();
if (process.argv.includes("--sample")) {
  const start = performance.now();
  const text = await transmit({
    place: "an abandoned railway station",
    detail: "the next train is announced in my own voice",
    mood: "unsettling",
  });
  console.log(text);
  console.log(
    `Generation: ${((performance.now() - start) / 1000).toFixed(1)}s`,
  );
} else {
  console.log("Model cached. Start the radio with npm start.");
}
