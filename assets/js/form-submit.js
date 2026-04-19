/* ============================================================
   form-submit.js — Handles form validation, submission,
   reCAPTCHA v3 execution, and skip-to-inspection flow
   ============================================================ */

(function () {
  "use strict";

  // ---------- Full form submit ----------
  async function handleSubmit(config) {
    clearErrors();

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
    btn.textContent = "Submitting\u2026";

    try {
      // Get reCAPTCHA token
      var recaptchaToken = "";
      if (config.recaptchaSiteKey && !config.__localTest && window.grecaptcha) {
        recaptchaToken = await grecaptcha.execute(config.recaptchaSiteKey, {
          action: "submit",
        });
      }

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

        trustedFormCertUrl:
          document.querySelector('[name="xxTrustedFormCertUrl"]')?.value || null,
        recaptchaToken: recaptchaToken,
        recaptchaAction: "submit",

        submittedAt: new Date().toISOString(),
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
      window.location.href = "/thanks.html";
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
    skipBtn.textContent = "Submitting\u2026";

    try {
      var recaptchaToken = "";
      if (config.recaptchaSiteKey && !config.__localTest && window.grecaptcha) {
        recaptchaToken = await grecaptcha.execute(config.recaptchaSiteKey, {
          action: "skip_to_inspection",
        });
      }

      var payload = {
        clientId: config.clientId,
        fullName: formData.get("fullName"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        zip: formData.get("zip"),
        address: formData.get("address"),

        trustedFormCertUrl:
          document.querySelector('[name="xxTrustedFormCertUrl"]')?.value || null,
        recaptchaToken: recaptchaToken,
        recaptchaAction: "skip_to_inspection",

        submittedAt: new Date().toISOString(),
        source: "skip_to_inspection",
        skipToInspection: true,
        jobType: "inspection",
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

      window.location.href = "/thanks.html?skipped=1";
    } catch (err) {
      console.error("[roofing-form] Skip-to-inspection error:", err);
      skipBtn.disabled = false;
      skipBtn.textContent = "I just want an inspection \u2014 skip the details";
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
