import { readFile } from "node:fs/promises";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";

const rules = await readFile("firestore.rules", "utf8");
const env = await initializeTestEnvironment({
  projectId: "demo-graduation-morocco",
  firestore: { rules },
});

try {
  const publicDb = env.unauthenticatedContext().firestore();
  const groupNumber = "GRP-2026-ABCDEFG2";
  const scheduledAt = Timestamp.fromMillis(Date.now() + 72 * 60 * 60 * 1000);
  const disabled = { enabled: false, type: "", text: "", logoPath: null };
  const validGroup = {
    groupOrderNumber: groupNumber,
    orderType: "شراء",
    quantity: 5,
    responsibleName: "Test Responsible",
    phoneNumber: "0612345678",
    city: "Fes",
    deliveryMethod: "pickup",
    address: "",
    scheduledAt,
    returnAt: null,
    members: ["Member One", "Member Two", "Member Three", "Member Four", "Member Five"],
    membersExcelUrl: null,
    membersExcelName: null,
    productType: "fullOutfit",
    rightShawl: disabled,
    leftShawl: disabled,
    backShawl: disabled,
    cap: disabled,
    referenceImages: [],
    customizationScope: "shared_group_design",
    notes: "",
    status: "received",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await assertSucceeds(setDoc(doc(publicDb, "group_orders", groupNumber), validGroup));
  await assertFails(setDoc(doc(publicDb, "group_orders", "GRP-2026-ABCDEFG3"), {
    ...validGroup,
    groupOrderNumber: "GRP-2026-ABCDEFG3",
    quantity: 4,
    members: ["One", "Two", "Three", "Four"],
  }));

  await assertSucceeds(getDoc(doc(publicDb, "order_tracking", "GM-2026-000018")));
  await assertFails(getDoc(doc(publicDb, "order_tracking", "not-an-order-number")));
  await assertFails(getDoc(doc(publicDb, "tracking_phone_lookup", "0612345678")));
  await assertFails(getDocs(collection(publicDb, "group_orders")));
  await assertFails(setDoc(doc(publicDb, "users", "ordinary-user"), {
    role: "admin",
    active: true,
  }));

  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "users", "admin-user"), {
      role: "admin",
      active: true,
    });
  });
  const adminDb = env.authenticatedContext("admin-user").firestore();
  await assertSucceeds(getDocs(collection(adminDb, "group_orders")));

  console.log("Firestore security rules tests passed.");
} finally {
  await env.cleanup();
}
