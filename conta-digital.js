/* =====================================================================
   MARQUES ENERGIA SOLAR: PÁGINA "CONTA DIGITAL" (conta-digital.html)
   ---------------------------------------------------------------------
   Página de pré-lançamento (lista de espera). Não tem formulário nem
   integração com backend: só reveal no scroll, FAQ e menu mobile.
   ===================================================================== */
function $(sel, root=document){ return root.querySelector(sel); }
function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

const ICON_MENU = `<svg class="icon" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`;
const ICON_X = `<svg class="icon" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

/* ---------------------- SCROLL REVEAL ---------------------- */
let revealObserver;
function initScrollReveal(){
  if(!revealObserver){
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          entry.target.classList.add("in-view");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  }
  $all(".reveal:not(.in-view)").forEach(el => revealObserver.observe(el));
}
initScrollReveal();

/* ---------------------- FAQ (accordion) ---------------------- */
const faqList = $("#faqList");
if(faqList){
  faqList.addEventListener("click", (e) => {
    const btn = e.target.closest(".faq-question");
    if(!btn) return;
    const item = btn.closest(".faq-item");
    const answer = item.querySelector(".faq-answer");
    const isOpen = item.classList.contains("open");

    $all(".faq-item.open", faqList).forEach(other => {
      if(other !== item){
        other.classList.remove("open");
        other.querySelector(".faq-answer").style.maxHeight = null;
      }
    });

    item.classList.toggle("open", !isOpen);
    answer.style.maxHeight = !isOpen ? answer.scrollHeight + "px" : null;
  });
}

/* ---------------------- MENU MOBILE ---------------------- */
function closeMobileMenu(){
  $("#mainNav").classList.remove("open");
  const icon = $("#hamburgerIcon");
  if(icon) icon.outerHTML = ICON_MENU.replace('class="icon"', 'class="icon" id="hamburgerIcon"');
}
$("#hamburgerBtn")?.addEventListener("click", () => {
  const nav = $("#mainNav");
  const isOpen = nav.classList.toggle("open");
  $("#hamburgerIcon").outerHTML = (isOpen ? ICON_X : ICON_MENU).replace('class="icon"', 'class="icon" id="hamburgerIcon"');
});
$("#mainNav")?.addEventListener("click", (e) => {
  if(e.target.closest("a")) closeMobileMenu();
});
