/* =====================================================================
   PRÉVIA DO APP "CONTA DIGITAL MARQUES" (conta-digital-app.html)
   ---------------------------------------------------------------------
   Protótipo visual, 100% estático: sem backend, sem dados reais, sem
   persistência. Só troca de telas (data-goto) e um toggle de mostrar/
   esconder saldo, pra dar a sensação de app de verdade.
   ===================================================================== */
function $(sel, root=document){ return root.querySelector(sel); }
function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

const ICON_EYE = `<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
const ICON_EYE_OFF = `<svg class="icon icon-sm" viewBox="0 0 24 24"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 4.22-5.94M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 8 11 8a20.3 20.3 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
const BALANCE_TEXT = "R$ 4.285,90";

/* ---------------------- NAVEGAÇÃO ENTRE TELAS DO APP ---------------------- */
function goToView(name){
  $all(".app-view").forEach(v => v.classList.toggle("active", v.dataset.view === name));
  $all(".app-nav-btn").forEach(b => b.classList.toggle("active", b.dataset.goto === name));
  $("#phoneScreen").scrollTo({ top: 0, behavior: "auto" });
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-goto]");
  if(btn) goToView(btn.dataset.goto);
});

/* ---------------------- MOSTRAR/ESCONDER SALDO ---------------------- */
let balanceVisible = true;
$("#balanceEyeBtn")?.addEventListener("click", () => {
  balanceVisible = !balanceVisible;
  $("#balanceValue").textContent = balanceVisible ? BALANCE_TEXT : "R$ ••••••";
  $("#balanceEyeBtn").innerHTML = balanceVisible ? ICON_EYE : ICON_EYE_OFF;
});
