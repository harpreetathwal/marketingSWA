(function () {
  "use strict";

  const calendarSection = document.querySelector("#calendar-section");
  if (!calendarSection) return;

  function loadCalendar(event) {
    if (calendarSection.dataset.calendarLoaded) return;
    calendarSection.dataset.calendarLoaded = "true";
    const submittedName = typeof event?.detail?.name === "string" ? event.detail.name.trim() : "";
    const submittedCompany = typeof event?.detail?.company === "string" ? event.detail.company.trim() : "";
    const bookingName = [submittedCompany, submittedName].filter(Boolean).join(" - ");
    const submittedEmail = typeof event?.detail?.email === "string" ? event.detail.email.trim() : "";

    // Cal inline embed code begins
    (function (C, A, L) {
      let p = function (a, ar) { a.q.push(ar); };
      let d = C.document;
      C.Cal = C.Cal || function () {
        let cal = C.Cal;
        let ar = arguments;
        if (!cal.loaded) {
          cal.ns = {};
          cal.q = cal.q || [];
          d.head.appendChild(d.createElement("script")).src = A;
          cal.loaded = true;
        }
        if (ar[0] === L) {
          const api = function () { p(api, arguments); };
          const namespace = ar[1];
          api.q = api.q || [];
          if (typeof namespace === "string") {
            cal.ns[namespace] = cal.ns[namespace] || api;
            p(cal.ns[namespace], ar);
            p(cal, ["initNamespace", namespace]);
          } else p(cal, ar);
          return;
        }
        p(cal, ar);
      };
    })(window, "https://app.cal.com/embed/embed.js", "init");

    window.Cal("init", "30min", { origin: "https://app.cal.com" });
    window.Cal.config = window.Cal.config || {};
    window.Cal.config.forwardQueryParams = true;
    window.Cal.ns["30min"]("inline", {
      elementOrSelector: "#my-cal-inline-30min",
      config: { layout: "month_view", useSlotsViewOnSmallScreen: "true", name: bookingName, email: submittedEmail },
      calLink: "harpreet-athwal-qgx7fs/30min"
    });
    window.Cal.ns["30min"]("ui", { hideEventTypeDetails: false, layout: "month_view" });
    // Cal inline embed code ends
  }

  calendarSection.addEventListener("inquiry:success", loadCalendar, { once: true });
}());
