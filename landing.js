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
  let subtitlesStarted = false;

  const subtitleGroups = [
    {
      element: document.querySelector("#ad-subtitle"),
      items: [
        "Make Me Unforgettable",
        "Make My Competitors Nervous",
        "Let's Make Magic",
        "Let's Make Something Viral",
        "Get More Customers",
        "Give Me an Ad Series",
        "This Is Exactly What I Need",
        "Let's Make My Competitors Sweat",
        "Let's Become Unskippable",
        "Make My Brand the Main Character"
      ]
    },
    {
      element: document.querySelector("#internship-subtitle"),
      items: [
        "I Want to Learn Video Editing",
        "I Want to Learn VFX",
        "I Want to Learn Ad Copy",
        "I Want to Get Paid"
      ]
    }
  ];

  if (!splash || !landing || !video) return;

  function startSubtitleRotations() {
    if (subtitlesStarted) return;
    subtitlesStarted = true;

    subtitleGroups.forEach(({ element, items }, groupIndex) => {
      if (!element || items.length === 0) return;
      let currentIndex = Math.floor(Math.random() * items.length);
      element.textContent = items[currentIndex];

      if (reducedMotion) return;
      window.setInterval(() => {
        let nextIndex = currentIndex;
        while (nextIndex === currentIndex) nextIndex = Math.floor(Math.random() * items.length);
        currentIndex = nextIndex;
        element.classList.add("is-changing");
        window.setTimeout(() => {
          element.textContent = items[currentIndex];
          element.classList.remove("is-changing");
        }, 180);
      }, 3200 + (groupIndex * 350));
    });
  }

  function enterSite() {
    if (hasEntered) return;
    hasEntered = true;
    window.clearTimeout(revealTimer);
    window.clearTimeout(loadGuard);
    video.pause();
    splash.classList.add("is-exiting");
    landing.setAttribute("aria-hidden", "false");
    landing.classList.add("is-ready");
    startSubtitleRotations();
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
