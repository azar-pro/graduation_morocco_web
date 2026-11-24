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
  runTransaction,
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

  console.log("[rules-test] group valid purchase");
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
  console.log("[rules-test] group invalid quantity");
  await assertFails(setDoc(invalidQuantityRef, invalidQuantity));

  const [excelRef, excelOrder] = groupDoc("ABCDEFG4", {
    members: [],
    membersExcelUrl: "https://res.cloudinary.com/demo/raw/upload/group.xlsx",
    membersExcelName: "group.xlsx",
  });
  console.log("[rules-test] group Excel upload");
  await assertSucceeds(setDoc(excelRef, excelOrder));

  const [printingRef, printingOrder] = groupDoc("ABCDEFG5", {
    rightShawl: { enabled: true, type: "text", text: "Class 2026", logoPath: null },
    referenceImages: ["https://res.cloudinary.com/demo/image/upload/reference.jpg"],
  });
  console.log("[rules-test] group printing");
  await assertSucceeds(setDoc(printingRef, printingOrder));

  const [badPrintingRef, badPrintingOrder] = groupDoc("ABCDEFG6", {
    rightShawl: { enabled: true, type: "logo", text: "", logoPath: "javascript:alert(1)" },
  });
  console.log("[rules-test] group unsafe logo URL");
  await assertFails(setDoc(badPrintingRef, badPrintingOrder));

  const [badImageRef, badImageOrder] = groupDoc("ABCDEFG7", {
    referenceImages: ["http://example.com/reference.jpg"],
  });
  console.log("[rules-test] group unsafe reference image");
  await assertFails(setDoc(badImageRef, badImageOrder));

  const [extraFieldRef, extraFieldOrder] = groupDoc("ABCDEFG8", {
    isAdmin: true,
  });
  console.log("[rules-test] group extra field");
  await assertFails(setDoc(extraFieldRef, extraFieldOrder));

  const [rentalRef, groupRentalOrder] = groupDoc("ABCDEFG9", {
    orderType: "كراء",
    returnAt: Timestamp.fromMillis(scheduledAt.toMillis() + 24 * 60 * 60 * 1000),
    members: [],
    membersExcelUrl: null,
    membersExcelName: null,
    productType: "fullOutfit",
  });
  console.log("[rules-test] group valid rental");
  await assertSucceeds(setDoc(rentalRef, groupRentalOrder));

  const [rentalPrintingRef, rentalPrintingOrder] = groupDoc("ABCDEFGH", {
    orderType: "كراء",
    returnAt: Timestamp.fromMillis(scheduledAt.toMillis() + 24 * 60 * 60 * 1000),
    members: [],
    membersExcelUrl: null,
    membersExcelName: null,
    productType: "fullOutfit",
    rightShawl: { enabled: true, type: "text", text: "Not allowed", logoPath: null },
  });
  console.log("[rules-test] group rental printing");
  await assertFails(setDoc(rentalPrintingRef, rentalPrintingOrder));

  const [rentalHiddenPayloadRef, rentalHiddenPayloadOrder] = groupDoc("ABCDEFGJ", {
    orderType: "كراء",
    returnAt: Timestamp.fromMillis(scheduledAt.toMillis() + 24 * 60 * 60 * 1000),
    members: [],
    membersExcelUrl: null,
    membersExcelName: null,
    productType: "fullOutfit",
    rightShawl: { enabled: false, type: "logo", text: "", logoPath: "https://example.com/logo.png" },
  });
  console.log("[rules-test] group hidden rental payload");
  await assertFails(setDoc(rentalHiddenPayloadRef, rentalHiddenPayloadOrder));


  // Seed the public catalog and configuration used by individual-order validation.
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "products", "test-full-outfit"), {
      productType: "fullOutfit",
      active: true,
      purchaseSatin: 500,
      purchaseMoubara: 600,
      rentalSatin: 120,
      rentalMoubara: 150,
    });
    await setDoc(doc(db, "settings", "shop"), {
      acceptingOrders: true,
      maintenanceMode: false,
      purchaseEnabled: true,
      rentalEnabled: true,
      cashAtStoreEnabled: true,
      bankTransferEnabled: true,
      cashTransferAgencyEnabled: true,
      depositPaymentEnabled: true,
      fullPaymentEnabled: true,
      paymentDeadlineHours: 48,
      depositPercentage: 50,
      rentalSecurityDepositSatin: 250,
      rentalSecurityDepositMoubara: 300,
    });
    await setDoc(doc(db, "settings", "order_rules"), {
      purchasePreparationDays: 2,
      rentalAdvanceHours: 24,
      urgentOrdersEnabled: false,
      urgentMinimumHours: 12,
    });
  });

  const individualScheduledAt = Timestamp.fromMillis(Date.now() + 4 * 24 * 60 * 60 * 1000);
  const individualBase = {
    orderNumber: "GM-2026-000018",
    orderYear: "2026",
    orderSequenceNumber: 18,
    status: "received",
    paymentStatus: "pending",
    paymentMethod: "cash_at_store",
    bankTransferPlan: "",
    paymentProvider: "",
    paymentDeadline: null,
    totalPrice: 500,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    gender: "ذكر",
    orderType: "شراء",
    productType: "fullOutfit",
    catalogProductId: "test-full-outfit",
    catalogProductNameAr: "بدلة تخرج",
    catalogProductNameEn: "",
    fabric: "ساتان",
    shawlColor: "أبيض",
    notes: "",
    deliveryMethod: "pickup",
    fullName: "Test Customer",
    phoneNumber: "0612345678",
    city: "Fes",
    address: "",
    deliveryNotes: "",
    deliveryDate: "2026-11-28",
    deliveryTime: "12:00",
    returnDate: null,
    returnTime: "",
    urgentOrder: false,
    deliveryFee: 0,
    fesArea: null,
    rightShawl: disabled,
    leftShawl: disabled,
    backShawl: disabled,
    cap: disabled,
    referenceImages: [],
    productPriceApplied: 500,
    deliveryFeeApplied: 0,
    deliveryPricingDocumentId: "",
    amountPaid: 0,
    remainingAmount: 500,
    trackingPhoneKey: "0612345678",
    scheduledAt: individualScheduledAt,
    purchasePreparationDaysApplied: 2,
    rentalAdvanceHoursApplied: 24,
    scheduleTimeZone: "Africa/Casablanca",
  };

  async function submitIndividualOrder(sequence, overrides = {}) {
    const orderNumber = `GM-2026-${String(sequence).padStart(6, "0")}`;
    const orderData = {
      ...individualBase,
      orderNumber,
      orderSequenceNumber: sequence,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...overrides,
    };
    const counterRef = doc(publicDb, "order_number_counters", "2026");
    const orderRef = doc(publicDb, "orders", orderNumber);
    await runTransaction(publicDb, async (transaction) => {
      const counter = await transaction.get(counterRef);
      transaction.set(counterRef, {
        lastNumber: sequence,
        lastOrderNumber: orderNumber,
        reconciledWithSavedOrders: true,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      transaction.set(orderRef, orderData);
    });
    await setDoc(doc(publicDb, "order_tracking", orderNumber), {
      orderNumber,
      status: "received",
      orderType: orderData.orderType,
      productType: orderData.productType,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...(orderData.paymentMethod !== "cash_at_store"
        ? { paymentDeadlineHoursApplied: 48 } : {}),
    });
  }

  console.log("[rules-test] individual valid purchase transaction");
  await assertSucceeds(submitIndividualOrder(18));

  console.log("[rules-test] individual forged total");
  await assertFails(submitIndividualOrder(19, {
    totalPrice: 1,
    remainingAmount: 1,
  }));

  const bankPurchase = {
    paymentMethod: "bank_transfer",
    bankTransferPlan: "deposit",
    paymentDeadlineHoursApplied: 48,
    paymentDeadlineTimeZone: "Africa/Casablanca",
    depositPercentageApplied: 50,
    depositRequiredAmount: 250,
  };
  console.log("[rules-test] individual bank deposit purchase");
  await assertSucceeds(submitIndividualOrder(19, bankPurchase));

  const rentalOrder = {
    orderType: "كراء",
    totalPrice: 120,
    productPriceApplied: 120,
    remainingAmount: 120,
    paymentMethod: "bank_transfer",
    bankTransferPlan: "",
    returnAt: Timestamp.fromMillis(individualScheduledAt.toMillis() + 24 * 60 * 60 * 1000),
    returnDate: "2026-11-29",
    returnTime: "12:00",
    rentalFeeAmount: 120,
    rentalSecurityDepositAmount: 250,
    rentalDepositCollectedAmount: 0,
    rentalDepositStatus: "pending",
    rentalReturnStatus: "awaiting_return",
    rentalDamageDeduction: 0,
    rentalRefundAmount: null,
    rentalAdditionalDamageDue: 0,
    rentalSettlementStatus: "pending",
    paymentDeadlineHoursApplied: 48,
    paymentDeadlineTimeZone: "Africa/Casablanca",
  };
  console.log("[rules-test] individual valid rental");
  await assertSucceeds(submitIndividualOrder(20, rentalOrder));

  console.log("[rules-test] individual invalid rental deposit");
  await assertFails(submitIndividualOrder(21, {
    ...rentalOrder,
    rentalSecurityDepositAmount: 1,
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
