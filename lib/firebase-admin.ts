import "server-only";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not configured.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON must contain valid JSON.");
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("project_id" in parsed) ||
    !("client_email" in parsed) ||
    !("private_key" in parsed)
  ) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is missing required service-account fields.");
  }

  return parsed as Parameters<typeof cert>[0];
}

function getAdminApp() {
  const existing = getApps()[0];
  if (existing) return existing;

  const serviceAccount = getServiceAccount();
  const data = serviceAccount as unknown as { project_id: string };
  return initializeApp({
    credential: cert(serviceAccount),
    projectId: String(data.project_id),
  });
}

export function getAdminFirestore() {
  return getFirestore(getAdminApp());
}
