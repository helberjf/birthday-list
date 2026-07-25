import assert from "node:assert/strict";
import { customFetch } from "../../lib/api-client-react/src/custom-fetch.ts";

const originalFetch = globalThis.fetch;
let seenAuthorization: string | null = null;

try {
  globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
    seenAuthorization = new Headers(init?.headers).get("authorization");
    return new Response(null, { status: 204 });
  }) as typeof fetch;

  await customFetch("/api/guests/1", {
    method: "DELETE",
    Authorization: "Bearer admin-token",
  } as RequestInit & { Authorization: string });

  assert.equal(seenAuthorization, "Bearer admin-token");
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Custom fetch auth compatibility checks passed.");
