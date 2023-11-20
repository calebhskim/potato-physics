import { run } from "./physics.js";

import "./style.css";

document.addEventListener("DOMContentLoaded", function () {
  const initialGraph = document.getElementById("initial-graph-textarea").value;
  const rule = document.getElementById("initial-rule-textarea").value;
  const depth = parseInt(document.getElementById("initial-depth-input").value);

  const runButton = document.getElementById("run-button");

  runButton.addEventListener("click", function () {
    try {
      const newGraph = document.getElementById("initial-graph-textarea").value;
      const newRule = document.getElementById("initial-rule-textarea").value;
      const newDepth = parseInt(document.getElementById("initial-depth-input").value);

      run(newGraph, newRule, newDepth);
    }
    catch (e) {
      alert("There was an error drawing the graph. Probably a bug:" + e);
    }
  });

  run(initialGraph, rule, depth);
});