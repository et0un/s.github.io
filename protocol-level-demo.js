(() => {
  const slider = document.getElementById("demo-level");
  if (!slider) return;
  const value = document.getElementById("demo-value");
  const projection = document.getElementById("demo-projection");
  const message = document.getElementById("demo-json");

  function update() {
    const level = Number(slider.value);
    value.textContent = level.toFixed(2);
    projection.style.opacity = String(level);
    message.textContent = JSON.stringify({ type: "level", value: level });
  }

  slider.addEventListener("input", update);
  update();
})();
