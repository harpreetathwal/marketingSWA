(function () {
  "use strict";

  const button = document.querySelector(".menu-button");
  const nav = document.querySelector("#site-nav");
  if (!button || !nav) return;

  function closeMenu() {
    nav.classList.remove("is-open");
    button.setAttribute("aria-expanded", "false");
  }

  closeMenu();
  window.addEventListener("pageshow", closeMenu);
  window.addEventListener("pagehide", closeMenu);

  button.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    button.setAttribute("aria-expanded", String(open));
  });

  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
})();
