(function () {
  "use strict";

  const splash = document.querySelector("#splash");
  const video = document.querySelector("#splash-video");
  const skipButton = document.querySelector("#skip-video");
  const landing = document.querySelector("#landing");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let revealTimer;
  let loadGuard;
  let hasEntered = false;

  document.querySelectorAll("[data-year]").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });

  if (!splash || !landing || !video) return;

  function enterSite() {
    if (hasEntered) return;
    hasEntered = true;
    window.clearTimeout(revealTimer);
    window.clearTimeout(loadGuard);
    video.pause();
    splash.classList.add("is-exiting");
    landing.setAttribute("aria-hidden", "false");
    landing.classList.add("is-ready");
    document.documentElement.classList.remove("splash-active");
    window.setTimeout(() => {
      splash.hidden = true;
    }, reducedMotion ? 0 : 850);
  }

  function startCountdown() {
    if (hasEntered || splash.classList.contains("is-playing")) return;
    splash.classList.add("is-playing");
    window.clearTimeout(loadGuard);
    revealTimer = window.setTimeout(enterSite, 12000);
  }

  splash.addEventListener("click", enterSite, { once: true });
  skipButton.addEventListener("click", enterSite);
  document.addEventListener("keydown", (event) => {
    if (!hasEntered && ["Enter", " ", "Escape"].includes(event.key)) enterSite();
  });

  window.setTimeout(() => skipButton.classList.add("is-visible"), 3000);

  if (reducedMotion) {
    enterSite();
    return;
  }

  video.addEventListener("playing", startCountdown, { once: true });
  video.addEventListener("error", enterSite, { once: true });
  loadGuard = window.setTimeout(enterSite, 7000);

  const playback = video.play();
  if (playback && typeof playback.then === "function") {
    playback.then(startCountdown).catch(() => {
      /* The click-to-enter behavior remains available when autoplay is blocked. */
    });
  } else if (!video.paused) {
    startCountdown();
  }
})();
