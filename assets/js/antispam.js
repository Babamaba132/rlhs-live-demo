/* ============================================================
   antispam.js — Time-on-form spam check per FORM_SPEC §7.4.

   Captures a load timestamp at script-execute time. On submit,
   the caller asks for the elapsed integer seconds; values under
   5 are blocked with a generic error (spec §7.4). Values 5+
   are passed through to the payload as `formDuration` for
   audit-only logging — n8n no longer routes on this value
   (per v3.2 of the spec).

   Reused by both the main-form path and the skip-to-inspection
   path so the floor is consistent.
   ============================================================ */

(function () {
  "use strict";

  // Module-scoped: set once at script-execute time. Real humans take 8+
  // seconds to fill the form even with autofill; bots fire in well under 5.
  var formLoadedAt = Date.now();

  var MIN_DURATION_SECONDS = 5;

  // Generic message — deliberately not "you look like a bot"; tipping off
  // the operator about our floor only invites them to add a sleep().
  var GENERIC_ERROR = "Please review your information and try again.";

  function getFormDurationSeconds() {
    return Math.round((Date.now() - formLoadedAt) / 1000);
  }

  /**
   * One-shot check used by submit handlers.
   * @returns {{passed: boolean, formDuration: number}}
   *   passed=true → caller includes formDuration in payload and continues.
   *   passed=false → caller shows GENERIC_ERROR and aborts.
   */
  function checkAndGetDuration() {
    var duration = getFormDurationSeconds();
    return {
      passed: duration >= MIN_DURATION_SECONDS,
      formDuration: duration
    };
  }

  /**
   * Reset the load timestamp. Provided for tests / dev tools — not used
   * by the form itself.
   */
  function resetTimer() {
    formLoadedAt = Date.now();
  }

  // Expose
  window.RoofingForm = window.RoofingForm || {};
  window.RoofingForm.antispam = {
    getFormDurationSeconds: getFormDurationSeconds,
    checkAndGetDuration: checkAndGetDuration,
    resetTimer: resetTimer,
    GENERIC_ERROR: GENERIC_ERROR,
    MIN_DURATION_SECONDS: MIN_DURATION_SECONDS
  };
})();
