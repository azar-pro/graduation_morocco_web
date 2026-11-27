import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  prepareRequestProtection,
  readIdempotentResponse,
  RequestProtectionError,
  saveIdempotentResponse,
} from "../lib/request-protection.ts";

const app = initializeApp({ projectId: "demo-graduation-morocco" }, `request-protection-${randomUUID()}`);
const db = getFirestore(app);
const ip = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;
const request = () => new Request("https://example.test/api/orders", {
  headers: { "x-nf-client-connection-ip": ip },
});
const scope = "individual-order";
const body = JSON.stringify({ draft: { fullName: "Test User" } });
const key = randomUUID();

try {
  const first = await prepareRequestProtection({
    db, request: request(), scope, rawBody: body, idempotencyKey: key,
    maxRequests: 2, windowMs: 60_000,
  });
  assert.equal(first.replay, null);

  await db.runTransaction(async (transaction) => {
    assert.equal(await readIdempotentResponse(transaction, first), null);
    saveIdempotentResponse(transaction, first, { orderNumber: "GM-2026-000019" });
  });

  const replay = await prepareRequestProtection({
    db, request: request(), scope, rawBody: body, idempotencyKey: key,
    maxRequests: 2, windowMs: 60_000,
  });
  assert.deepEqual(replay.replay, { orderNumber: "GM-2026-000019" });

  await assert.rejects(
    () => prepareRequestProtection({
      db, request: request(), scope, rawBody: JSON.stringify({ draft: { fullName: "Changed" } }),
      idempotencyKey: key, maxRequests: 2, windowMs: 60_000,
    }),
    (error) => error instanceof RequestProtectionError && error.status === 409,
  );

  await prepareRequestProtection({
    db, request: request(), scope, rawBody: body, idempotencyKey: randomUUID(),
    maxRequests: 2, windowMs: 60_000,
  });

  await assert.rejects(
    () => prepareRequestProtection({
      db, request: request(), scope, rawBody: body, idempotencyKey: randomUUID(),
      maxRequests: 2, windowMs: 60_000,
    }),
    (error) => error instanceof RequestProtectionError && error.status === 429,
  );

  console.log("Request protection tests passed: replay, payload mismatch, and distributed rate limit.");
} finally {
  await deleteApp(app);
}
