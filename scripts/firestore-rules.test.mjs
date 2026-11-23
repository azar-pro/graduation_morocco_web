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

  const groupDoc = (suffix, overrides = {}) => {
    const id = `GRP-2026-${suffix}`;
    return [doc(publicDb, "group_orders", id), {
      ...validGroup,
      groupOrderNumber: id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...overrides,
    }];
  };

  const [invalidQuantityRef, invalidQuantity] = groupDoc("ABCDEFG3", {
    quantity: 4,
    members: ["One", "Two", "Three", "Four"],
  });
  await assertFails(setDoc(invalidQuantityRef, invalidQuantity));

  const [excelRef, excelOrder] = groupDoc("ABCDEFG4", {
    members: [],
    membersExcelUrl: "https://res.cloudinary.com/demo/raw/upload/group.xlsx",
    membersExcelName: "group.xlsx",
  });
  await assertSucceeds(setDoc(excelRef, excelOrder));

  const [printingRef, printingOrder] = groupDoc("ABCDEFG5", {
    rightShawl: { enabled: true, type: "text", text: "Class 2026", logoPath: null },
    referenceImages: ["https://res.cloudinary.com/demo/image/upload/reference.jpg"],
  });
  await assertSucceeds(setDoc(printingRef, printingOrder));

  const [badPrintingRef, badPrintingOrder] = groupDoc("ABCDEFG6", {
    rightShawl: { enabled: true, type: "logo", text: "", logoPath: "javascript:alert(1)" },
  });
  await assertFails(setDoc(badPrintingRef, badPrintingOrder));

  const [badImageRef, badImageOrder] = groupDoc("ABCDEFG7", {
    referenceImages: ["http://example.com/reference.jpg"],
  });
  await assertFails(setDoc(badImageRef, badImageOrder));

  const [extraFieldRef, extraFieldOrder] = groupDoc("ABCDEFG8", {
    isAdmin: true,
  });
  await assertFails(setDoc(extraFieldRef, extraFieldOrder));

  const [rentalRef, rentalOrder] = groupDoc("ABCDEFG9", {
    orderType: "كراء",
    returnAt: Timestamp.fromMillis(scheduledAt.toMillis() + 24 * 60 * 60 * 1000),
    members: [],
    membersExcelUrl: null,
    membersExcelName: null,
    productType: "fullOutfit",
  });
  await assertSucceeds(setDoc(rentalRef, rentalOrder));

  const [rentalPrintingRef, rentalPrintingOrder] = groupDoc("ABCDEFGH", {
    orderType: "كراء",
    returnAt: Timestamp.fromMillis(scheduledAt.toMillis() + 24 * 60 * 60 * 1000),
    members: [],
    membersExcelUrl: null,
    membersExcelName: null,
    productType: "fullOutfit",
    rightShawl: { enabled: true, type: "text", text: "Not allowed", logoPath: null },
  });
  await assertFails(setDoc(rentalPrintingRef, rentalPrintingOrder));

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
