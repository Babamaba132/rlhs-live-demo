/* ============================================================
   thanks.js — Thank-you page logic
   Loads config, shows appropriate heading, embeds Calendly
   ============================================================ */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", async function () {
    var config = await window.RoofingForm.resolveConfig();

    if (!config) {
      document.getElementById("loader").hidden = true;
      document.getElementById("thanks-app").hidden = false;
      return;
    }

    // Brand colors
    if (config.brandColor) {
      document.documentElement.style.setProperty("--brand-color", config.brandColor);
      document.documentElement.style.setProperty(
        "--brand-color-dark",
        shade(config.brandColor, -0.18)
      );
    }

    // Brand header
    var logo = document.getElementById("brand-logo");
    if (config.logoUrl) {
      logo.src = config.logoUrl;
      logo.alt = config.businessName || "";
      logo.hidden = false;
    }
    document.getElementById("brand-name").textContent =
      config.businessName || "Roofing Quote";

    // Page title
    document.title = (config.businessName || "Thank You") + " — Request Received";

    // Phone in header
    var phoneEl = document.getElementById("brand-phone");
    if (config.phone) {
      phoneEl.textContent = config.phone;
      phoneEl.href = "tel:" + config.phone.replace(/[^0-9+]/g, "");
    } else {
      phoneEl.hidden = true;
    }

    // Check ?skipped=1
    var params = new URLSearchParams(window.location.search);
    var skipped = params.get("skipped") === "1";

    // Heading + subheading
    var thankYou = config.thankYouPage || {};
    var heading = document.getElementById("thanks-heading");
    var subheading = document.getElementById("thanks-subheading");

    if (skipped) {
      heading.textContent = "Got it \u2014 let's get you on the calendar";
      subheading.textContent =
        "We've received your request. Book a convenient time below or we'll reach out shortly.";
    } else {
      heading.textContent =
        thankYou.heading || "Thanks \u2014 we received your request!";
      subheading.textContent =
        thankYou.subheading ||
        "Book a time below or we'll reach out within 2 hours.";
    }

    // Phone CTA
    var phoneCta = document.getElementById("phone-cta");
    if (config.phone) {
      phoneCta.innerHTML =
        'Or call us at <a href="tel:' +
        config.phone.replace(/[^0-9+]/g, "") +
        '"><strong>' +
        escapeHtml(config.phone) +
        "</strong></a>";
    } else {
      phoneCta.hidden = true;
    }

    // Calendly embed
    var calendlyContainer = document.getElementById("calendly-container");
    var showCalendly =
      thankYou.showCalendly !== false && config.bookingLink;

    if (showCalendly) {
      var widget = document.createElement("div");
      widget.className = "calendly-inline-widget";
      widget.dataset.url = config.bookingLink;
      widget.style.minWidth = "320px";
      widget.style.height = "700px";
      calendlyContainer.appendChild(widget);

      var script = document.createElement("script");
      script.src = "https://assets.calendly.com/assets/external/widget.js";
      script.async = true;
      document.body.appendChild(script);
    } else {
      // No Calendly — show big call button
      if (config.phone) {
        calendlyContainer.innerHTML =
          '<a class="call-btn" href="tel:' +
          config.phone.replace(/[^0-9+]/g, "") +
          '">Call ' +
          escapeHtml(config.phone) +
          " to book</a>";
      }
    }

    // Reveal
    document.getElementById("loader").hidden = true;
    document.getElementById("thanks-app").hidden = false;
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function shade(hex, amt) {
    var m = /^#?([a-f0-9]{6})$/i.exec(hex);
    if (!m) return hex;
    var num = parseInt(m[1], 16);
    var r = (num >> 16) & 0xff;
    var g = (num >> 8) & 0xff;
    var b = num & 0xff;
    r = Math.max(0, Math.min(255, Math.round(r + 255 * amt)));
    g = Math.max(0, Math.min(255, Math.round(g + 255 * amt)));
    b = Math.max(0, Math.min(255, Math.round(b + 255 * amt)));
    return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
  }
})();
