/* ============================================================
   config-loader.js — Resolves client identity + fetches config
   ============================================================ */

(function () {
  "use strict";

  // Embedded fallback for local development (file:// or localhost)
  const LOCAL_TEST_CONFIG = {
    clientId: "local-test",
    businessName: "Local Test Roofing Co.",
    logoUrl: "",
    brandColor: "#1a5276",
    brandColorSecondary: "#1a1a1a",
    phone: "(555) 555-0100",
    bookingLink: "https://example.com/book",
    webhookUrl: "",
    recaptchaSiteKey: "",
    physicalAddress: "123 Test St, Testville TX 00000",
    extraQuestions: [],
    consent: {},
    meta: {
      pageTitle: "Roofing Quote — Local Test",
      privacyPolicyUrl: "#",
    },
    thankYouPage: {
      heading: "Thanks — we received your request!",
      subheading: "We'll reach out shortly.",
      showCalendly: true,
    },
    active: true,
    __localTest: true,
  };

  function isLocalHost() {
    var h = window.location.hostname;
    return (
      window.location.protocol === "file:" ||
      h === "localhost" ||
      h === "127.0.0.1" ||
      h === "0.0.0.0" ||
      h === ""
    );
  }

  /**
   * Resolves the client config. Resolution order:
   * 1. ?client=xxx query param (wins if present, used for testing)
   * 2. Subdomain — e.g. quotes.summitroofing.com → "summitroofing"
   * 3. Fallback — load default.json
   */
  async function resolveConfig() {
    var params = new URLSearchParams(window.location.search);
    var paramClient = params.get("client");

    var clientId = paramClient;

    if (!clientId) {
      var host = window.location.hostname;
      // e.g., quotes.summitroofing.com → 'summitroofing'
      if (host.includes(".") && !isLocalHost()) {
        var parts = host.split(".");
        // If subdomain like quotes.summitroofing.com
        if (parts.length >= 3 && parts[0] === "quotes") {
          clientId = parts[1];
        } else if (parts.length >= 3) {
          // e.g. summitroofing.pages.dev → 'summitroofing'
          clientId = parts[0];
        }
      }
    }

    // Local dev without explicit client
    if (!clientId && isLocalHost()) {
      console.info(
        "[roofing-form] No ?client= param on local host — using embedded LOCAL_TEST_CONFIG. " +
        "Append ?client=<id> to load a real config."
      );
      return LOCAL_TEST_CONFIG;
    }

    if (!clientId) clientId = "default";

    try {
      var res = await fetch("/config/" + clientId + ".json", { cache: "no-store" });
      if (!res.ok) throw new Error("Config not found for " + clientId);
      var config = await res.json();
      config._resolvedClientId = clientId;
      return config;
    } catch (err) {
      console.warn("[roofing-form] Config load failed for '" + clientId + "', trying default", err);

      // On local host, fall back to embedded test config
      if (isLocalHost()) {
        console.warn("[roofing-form] Falling back to LOCAL_TEST_CONFIG.");
        return LOCAL_TEST_CONFIG;
      }

      try {
        var fallbackRes = await fetch("/config/default.json", { cache: "no-store" });
        if (!fallbackRes.ok) throw new Error("Default config also not found");
        var fallbackConfig = await fallbackRes.json();
        fallbackConfig._resolvedClientId = "default";
        return fallbackConfig;
      } catch (fallbackErr) {
        console.error("[roofing-form] All config loading failed", fallbackErr);
        return null;
      }
    }
  }

  // Expose globally
  window.RoofingForm = window.RoofingForm || {};
  window.RoofingForm.resolveConfig = resolveConfig;
  window.RoofingForm.isLocalHost = isLocalHost;
})();
