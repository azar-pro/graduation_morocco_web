import { createHash } from "node:crypto";
import {
  FieldValue,
  Timestamp,
  type Firestore,
  type Transaction,
  type DocumentReference,
  type DocumentData,
} from "firebase-admin/firestore";

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

export class RequestProtectionError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 409 | 429,
    public readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "RequestProtectionError";
  }
}

export interface RequestProtection {
  idempotencyRef: DocumentReference;
  payloadHash: string;
  replay: Record<string, unknown> | null;
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function activeResponse(data: DocumentData | undefined) {
  const expiry = data?.expiresAt;
  return expiry && typeof expiry.toMillis === "function" && expiry.toMillis() > Date.now()
    ? data.response as Record<string, unknown>
    : null;
}

function clientAddress(request: Request) {
  const netlify = request.headers.get("x-nf-client-connection-ip")?.trim();
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const real = request.headers.get("x-real-ip")?.trim();
  return (netlify || forwarded || real || "unknown").slice(0, 128);
}

export async function prepareRequestProtection(args: {
  db: Firestore;
  request: Request;
  scope: "individual-order" | "group-order";
  rawBody: string;
  idempotencyKey: string | null;
  maxRequests: number;
  windowMs: number;
}): Promise<RequestProtection> {
  const { db, request, scope, rawBody, idempotencyKey, maxRequests, windowMs } = args;
  if (!idempotencyKey || !/^[0-9a-f-]{36}$/i.test(idempotencyKey)) {
    throw new RequestProtectionError("تعذر التحقق من محاولة الإرسال. حدّث الصفحة ثم أعد المحاولة.", 400);
  }

  const addressHash = sha256(clientAddress(request));
  const payloadHash = sha256(rawBody);
  const idempotencyRef = db.collection("order_idempotency")
    .doc(sha256(`${scope}:${addressHash}:${idempotencyKey}`));

  const existing = await idempotencyRef.get();
  if (existing.exists) {
    const data = existing.data();
    const response = activeResponse(data);
    if (response) {
      if (data?.payloadHash !== payloadHash) {
        throw new RequestProtectionError("تم تغيير بيانات الطلب بعد بدء الإرسال. أعد المحاولة.", 409);
      }
      return { idempotencyRef, payloadHash, replay: response };
    }
  }

  const now = Date.now();
  const windowStartMs = Math.floor(now / windowMs) * windowMs;
  const rateRef = db.collection("request_rate_limits").doc(sha256(`${scope}:${addressHash}`));
  const allowed = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(rateRef);
    const data = snapshot.exists ? snapshot.data() ?? {} : {};
    const count = data.windowStartMs === windowStartMs && Number.isSafeInteger(data.count)
      ? Number(data.count)
      : 0;
    if (count >= maxRequests) return false;
    transaction.set(rateRef, {
      windowStartMs,
      count: count + 1,
      expiresAt: Timestamp.fromMillis(windowStartMs + windowMs * 2),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return true;
  });

  if (!allowed) {
    const retryAfter = Math.max(1, Math.ceil((windowStartMs + windowMs - now) / 1000));
    throw new RequestProtectionError(
      "تم تجاوز عدد محاولات إرسال الطلب مؤقتًا. انتظر قليلًا ثم أعد المحاولة.",
      429,
      retryAfter,
    );
  }

  return { idempotencyRef, payloadHash, replay: null };
}

export async function readIdempotentResponse(
  transaction: Transaction,
  protection: RequestProtection,
) {
  const snapshot = await transaction.get(protection.idempotencyRef);
  if (!snapshot.exists) return null;
  const data = snapshot.data();
  const response = activeResponse(data);
  if (!response) return null;
  if (data?.payloadHash !== protection.payloadHash) {
    throw new RequestProtectionError("تم تغيير بيانات الطلب بعد بدء الإرسال. أعد المحاولة.", 409);
  }
  return response;
}

export function saveIdempotentResponse(
  transaction: Transaction,
  protection: RequestProtection,
  response: Record<string, unknown>,
) {
  transaction.set(protection.idempotencyRef, {
    payloadHash: protection.payloadHash,
    response,
    createdAt: FieldValue.serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + IDEMPOTENCY_TTL_MS),
  });
}
