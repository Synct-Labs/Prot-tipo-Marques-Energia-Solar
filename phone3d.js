/* Celular 3D da página inicial: balança sozinho, inclina com o mouse e gira ao arrastar. */
(function () {
  var stage = document.querySelector(".phone-mockup");
  if (!stage) return;
  var body = stage.querySelector(".phone-body");
  if (!body) return;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ry = -20, rx = 6, tRy = -20, tRx = 6;
  var hover = false, drag = false, lastX = 0, lastY = 0, t0 = performance.now();

  function render() {
    body.style.transform = "rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg) rotateZ(3deg)";
    stage.style.setProperty("--sheen", (50 - ry * 1.6).toFixed(1) + "%");
  }
  if (reduce) { render(); return; }

  function norm(a) { a = a % 360; if (a > 180) a -= 360; if (a < -180) a += 360; return a; }

  function tick(now) {
    if (!drag) {
      if (!hover) { tRy = Math.sin((now - t0) / 1800) * 26; tRx = 6 + Math.sin((now - t0) / 2600) * 3; }
      ry = norm(ry); // volta pelo caminho mais curto depois de um giro
      ry += (tRy - ry) * 0.08; rx += (tRx - rx) * 0.08;
    }
    render();
    requestAnimationFrame(tick);
  }

  stage.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") hover = true; });
  stage.addEventListener("pointerleave", function () { hover = false; });
  stage.addEventListener("pointerdown", function (e) {
    drag = true; lastX = e.clientX; lastY = e.clientY;
    stage.classList.add("is-dragging");
    try { stage.setPointerCapture(e.pointerId); } catch (_) {}
  });
  stage.addEventListener("pointermove", function (e) {
    if (drag) {
      ry += (e.clientX - lastX) * 0.6;
      rx = Math.max(-35, Math.min(35, rx - (e.clientY - lastY) * 0.3));
      lastX = e.clientX; lastY = e.clientY;
    } else if (hover) {
      var r = stage.getBoundingClientRect();
      tRy = ((e.clientX - r.left) / r.width - 0.5) * 70;
      tRx = 6 - ((e.clientY - r.top) / r.height - 0.5) * 30;
    }
  });
  function end() { drag = false; stage.classList.remove("is-dragging"); tRx = 6; if (!hover) tRy = -20; }
  stage.addEventListener("pointerup", end);
  stage.addEventListener("pointercancel", end);
  // arrasto não deve disparar o link do botão dentro da tela
  stage.addEventListener("click", function (e) { if (e.target.closest("a") && Math.abs(norm(ry)) > 40) e.preventDefault(); });

  requestAnimationFrame(tick);
})();
