(function () {
  "use strict";

  document.querySelectorAll("[data-carousel]").forEach((carousel) => {
    const track = carousel.querySelector(".video-track");
    const previous = carousel.querySelector("[data-carousel-previous]");
    const next = carousel.querySelector("[data-carousel-next]");
    if (!track || !previous || !next) return;

    function updateButtons() {
      const maxScroll = track.scrollWidth - track.clientWidth;
      previous.disabled = track.scrollLeft <= 2;
      next.disabled = track.scrollLeft >= maxScroll - 2;
    }

    function move(direction) {
      track.scrollBy({ left: direction * track.clientWidth, behavior: "smooth" });
    }

    previous.addEventListener("click", () => move(-1));
    next.addEventListener("click", () => move(1));
    track.addEventListener("scroll", updateButtons, { passive: true });
    window.addEventListener("resize", updateButtons);
    updateButtons();
  });
})();
