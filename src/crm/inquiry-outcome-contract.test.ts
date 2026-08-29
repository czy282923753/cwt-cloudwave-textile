import { describe, expect, it } from "vitest";

import {
  allowedInquiryStatusTransitions,
  assertInquiryStatusTransition,
} from "./inquiry-service";

const acceptedTransitions = {
  new: ["reviewing", "spam", "archived"],
  reviewing: ["qualified", "lost", "spam", "archived"],
  qualified: ["quoted", "sample", "negotiation", "lost", "archived"],
  quoted: ["sample", "negotiation", "won", "lost", "archived"],
  sample: ["quoted", "negotiation", "won", "lost", "archived"],
  negotiation: ["quoted", "sample", "won", "lost", "archived"],
  won: ["archived"],
  lost: ["reviewing", "archived"],
  spam: ["reviewing", "archived"],
  archived: ["reviewing"],
} as const;

describe("accepted CRM outcome transition contract", () => {
  it("exposes exactly the existing accepted next states without adding a lifecycle", () => {
    const statuses = Object.keys(acceptedTransitions) as Array<keyof typeof acceptedTransitions>;
    expect(statuses).toHaveLength(10);
    for (const fromStatus of statuses) {
      expect(allowedInquiryStatusTransitions(fromStatus)).toEqual(
        acceptedTransitions[fromStatus],
      );
      for (const toStatus of statuses) {
        if (acceptedTransitions[fromStatus].includes(toStatus as never)) {
          expect(() => assertInquiryStatusTransition(fromStatus, toStatus)).not.toThrow();
        } else {
          expect(() => assertInquiryStatusTransition(fromStatus, toStatus)).toThrow();
        }
      }
    }
  });
});
