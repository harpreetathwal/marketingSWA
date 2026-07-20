(function () {
  "use strict";

  function clientMetadata() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    return {
      pagePath: window.location.pathname,
      localSubmittedAt: new Date().toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      timezoneOffsetMinutes: new Date().getTimezoneOffset(),
      language: navigator.language || "",
      platform: navigator.userAgentData?.platform || navigator.platform || "",
      connectionType: connection?.effectiveType || "",
      screenWidth: window.screen?.width,
      screenHeight: window.screen?.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      colorDepth: window.screen?.colorDepth,
      pixelRatio: window.devicePixelRatio,
      touchPoints: navigator.maxTouchPoints
    };
  }

  function setFieldErrors(form, errors = {}) {
    form.querySelectorAll("[aria-invalid='true']").forEach((field) => {
      field.removeAttribute("aria-invalid");
      field.removeAttribute("title");
    });

    for (const [name, message] of Object.entries(errors)) {
      const field = form.elements.namedItem(name);
      if (!field || typeof field.setAttribute !== "function") continue;
      field.setAttribute("aria-invalid", "true");
      field.setAttribute("title", message);
    }
  }

  document.querySelectorAll("[data-inquiry-form]").forEach((form) => {
    const status = form.querySelector("[data-form-status]");
    const submitButton = form.querySelector("button[type='submit']");
    const originalLabel = submitButton.textContent;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setFieldErrors(form);
      status.className = "form-status";
      status.textContent = "Securely sending your inquiry…";
      submitButton.disabled = true;
      submitButton.textContent = "Sending…";

      const payload = Object.fromEntries(new FormData(form).entries());
      payload.clientMetadata = clientMetadata();

      try {
        const response = await fetch("/api/inquiries", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          setFieldErrors(form, result.errors);
          throw new Error(result.message || "Your inquiry could not be sent.");
        }

        form.reset();
        status.classList.add("is-success");
        status.textContent = `Received. Your reference is ${result.submissionId}. Save this number for follow-up.`;
      } catch (error) {
        status.classList.add("is-error");
        status.textContent = error.message || "Your inquiry could not be sent. Please try again.";
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalLabel;
      }
    });
  });
})();
