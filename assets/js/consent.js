/* ============================================================
   consent.js — Renders the consent block per FORM_SPEC §6.

   Self-contained: depends only on a config object and a mount
   container (id="consent-block"). All DOM construction uses
   createElement / textContent / setAttribute — no innerHTML —
   so token values are safe by construction.

   Required tokens (§6.4): businessName, phone, meta.termsUrl,
   meta.privacyPolicyUrl. If any is missing/empty at render time,
   the function throws so the form fails loudly rather than
   leaking raw "{{token}}" text to the page.
   ============================================================ */

(function () {
  "use strict";

  var REQUIRED_TOKENS = ["businessName", "phone", "meta.termsUrl", "meta.privacyPolicyUrl"];

  // ---------- helpers ----------

  function getByPath(obj, path) {
    var parts = path.split(".");
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function requireToken(config, path) {
    var v = getByPath(config, path);
    if (v == null || v === "") {
      var err = '[consent] Cannot render: missing required config token "' + path + '"';
      console.error(err);
      throw new Error(err);
    }
    return String(v);
  }

  /**
   * Tiny DOM builder.
   *   el("p", { class: "x" }, ["text", el("strong", null, "bold")])
   * Attributes go through setAttribute (safe). Strings in `children`
   * become text nodes via createTextNode (auto-escaped).
   */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, k) && attrs[k] != null) {
          node.setAttribute(k, attrs[k]);
        }
      }
    }
    if (children != null) {
      if (!Array.isArray(children)) children = [children];
      for (var i = 0; i < children.length; i++) {
        var c = children[i];
        if (c == null) continue;
        if (typeof c === "string") {
          node.appendChild(document.createTextNode(c));
        } else {
          node.appendChild(c);
        }
      }
    }
    return node;
  }

  function clearChildren(container) {
    while (container.firstChild) container.removeChild(container.firstChild);
  }

  // ---------- §6.1 disclosure block ----------

  function buildDisclosure(config) {
    var businessName = requireToken(config, "businessName");
    var phone = requireToken(config, "phone");
    var termsUrl = requireToken(config, "meta.termsUrl");
    var privacyUrl = requireToken(config, "meta.privacyPolicyUrl");

    return el("div", { class: "consent-disclosure" }, [
      el("h3", null, "How we'll deliver your quote"),

      el("p", null, [
        "You're requesting a roofing quote from ",
        el("strong", null, businessName),
        ". After you submit, we'll email your estimate to the address above. " +
          "We may also send you follow-up emails about scheduling your appointment, " +
          "reminders if you haven't booked yet, and updates about any inspection " +
          "you book. Every email includes an unsubscribe link — you can stop " +
          "these anytime."
      ]),

      el("p", null, [
        el("strong", null, "About appointments."),
        " If you book an inspection or estimate visit with us, you agree we may " +
          "contact you by phone about that specific appointment — to confirm " +
          "timing, reschedule, or let you know if we're running late."
      ]),

      el("p", null, [
        el("strong", null, "Want more ways to hear from us?"),
        " The two boxes below are optional. They let us reach you by phone or " +
          "text about your inquiry beyond just appointment logistics."
      ]),

      el("p", { class: "consent-footnote" }, [
        "Prefer to talk now instead of filling out the form? Call us directly at ",
        el("a", { href: "tel:" + phone }, phone),
        ". By submitting this form, you confirm the phone number and email above " +
          "are yours, you are at least 18 years old, and you agree to our ",
        el("a", { href: termsUrl, target: "_blank", rel: "noopener" }, "Terms"),
        " and ",
        el("a", { href: privacyUrl, target: "_blank", rel: "noopener" }, "Privacy Policy"),
        "."
      ])
    ]);
  }

  // ---------- §6.6 optional jurisdiction add-on ----------

  function buildJurisdictionAddon(config) {
    var addon = config.consent && config.consent.additionalLegalText;
    if (addon == null || String(addon).trim() === "") return null;
    return el("p", { class: "consent-jurisdiction-addon" }, String(addon));
  }

  // ---------- §6.2 phone checkbox ----------

  function buildPhoneCheckbox(config) {
    var businessName = requireToken(config, "businessName");
    return el("label", { class: "consent-checkbox" }, [
      el("input", { type: "checkbox", name: "phoneConsent", value: "true" }),
      el("span", null, [
        el("strong", null, "Phone calls (optional)."),
        " I agree that " + businessName + " may contact me at the phone number " +
          "I entered above by phone call about my roofing inquiry, including " +
          "calls placed using an automatic telephone dialing system or an " +
          "artificial or prerecorded voice. This is in addition to " +
          "appointment-related calls described above. Call frequency varies."
      ])
    ]);
  }

  // ---------- §6.3 SMS checkbox ----------

  function buildSmsCheckbox(config) {
    var businessName = requireToken(config, "businessName");
    return el("label", { class: "consent-checkbox" }, [
      el("input", { type: "checkbox", name: "smsConsent", value: "true" }),
      el("span", null, [
        el("strong", null, "Text messages (optional)."),
        " I agree that " + businessName + " may contact me at the phone number " +
          "I entered above by text message about my roofing inquiry, including " +
          "automated texts. Message frequency varies. Message and data rates may " +
          "apply. Reply ",
        el("strong", null, "HELP"),
        " for help, ",
        el("strong", null, "STOP"),
        " to cancel."
      ])
    ]);
  }

  // ---------- public ----------

  /**
   * Render the consent block into the given container.
   * @param {object} config — resolved client config
   * @param {Element} [container] — defaults to #consent-block
   */
  function renderConsent(config, container) {
    container = container || document.getElementById("consent-block");
    if (!container) {
      throw new Error("[consent] Mount container #consent-block not found in DOM");
    }
    if (!config || typeof config !== "object") {
      throw new Error("[consent] config object is required");
    }

    // Pre-flight: surface missing-token errors before mutating the DOM.
    for (var i = 0; i < REQUIRED_TOKENS.length; i++) {
      requireToken(config, REQUIRED_TOKENS[i]);
    }

    clearChildren(container);

    container.appendChild(buildDisclosure(config));

    var addon = buildJurisdictionAddon(config);
    if (addon) container.appendChild(addon);

    container.appendChild(buildPhoneCheckbox(config));
    container.appendChild(buildSmsCheckbox(config));
  }

  // Expose
  window.RoofingForm = window.RoofingForm || {};
  window.RoofingForm.renderConsent = renderConsent;
})();
