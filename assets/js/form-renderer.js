/* ============================================================
   form-renderer.js — Renders form UI based on config
   ============================================================ */

(function () {
  "use strict";

  /**
   * Initialize the form UI from a loaded config object.
   * Sets brand colors, logo, business name, phone, consent text,
   * extra questions, reCAPTCHA script, and reveals the form.
   */
  function renderForm(config) {
    // Check if client is active
    if (config.active === false) {
      showInactiveMessage(config);
      return;
    }

    // Brand colors via CSS variables
    if (config.brandColor) {
      document.documentElement.style.setProperty("--brand-color", config.brandColor);
      document.documentElement.style.setProperty(
        "--brand-color-dark",
        shade(config.brandColor, -0.18)
      );
    }
    if (config.brandColorSecondary) {
      document.documentElement.style.setProperty(
        "--brand-color-secondary",
        config.brandColorSecondary
      );
    }

    // Logo
    var logo = document.getElementById("brand-logo");
    if (config.logoUrl) {
      logo.src = config.logoUrl;
      logo.alt = config.businessName || "";
      logo.hidden = false;
    }

    // Business name
    document.getElementById("brand-name").textContent =
      config.businessName || "Roofing Quote";

    // Page title
    if (config.meta && config.meta.pageTitle) {
      document.title = config.meta.pageTitle;
    } else {
      document.title =
        (config.businessName ? config.businessName + " — " : "") +
        "Free Roofing Estimate";
    }

    // Favicon
    if (config.meta && config.meta.faviconUrl) {
      var link = document.querySelector("link[rel='icon']") || document.createElement("link");
      link.rel = "icon";
      link.href = config.meta.faviconUrl;
      document.head.appendChild(link);
    }

    // Meta description
    if (config.meta && config.meta.metaDescription) {
      var metaDesc = document.querySelector('meta[name="description"]') || document.createElement("meta");
      metaDesc.name = "description";
      metaDesc.content = config.meta.metaDescription;
      document.head.appendChild(metaDesc);
    }

    // Phone
    var phoneEl = document.getElementById("brand-phone");
    if (config.phone) {
      phoneEl.textContent = config.phone;
      phoneEl.href = "tel:" + config.phone.replace(/[^0-9+]/g, "");
    } else {
      phoneEl.hidden = true;
    }

    // Consent text
    renderConsentText(config);

    // Extra questions
    renderExtraQuestions(config.extraQuestions || []);

    // Inject reCAPTCHA v3 script
    injectRecaptchaScript(config);

    // Wire form events
    wireForm(config);

    // Reveal
    document.getElementById("loader").hidden = true;
    document.getElementById("app").hidden = false;

    // Iframe parent height messaging
    setupResizeMessaging();
  }

  function showInactiveMessage(config) {
    document.getElementById("loader").hidden = true;
    var app = document.getElementById("app");
    app.innerHTML =
      '<div class="inactive-message">' +
      "<h2>We're not accepting new requests right now</h2>" +
      "<p>Thank you for your interest" +
      (config.businessName ? " in " + escapeHtml(config.businessName) : "") +
      ". We're not currently taking new roofing requests through this form.</p>" +
      (config.phone
        ? '<p>You can reach us by phone at <a href="tel:' +
          config.phone.replace(/[^0-9+]/g, "") +
          '">' +
          escapeHtml(config.phone) +
          "</a>.</p>"
        : "") +
      "</div>";
    app.hidden = false;
  }

  function renderConsentText(config) {
    var el = document.getElementById("consent-text");
    var name = config.businessName || "the contractor";
    var privacyUrl = (config.meta && config.meta.privacyPolicyUrl) || "#";
    var termsUrl = config.meta && config.meta.termsUrl;
    var additionalText =
      config.consent && config.consent.additionalLegalText
        ? " " + config.consent.additionalLegalText
        : "";

    el.innerHTML =
      "By submitting this form, I agree to be contacted by " +
      "<strong>" + escapeHtml(name) + "</strong>" +
      " about my roofing inquiry via email, phone, or text. " +
      "Message and data rates may apply. You can reply STOP " +
      "to opt out of texts or click Unsubscribe in any email at any time." +
      "<br><br>" +
      'See our <a href="' + escapeHtml(privacyUrl) + '" target="_blank">privacy policy</a>' +
      (termsUrl
        ? ' and <a href="' + escapeHtml(termsUrl) + '" target="_blank">terms</a>.'
        : ".") +
      additionalText;
  }

  /**
   * Render extra questions from config.extraQuestions.
   * Supported types: radio, select, text, textarea, checkbox
   */
  function renderExtraQuestions(questions) {
    if (!Array.isArray(questions) || questions.length === 0) return;

    // Group by section
    var sections = { contact: [], roof_details: [], optional: [] };
    questions.forEach(function (q) {
      if (!q || !q.fieldName || !q.type) return;
      var sec = q.section || "optional";
      if (!sections[sec]) sections[sec] = [];
      sections[sec].push(q);
    });

    // Insert into respective sections
    var sectionMap = {
      contact: document.getElementById("section-contact"),
      roof_details: document.getElementById("section-roof-details"),
      optional: document.getElementById("section-optional"),
    };

    Object.keys(sections).forEach(function (secKey) {
      var target = sectionMap[secKey];
      if (!target || sections[secKey].length === 0) return;

      sections[secKey].forEach(function (q) {
        var field = buildQuestionField(q);
        if (field) {
          target.appendChild(field);
        }
      });
    });
  }

  function buildQuestionField(q) {
    var wrap = document.createElement("div");
    wrap.className = "field";
    wrap.dataset.extraField = q.fieldName;

    var id = "extra-" + q.fieldName;

    if (q.type === "radio") {
      var fs = document.createElement("fieldset");
      fs.className = "field";
      var legend = document.createElement("legend");
      legend.innerHTML =
        escapeHtml(q.label || q.fieldName) +
        (q.required ? ' <span class="req">*</span>' : "");
      fs.appendChild(legend);

      if (q.helpText) {
        var hint = document.createElement("p");
        hint.className = "field__hint";
        hint.textContent = q.helpText;
        fs.appendChild(hint);
      }

      var row = document.createElement("div");
      row.className = "radio-row";
      (q.options || []).forEach(function (opt) {
        var label = document.createElement("label");
        label.className = "radio";
        var input = document.createElement("input");
        input.type = "radio";
        input.name = q.fieldName;
        input.value = opt.value || opt;
        if (q.required) input.required = true;
        input.dataset.extraField = q.fieldName;
        var span = document.createElement("span");
        span.textContent = opt.label || opt.value || opt;
        label.appendChild(input);
        label.appendChild(span);
        row.appendChild(label);
      });
      fs.appendChild(row);

      var err = document.createElement("p");
      err.className = "field__error";
      err.dataset.errorFor = q.fieldName;
      fs.appendChild(err);
      return fs;
    }

    if (q.type === "select") {
      var lbl = document.createElement("label");
      lbl.htmlFor = id;
      lbl.innerHTML =
        escapeHtml(q.label || q.fieldName) +
        (q.required ? ' <span class="req">*</span>' : "");
      wrap.appendChild(lbl);

      if (q.helpText) {
        var hint = document.createElement("p");
        hint.className = "field__hint";
        hint.textContent = q.helpText;
        wrap.appendChild(hint);
      }

      var select = document.createElement("select");
      select.id = id;
      select.name = q.fieldName;
      select.dataset.extraField = q.fieldName;
      if (q.required) select.required = true;

      var placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Select one\u2026";
      select.appendChild(placeholder);

      (q.options || []).forEach(function (opt) {
        var o = document.createElement("option");
        o.value = opt.value || opt;
        o.textContent = opt.label || opt.value || opt;
        select.appendChild(o);
      });
      wrap.appendChild(select);
    } else if (q.type === "textarea") {
      var lbl = document.createElement("label");
      lbl.htmlFor = id;
      lbl.innerHTML =
        escapeHtml(q.label || q.fieldName) +
        (q.required ? ' <span class="req">*</span>' : "");
      wrap.appendChild(lbl);

      if (q.helpText) {
        var hint = document.createElement("p");
        hint.className = "field__hint";
        hint.textContent = q.helpText;
        wrap.appendChild(hint);
      }

      var ta = document.createElement("textarea");
      ta.id = id;
      ta.name = q.fieldName;
      ta.dataset.extraField = q.fieldName;
      ta.rows = 3;
      if (q.required) ta.required = true;
      wrap.appendChild(ta);
    } else if (q.type === "checkbox") {
      var cbLabel = document.createElement("label");
      cbLabel.className = "checkbox";
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.id = id;
      cb.name = q.fieldName;
      cb.dataset.extraField = q.fieldName;
      if (q.required) cb.required = true;
      var cbSpan = document.createElement("span");
      cbSpan.innerHTML =
        escapeHtml(q.label || q.fieldName) +
        (q.required ? ' <span class="req">*</span>' : "");
      cbLabel.appendChild(cb);
      cbLabel.appendChild(cbSpan);
      wrap.appendChild(cbLabel);
    } else {
      // text (default)
      var lbl = document.createElement("label");
      lbl.htmlFor = id;
      lbl.innerHTML =
        escapeHtml(q.label || q.fieldName) +
        (q.required ? ' <span class="req">*</span>' : "");
      wrap.appendChild(lbl);

      if (q.helpText) {
        var hint = document.createElement("p");
        hint.className = "field__hint";
        hint.textContent = q.helpText;
        wrap.appendChild(hint);
      }

      var input = document.createElement("input");
      input.type = "text";
      input.id = id;
      input.name = q.fieldName;
      input.dataset.extraField = q.fieldName;
      if (q.required) input.required = true;
      wrap.appendChild(input);
    }

    var errEl = document.createElement("p");
    errEl.className = "field__error";
    errEl.dataset.errorFor = q.fieldName;
    wrap.appendChild(errEl);

    return wrap;
  }

  /**
   * Dynamically inject the reCAPTCHA v3 script using the site key from config.
   */
  function injectRecaptchaScript(config) {
    if (!config.recaptchaSiteKey || config.__localTest) return;

    var script = document.createElement("script");
    script.src =
      "https://www.google.com/recaptcha/api.js?render=" + config.recaptchaSiteKey;
    script.async = true;
    document.head.appendChild(script);
  }

  // ---------- Form wiring ----------
  function wireForm(config) {
    var form = document.getElementById("quote-form");

    // Notes char counter
    var notes = document.getElementById("additionalNotes");
    var counter = document.getElementById("notes-count");
    notes.addEventListener("input", function () {
      counter.textContent = String(notes.value.length);
    });

    // ZIP — digits only
    var zip = document.getElementById("zip");
    zip.addEventListener("input", function () {
      zip.value = zip.value.replace(/\D/g, "").slice(0, 5);
    });

    // Skip-to-inspection button
    var skipBtn = document.getElementById("skip-to-inspection");
    if (skipBtn) {
      skipBtn.addEventListener("click", function (e) {
        e.preventDefault();
        window.RoofingForm.handleSkipToInspection(config);
      });
    }

    // Submit
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      window.RoofingForm.handleSubmit(config);
    });
  }

  // ---------- Iframe resize messaging ----------
  function setupResizeMessaging() {
    if (window.parent === window) return;

    notifyParentResize();

    var ro = new ResizeObserver(function () {
      notifyParentResize();
    });
    ro.observe(document.body);

    window.addEventListener("resize", notifyParentResize);
    document
      .getElementById("quote-form")
      .addEventListener("input", notifyParentResize);
  }

  function notifyParentResize() {
    if (window.parent === window) return;
    var h = Math.ceil(document.documentElement.scrollHeight);
    window.parent.postMessage({ type: "roofing-form:resize", height: h }, "*");
  }

  // ---------- Utilities ----------
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c];
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

  // Expose
  window.RoofingForm = window.RoofingForm || {};
  window.RoofingForm.renderForm = renderForm;
})();
