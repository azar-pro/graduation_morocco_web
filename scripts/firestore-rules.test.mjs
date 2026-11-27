import { readFile } from "node:fs/promises";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";

const rules = await readFile("firestore.rules", "utf8");
const env = await initializeTestEnvironment({
  projectId: "demo-graduation-morocco",
  firestore: { rules },
});

try {
  const publicDb = env.unauthenticatedContext().firestore();
  const orderNumber = "GM-2026-000018";
  const groupNumber = "GRP-2026-ABCDEFG2";

  // The public browser must never write directly to protected order collections.
  // It now calls the server API, which uses Firebase Admin credentials.
  console.log("[rules-test] block direct public individual order creation");
  await assertFails(setDoc(doc(publicDb, "orders", orderNumber), {
    orderNumber,
    status: "received",
    totalPrice: 1,
  }));

  console.log("[rules-test] block public request protection state access");
  await assertFails(getDoc(doc(publicDb, "request_rate_limits", "test")));
  await assertFails(setDoc(doc(publicDb, "request_rate_limits", "test"), { count: 1 }));
  await assertFails(getDoc(doc(publicDb, "order_idempotency", "test")));
  await assertFails(setDoc(doc(publicDb, "order_idempotency", "test"), { response: {} }));

  console.log("[rules-test] block public counter reads and writes");
  await assertFails(getDoc(doc(publicDb, "order_number_counters", "2026")));
  await assertFails(setDoc(doc(publicDb, "order_number_counters", "2026"), {
    lastNumber: 18,
    lastOrderNumber: orderNumber,
  }));

  console.log("[rules-test] block direct public tracking creation");
  await assertFails(setDoc(doc(publicDb, "order_tracking", orderNumber), {
    orderNumber,
    status: "received",
    orderType: "شراء",
    productType: "fullOutfit",
  }));

  console.log("[rules-test] block direct public group order creation");
  await assertFails(setDoc(doc(publicDb, "group_orders", groupNumber), {
    groupOrderNumber: groupNumber,
    orderType: "شراء",
    quantity: 5,
  }));

  console.log("[rules-test] public tracking lookup remains available by order number");
  await assertSucceeds(getDoc(doc(publicDb, "order_tracking", orderNumber)));
  await assertSucceeds(getDoc(doc(publicDb, "order_tracking", groupNumber)));
  await assertFails(getDoc(doc(publicDb, "order_tracking", "not-an-order-number")));
  await assertFails(getDoc(doc(publicDb, "tracking_phone_lookup", "0612345678")));
  await assertFails(getDocs(collection(publicDb, "group_orders")));

  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "users", "admin-user"), { role: "admin", active: true });
  });
  const adminDb = env.authenticatedContext("admin-user").firestore();

  console.log("[rules-test] admin can manage order collections");
  await assertSucceeds(setDoc(doc(adminDb, "orders", orderNumber), {
    orderNumber,
    status: "received",
  }));
  await assertSucceeds(setDoc(doc(adminDb, "order_tracking", orderNumber), {
    orderNumber,
    status: "received",
  }));
  await assertSucceeds(setDoc(doc(adminDb, "group_orders", groupNumber), {
    groupOrderNumber: groupNumber,
    status: "received",
  }));
  await assertSucceeds(getDocs(collection(adminDb, "group_orders")));

  console.log("Firestore security rules tests passed.");
} finally {
  await env.cleanup();
}
