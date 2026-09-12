/* =====================================================================
   MARQUES PAY — PRÉVIA DO PAINEL (DESKTOP)
   Protótipo estático: troca de painel só no front-end, sem dados reais.
   ===================================================================== */
function goToPayPanel(panel) {
  document.querySelectorAll(".pay-panel").forEach(el => el.classList.remove("active"));
  const target = document.querySelector(`.pay-panel[data-panel="${panel}"]`);
  if (target) target.classList.add("active");

  document.querySelectorAll(".pay-nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.goto === panel);
  });

  document.querySelector(".pay-main").scrollTo({ top: 0, behavior: "auto" });
  window.scrollTo({ top: 0, behavior: "auto" });
}

document.addEventListener("click", (e) => {
  const trigger = e.target.closest("[data-goto]");
  if (!trigger) return;
  e.preventDefault();
  goToPayPanel(trigger.dataset.goto);
});

document.querySelectorAll(".pay-toggle").forEach(toggle => {
  toggle.addEventListener("click", () => toggle.classList.toggle("is-on"));
});
