/* ============================================================
   form-submit.js — Handles form validation, submission,
   reCAPTCHA v3 execution, and skip-to-inspection flow
   ============================================================ */

(function () {
  "use strict";

  // ---------- Full form submit ----------
  async function handleSubmit(config) {
    clearErrors();

    // §7.4 anti-spam — checked BEFORE field validation. Anything under
    // 5 seconds is blocked at the form with a generic error.
    var timing = window.RoofingForm.antispam.checkAndGetDuration();
    if (!timing.passed) {
      var antispamErr = document.getElementById("submit-error");
      antispamErr.textContent = window.RoofingForm.antispam.GENERIC_ERROR;
      antispamErr.hidden = false;
      return;
    }

    var form = document.getElementById("quote-form");
    var formData = new FormData(form);
    var data = collectFormData(formData);
    var errors = validate(data, config);

    if (Object.keys(errors).length > 0) {
      showFieldErrors(errors);
      return;
    }

    var btn = document.getElementById("submit-btn");
    btn.disabled = true;
    btn.textContent = "Submitting…";

    try {
      // Get reCAPTCHA token
      var recaptchaToken = "";
      if (config.recaptchaSiteKey && !config.__localTest && window.grecaptcha) {
        recaptchaToken = await grecaptcha.execute(config.recaptchaSiteKey, {
          action: "submit",
        });
      }

      // §9.3 — read the two optional consent checkboxes as booleans.
      // Scoped to #consent-block: the skip-path block (#consent-block-skip)
      // contains identically-named checkboxes earlier in document order, so
      // an unscoped querySelector would return the wrong pair. emailConsent
      // is intentionally NOT in the payload — n8n sets it implicitly per §6.
      var phoneConsentEl = document.querySelector('#consent-block input[name="phoneConsent"]');
      var smsConsentEl = document.querySelector('#consent-block input[name="smsConsent"]');
      var nowIso = new Date().toISOString();

      var payload = {
        clientId: config.clientId,
        fullName: formData.get("fullName"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        zip: formData.get("zip"),
        address: formData.get("address"),
        roofType: formData.get("roofType"),
        stories: formData.get("stories"),
        pitch: formData.get("pitch"),
        size: formData.get("size"),
        roofAge: formData.get("roofAge"),
        jobType: formData.get("jobType"),
        urgency: formData.get("urgency"),
        hasDamage: formData.get("hasDamage"),
        isInsuranceClaim: formData.get("isInsuranceClaim"),
        hearAbout: formData.get("hearAbout") || null,
        additionalNotes: formData.get("additionalNotes") || null,

        phoneConsent: phoneConsentEl ? phoneConsentEl.checked : false,
        smsConsent: smsConsentEl ? smsConsentEl.checked : false,
        consentTimestamp: nowIso,

        formDuration: timing.formDuration,

        trustedFormCertUrl:
          document.querySelector('[name="xxTrustedFormCertUrl"]')?.value || null,
        recaptchaToken: recaptchaToken,
        recaptchaAction: "submit",

        submittedAt: nowIso,
        source: "web_form",
        skipToInspection: false,

        extraFields: getExtraFieldValues(config.extraQuestions),
        customFields: {},
      };

      // Local test mode — log and fake delay
      if (config.__localTest) {
        console.log("[local-test] Would POST payload:", payload);
        await new Promise(function (r) { setTimeout(r, 400); });
      } else {
        var res = await fetch(config.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Webhook error: " + res.status);
      }

      // Redirect to thank-you page
      window.location.href = "thanks.html";
    } catch (err) {
      console.error("[roofing-form] Submit error:", err);
      btn.disabled = false;
      btn.textContent = "Get my free quote";
      var errEl = document.getElementById("submit-error");
      errEl.textContent =
        "Something went wrong submitting your request. Please try again or call us directly.";
      errEl.hidden = false;
    }
  }

  // ---------- Skip-to-inspection ----------
  async function handleSkipToInspection(config) {
    clearErrors();

    // §7.4 anti-spam — same floor as the main form path.
    var timing = window.RoofingForm.antispam.checkAndGetDuration();
    if (!timing.passed) {
      var antispamErr = document.getElementById("submit-error");
      antispamErr.textContent = window.RoofingForm.antispam.GENERIC_ERROR;
      antispamErr.hidden = false;
      return;
    }

    var form = document.getElementById("quote-form");
    var formData = new FormData(form);
    var data = collectFormData(formData);

    // Validate only contact fields
    var errors = validateContact(data);
    if (Object.keys(errors).length > 0) {
      showFieldErrors(errors);
      return;
    }

    var skipBtn = document.getElementById("skip-to-inspection");
    skipBtn.disabled = true;
    skipBtn.textContent = "Submitting…";

    try {
      var recaptchaToken = "";
      if (config.recaptchaSiteKey && !config.__localTest && window.grecaptcha) {
        recaptchaToken = await grecaptcha.execute(config.recaptchaSiteKey, {
          action: "submit_skip",
        });
      }

      // §9.2 — consent fields read from the skip block (#consent-block-skip),
      // not the main block. Same field names + same payload shape as the
      // main path; the user's path determines which checkboxes we read.
      var phoneConsentEl = document.querySelector('#consent-block-skip input[name="phoneConsent"]');
      var smsConsentEl = document.querySelector('#consent-block-skip input[name="smsConsent"]');
      var nowIso = new Date().toISOString();

      var payload = {
        clientId: config.clientId,
        fullName: formData.get("fullName"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        zip: formData.get("zip"),
        address: formData.get("address"),
        jobType: "inspection",

        phoneConsent: phoneConsentEl ? phoneConsentEl.checked : false,
        smsConsent: smsConsentEl ? smsConsentEl.checked : false,
        consentTimestamp: nowIso,

        formDuration: timing.formDuration,

        trustedFormCertUrl:
          document.querySelector('[name="xxTrustedFormCertUrl"]')?.value || null,
        recaptchaToken: recaptchaToken,
        recaptchaAction: "submit_skip",

        submittedAt: nowIso,
        source: "skip_to_inspection",
        skipToInspection: true,

        extraFields: getExtraFieldValues(config.extraQuestions),
        customFields: {},
      };

      if (config.__localTest) {
        console.log("[local-test] Would POST skip-to-inspection payload:", payload);
        await new Promise(function (r) { setTimeout(r, 400); });
      } else {
        var res = await fetch(config.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Webhook error: " + res.status);
      }

      window.location.href = "thanks.html?skipped=1";
    } catch (err) {
      console.error("[roofing-form] Skip-to-inspection error:", err);
      skipBtn.disabled = false;
      skipBtn.textContent = "I just want an inspection — skip the details";
      var errEl = document.getElementById("submit-error");
      errEl.textContent =
        "Something went wrong. Please try again or call us directly.";
      errEl.hidden = false;
    }
  }

  // ---------- Validation ----------
  function validateContact(d) {
    var errors = {};
    if (!d.fullName) errors.fullName = "Please enter your full name.";
    if (!d.email || !/^\S+@\S+\.\S+$/.test(d.email))
      errors.email = "Please enter a valid email address.";
    if (!d.phone) errors.phone = "Please enter your phone number.";
    if (!d.zip || !/^\d{5}$/.test(d.zip))
      errors.zip = "Please enter a 5-digit ZIP code.";
    if (!d.address) errors.address = "Please enter your property address.";
    return errors;
  }

  function validate(d, config) {
    var errors = validateContact(d);

    // Roof details
    if (!d.roofType) errors.roofType = "Please choose a roof material.";
    if (!d.stories) errors.stories = "Please choose the number of stories.";
    if (!d.pitch) errors.pitch = "Please choose a roof pitch.";
    if (!d.size) errors.size = "Please choose an approximate roof size.";
    if (!d.roofAge) errors.roofAge = "Please choose the age of the roof.";

    // Job details
    if (!d.jobType) errors.jobType = "Please choose a job type.";
    if (!d.urgency) errors.urgency = "Please choose an urgency level.";
    if (!d.hasDamage) errors.hasDamage = "Please answer about visible damage.";
    if (!d.isInsuranceClaim)
      errors.isInsuranceClaim = "Please answer about insurance.";

    // Required extra questions
    var extraQs = (config && config.extraQuestions) || [];
    extraQs.forEach(function (q) {
      if (q && q.required && q.fieldName) {
        var v = d[q.fieldName];
        if (!v) errors[q.fieldName] = "This field is required.";
      }
    });

    return errors;
  }

  // ---------- Extra field values ----------
  function getExtraFieldValues(extraQuestions) {
    if (!extraQuestions || !extraQuestions.length) return {};
    var values = {};
    extraQuestions.forEach(function (q) {
      if (!q || !q.fieldName) return;
      var selector =
        q.type === "radio"
          ? '[name="' + q.fieldName + '"]:checked'
          : '[name="' + q.fieldName + '"]';
      var el = document.querySelector(selector);
      if (q.type === "checkbox") {
        values[q.fieldName] = el ? el.checked : false;
      } else {
        values[q.fieldName] = el ? el.value || null : null;
      }
    });
    return values;
  }

  // ---------- Helpers ----------
  function collectFormData(fd) {
    var data = {};
    fd.forEach(function (v, k) {
      data[k] = typeof v === "string" ? v.trim() : v;
    });
    return data;
  }

  function clearErrors() {
    document
      .querySelectorAll(".field__error")
      .forEach(function (el) { el.textContent = ""; });
    document
      .querySelectorAll(".invalid")
      .forEach(function (el) { el.classList.remove("invalid"); });
    var submitErr = document.getElementById("submit-error");
    if (submitErr) submitErr.hidden = true;
  }

  function showFieldErrors(errors) {
    var firstField = null;
    Object.keys(errors).forEach(function (key) {
      var errEl = document.querySelector(
        '[data-error-for="' + cssEscape(key) + '"]'
      );
      if (errEl) errEl.textContent = errors[key];

      var input =
        document.querySelector('[name="' + cssEscape(key) + '"]') ||
        document.getElementById(key);
      if (input) {
        input.classList.add("invalid");
        if (!firstField) firstField = input;
      }
    });
    if (firstField && firstField.focus) firstField.focus();
  }

  function cssEscape(s) {
    if (window.CSS && CSS.escape) return CSS.escape(s);
    return String(s).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  // Expose
  window.RoofingForm = window.RoofingForm || {};
  window.RoofingForm.handleSubmit = handleSubmit;
  window.RoofingForm.handleSkipToInspection = handleSkipToInspection;
})();
