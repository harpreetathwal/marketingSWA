(function () {
  "use strict";

  const state = { items: [], filter: "all", query: "" };
  const gallery = document.querySelector("#gallery");
  const count = document.querySelector("#visible-count");
  const empty = document.querySelector("#empty-state");
  const viewer = document.querySelector("#viewer");
  const stage = document.querySelector("#viewer-stage");
  let config = {};

  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[char]);

  const titleFromFile = (file) => file.replace(/\.[^.]+$/, "").replace(/_/g, " · ");
  const formatBytes = (bytes) => {
    if (!bytes) return "";
    const units = ["B", "KB", "MB", "GB"];
    const place = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, place)).toFixed(place > 1 ? 1 : 0)} ${units[place]}`;
  };
  const mediaUrl = (item, field = "file") => {
    const value = item[field];
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    const base = String(config.blobBaseUrl || "").replace(/\/$/, "");
    const path = `${item.source}/${value}`.split("/").map(encodeURIComponent).join("/");
    const sas = config.sasToken ? `?${String(config.sasToken).replace(/^\?/, "")}` : "";
    return `${base}/${path}${sas}`;
  };

  function matches(item) {
    const typeMatch = state.filter === "all" || item.source === state.filter || item.type === state.filter;
    const words = `${item.title || ""} ${item.file} ${item.source}`.toLowerCase();
    return typeMatch && words.includes(state.query);
  }

  function card(item, index) {
    const title = item.title || titleFromFile(item.file);
    const sizePattern = ["small", "tall", "wide", "medium", "small", "large", "wide", "small", "medium", "tall", "small", "wide"];
    const tiltPattern = ["tilt-left", "tilt-none", "tilt-right", "tilt-soft-left", "tilt-none", "tilt-soft-right"];
    const sizeClass = item.type === "video" ? `size-${sizePattern[index % sizePattern.length]}` : "size-small work-photo";
    const tiltClass = tiltPattern[index % tiltPattern.length];
    const preview = item.type === "image"
      ? `<img class="work-image" src="${escapeHtml(mediaUrl(item))}" alt="${escapeHtml(title)}" loading="lazy" decoding="async">`
      : item.thumbnail
        ? `<img class="work-image" src="${escapeHtml(mediaUrl(item, "thumbnail"))}" alt="" loading="lazy" decoding="async">`
        : `<video class="work-preview" muted playsinline preload="metadata" data-preview-src="${escapeHtml(mediaUrl(item))}#t=0.1" aria-hidden="true"></video><div class="video-placeholder" aria-hidden="true"></div>`;

    return `<article class="work ${sizeClass} ${tiltClass}" data-work-id="${escapeHtml(item.id)}">
      <div class="work-visual">
        <button class="media-trigger" type="button" data-id="${escapeHtml(item.id)}" aria-label="${item.type === "video" ? "Play" : "Open"} ${escapeHtml(title)}">
          ${preview}<span class="work-type">${item.type === "video" ? "Film" : "Photo"}</span>
          ${item.type === "video" ? '<span class="play-badge" aria-hidden="true"></span>' : ""}
        </button>
      </div>
      <div class="work-info"><span class="work-number">${String(index + 1).padStart(2, "0")}</span><h3 class="work-title">${escapeHtml(title)}</h3><span class="work-source">${escapeHtml(item.source)}</span></div>
    </article>`;
  }

  function render() {
    pauseAllVideos();
    const shown = state.items.filter(matches);
    gallery.innerHTML = shown.map(card).join("");
    count.textContent = String(shown.length);
    empty.hidden = shown.length > 0;
    observeVideoPreviews();
  }

  function renderAmbientImages() {
    const collection = document.querySelector(".collection");
    const images = state.items.filter((item) => item.type === "image");
    const positions = [
      [3, 2, 25, -8, 2], [72, 7, 22, 7, 4], [8, 22, 19, 5, 3],
      [77, 31, 27, -6, 2], [1, 46, 24, 9, 5], [69, 57, 26, 5, 3],
      [9, 69, 21, -7, 2], [75, 79, 20, 8, 4], [3, 91, 28, -5, 3]
    ];
    const existing = collection.querySelector(".ambient-gallery");
    if (existing) existing.remove();
    if (images.length === 0) return;

    const layer = document.createElement("div");
    layer.className = "ambient-gallery";
    layer.setAttribute("aria-hidden", "true");
    layer.innerHTML = images.slice(0, positions.length).map((item, index) => {
      const [x, y, width, rotation, blur] = positions[index];
      return `<img class="ambient-image" src="${escapeHtml(mediaUrl(item))}" alt="" loading="lazy" decoding="async" style="--ambient-x:${x}%;--ambient-y:${y}%;--ambient-width:${width}vw;--ambient-rotation:${rotation}deg;--ambient-blur:${blur}px">`;
    }).join("");
    collection.prepend(layer);
  }

  function observeVideoPreviews() {
    const previews = gallery.querySelectorAll("video[data-preview-src]");
    if (!config.videoPreviewFrames || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const video = entry.target;
        video.src = video.dataset.previewSrc;
        video.addEventListener("loadeddata", () => video.classList.add("is-ready"), { once: true });
        currentObserver.unobserve(video);
      });
    }, { rootMargin: "250px 0px" });
    previews.forEach((video) => observer.observe(video));
  }

  function pauseAllVideos(except) {
    gallery.querySelectorAll("video.inline-player").forEach((video) => {
      if (video !== except) video.pause();
    });
  }

  function playInline(item, work) {
    pauseAllVideos();
    const frame = work.querySelector(".work-visual");
    const video = document.createElement("video");
    video.className = "inline-player";
    video.src = mediaUrl(item);
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.preload = "metadata";
    if (item.thumbnail) video.poster = mediaUrl(item, "thumbnail");
    video.addEventListener("play", () => pauseAllVideos(video));
    frame.replaceChildren(video);
    video.play().catch(() => {});
  }

  function openViewer(item) {
    const title = item.title || titleFromFile(item.file);
    const position = state.items.indexOf(item) + 1;
    document.querySelector("#viewer-title").textContent = title;
    document.querySelector("#viewer-number").textContent = String(position).padStart(2, "0");
    document.querySelector("#viewer-source").textContent = item.source;
    document.querySelector("#viewer-details").textContent = [item.date, formatBytes(item.bytes)].filter(Boolean).join(" · ");
    const image = document.createElement("img");
    image.src = mediaUrl(item);
    image.alt = title;
    stage.replaceChildren(image);
    viewer.showModal();
    document.body.classList.add("viewer-open");
  }

  function closeViewer() {
    const video = stage.querySelector("video");
    if (video) { video.pause(); video.removeAttribute("src"); video.load(); }
    viewer.close();
    stage.replaceChildren();
    document.body.classList.remove("viewer-open");
  }

  async function loadCatalog() {
    if (config.catalogMode !== "blob") {
      const response = await fetch("content.json");
      if (!response.ok) throw new Error("The catalog could not be loaded.");
      return (await response.json()).items || [];
    }

    const base = String(config.blobBaseUrl || "").replace(/\/$/, "");
    const token = String(config.sasToken || "").replace(/^\?/, "");
    const query = ["restype=container", "comp=list", token].filter(Boolean).join("&");
    const response = await fetch(`${base}?${query}`);
    if (!response.ok) throw new Error("Azure Blob listing could not be loaded. Check CORS and List permission.");
    const xml = new DOMParser().parseFromString(await response.text(), "application/xml");
    if (xml.querySelector("parsererror")) throw new Error("Azure returned an invalid catalog response.");
    const folders = (config.includeFolders || []).map((folder) => `${String(folder).replace(/^\/+|\/+$/g, "")}/`);
    return Array.from(xml.querySelectorAll("Blob")).map((blob) => {
      const path = blob.querySelector("Name")?.textContent || "";
      const split = path.indexOf("/");
      const source = split > -1 ? path.slice(0, split) : "archive";
      const file = split > -1 ? path.slice(split + 1) : path;
      const contentType = blob.querySelector("Content-Type")?.textContent || "";
      const type = contentType.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/i.test(file) ? "image" : "video";
      return {
        id: `blob-${path}`,
        file,
        type,
        source,
        date: blob.querySelector("Last-Modified")?.textContent || "",
        bytes: Number(blob.querySelector("Content-Length")?.textContent || 0),
        _path: path
      };
    }).filter((item) => {
      const allowedFolder = folders.length === 0 || folders.some((folder) => item._path.startsWith(folder));
      return allowedFolder && /\.(mp4|jpe?g|png|webp|gif)$/i.test(item.file);
    });
  }

  async function init() {
    try {
      const configResponse = await fetch("config.json");
      if (!configResponse.ok) throw new Error("The site configuration could not be loaded.");
      config = await configResponse.json();
      state.items = await loadCatalog();
      renderAmbientImages();
      render();
      if (!config.blobBaseUrl || config.blobBaseUrl.includes("YOUR_ACCOUNT")) {
        showError("Setup needed: replace blobBaseUrl in config.json with your Azure container URL.");
      }
    } catch (error) {
      showError(`${error.message} Serve this folder through a web server instead of opening index.html directly.`);
    }
  }

  function showError(message) {
    const toast = document.querySelector("#load-error");
    toast.textContent = message;
    toast.hidden = false;
  }

  gallery.addEventListener("click", (event) => {
    const button = event.target.closest("[data-id]");
    if (!button) return;
    const item = state.items.find((entry) => entry.id === button.dataset.id);
    if (!item) return;
    if (item.type === "video") playInline(item, button.closest(".work"));
    else openViewer(item);
  });
  document.querySelectorAll(".filter").forEach((button) => button.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach((entry) => { entry.classList.remove("is-active"); entry.setAttribute("aria-pressed", "false"); });
    button.classList.add("is-active");
    button.setAttribute("aria-pressed", "true");
    state.filter = button.dataset.filter;
    render();
  }));
  document.querySelector("#search").addEventListener("input", (event) => { state.query = event.target.value.trim().toLowerCase(); render(); });
  document.querySelector("#reset-filters").addEventListener("click", () => { document.querySelector('[data-filter="all"]').click(); document.querySelector("#search").value = ""; state.query = ""; render(); });
  document.querySelector("#close-viewer").addEventListener("click", closeViewer);
  viewer.addEventListener("click", (event) => { if (event.target === viewer) closeViewer(); });
  viewer.addEventListener("cancel", (event) => { event.preventDefault(); closeViewer(); });
  document.querySelector(".menu-button").addEventListener("click", (event) => {
    const nav = document.querySelector("#museum-nav");
    const open = nav.classList.toggle("is-open");
    event.currentTarget.setAttribute("aria-expanded", String(open));
  });
  document.querySelectorAll("#museum-nav a").forEach((link) => link.addEventListener("click", () => document.querySelector("#museum-nav").classList.remove("is-open")));
  document.querySelector("#year").textContent = String(new Date().getFullYear());
  init();
})();
