"use client";

import { useState, useSyncExternalStore } from "react";

type Consent = "granted" | "denied";
const consentKey = "cwt_analytics_consent";
const consentEvent = "cwt:analytics-consent";

function currentChoice(): Consent | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(consentKey);
  return stored === "granted" || stored === "denied" ? stored : null;
}

function subscribeToChoice(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(consentEvent, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(consentEvent, onStoreChange);
  };
}

export function AnalyticsConsent() {
  const choice = useSyncExternalStore(subscribeToChoice, currentChoice, () => null);
  const [editing, setEditing] = useState(false);

  function save(next: Consent): void {
    window.localStorage.setItem(consentKey, next);
    setEditing(false);
    window.dispatchEvent(new CustomEvent(consentEvent, { detail: next }));
  }

  if (choice !== null && !editing) {
    return (
      <button
        className="fixed bottom-24 left-4 z-50 rounded-full border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-800 shadow-md md:bottom-4"
        onClick={() => setEditing(true)}
        type="button"
      >
        Privacy choices
      </button>
    );
  }
  return (
    <section
      aria-label="Analytics privacy choices"
      className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-2xl rounded-2xl border border-stone-300 bg-white p-5 text-stone-900 shadow-2xl md:bottom-4"
      role="dialog"
    >
      <h2 className="font-semibold">Optional analytics</h2>
      <p className="mt-2 text-sm leading-6 text-stone-600">
        Analytics is off unless you allow it. Your inquiry still works when you decline.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button className="button-primary" onClick={() => save("granted")} type="button">
          Allow analytics
        </button>
        <button className="button-secondary" onClick={() => save("denied")} type="button">
          {choice === "granted" ? "Withdraw consent" : "Decline"}
        </button>
        {choice !== null ? (
          <button className="px-3 py-2 text-sm" onClick={() => setEditing(false)} type="button">
            Cancel
          </button>
        ) : null}
      </div>
    </section>
  );
}
