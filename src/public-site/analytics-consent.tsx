"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

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
  const [consentVersion, setConsentVersion] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/analytics-consent/", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Consent state unavailable.");
        return response.json() as Promise<{
          status: "unknown" | "granted" | "denied" | "revoked";
          consentVersion: number;
        }>;
      })
      .then((persisted) => {
        if (!active) return;
        setConsentVersion(persisted.consentVersion);
        if (persisted.status === "granted") {
          window.localStorage.setItem(consentKey, "granted");
        } else if (persisted.status === "denied" || persisted.status === "revoked") {
          window.localStorage.setItem(consentKey, "denied");
        } else {
          if (window.localStorage.getItem(consentKey) === "granted") {
            window.localStorage.removeItem(consentKey);
          }
        }
        window.dispatchEvent(new CustomEvent(consentEvent));
      })
      .catch(() => {
        if (!active) return;
        window.localStorage.removeItem(consentKey);
        window.dispatchEvent(new CustomEvent(consentEvent));
      });
    return () => {
      active = false;
    };
  }, []);

  async function save(next: Consent): Promise<void> {
    setSaving(true);
    try {
      const persistedStatus = next === "denied" && choice === "granted"
        ? "revoked"
        : next;
      const response = await fetch("/api/analytics-consent/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status: persistedStatus,
          expectedVersion: consentVersion,
        }),
      });
      if (!response.ok) throw new Error("Consent state changed.");
      const persisted = await response.json() as { consentVersion: number };
      setConsentVersion(persisted.consentVersion);
      window.localStorage.setItem(consentKey, next);
      setEditing(false);
      window.dispatchEvent(new CustomEvent(consentEvent, { detail: next }));
    } finally {
      setSaving(false);
    }
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
        <button className="button-primary" disabled={saving} onClick={() => void save("granted")} type="button">
          Allow analytics
        </button>
        <button className="button-secondary" disabled={saving} onClick={() => void save("denied")} type="button">
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
