// js/dom.js
import { state } from "./state.js";

export function render() {
  const app = document.getElementById("app");

  app.innerHTML = `
    <section>
      <h1>${state.message}</h1>
      <p>Count: ${state.count}</p>
      <button id="inc">Increment</button>
    </section>
  `;

  document.getElementById("inc").addEventListener("click", () => {
    state.count += 1;
    render();
  });
}
