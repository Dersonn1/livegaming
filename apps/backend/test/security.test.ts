import { describe, it, expect } from "vitest";
import { signPayload, verifySignature } from "../src/roblox/signing";

describe("Command signing", () => {
  it("verifies a signature produced by signPayload", () => {
    const payload = JSON.stringify({ commands: [], issuedAt: new Date().toISOString() });
    const sig = signPayload(payload);
    expect(verifySignature(payload, sig)).toBe(true);
  });

  it("rejects a tampered payload", () => {
    const payload = JSON.stringify({ commands: [], issuedAt: new Date().toISOString() });
    const sig = signPayload(payload);
    const tampered = JSON.stringify({ commands: [{ id: "injected" }], issuedAt: new Date().toISOString() });
    expect(verifySignature(tampered, sig)).toBe(false);
  });

  it("rejects an invalid signature", () => {
    const payload = JSON.stringify({ commands: [] });
    expect(verifySignature(payload, "not-a-real-signature")).toBe(false);
  });
});
