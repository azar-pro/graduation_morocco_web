export type ProductType = "fullOutfit" | "shawlAndCap" | "shawlOnly";
export type OrderType = "شراء" | "كراء";
export type DeliveryMethod = "homeDelivery" | "pickup";

export type PublicProduct = {
  id: string;
  productType: ProductType;
  nameAr: string;
  nameEn?: string;
  active: boolean;
  purchaseSatin: number;
  purchaseMoubara: number;
  rentalSatin: number;
  rentalMoubara: number;
};

export type ShopSettings = {
  acceptingOrders: boolean;
  purchaseEnabled: boolean;
  rentalEnabled: boolean;
  maintenanceMode: boolean;
  cashAtStoreEnabled: boolean;
  bankTransferEnabled: boolean;
  cashTransferAgencyEnabled: boolean;
  depositPaymentEnabled: boolean;
  fullPaymentEnabled: boolean;
  paymentDeadlineHours: number;
  depositPercentage: number;
};

export type OrderRules = {
  purchasePreparationDays: number;
  rentalAdvanceHours: number;
  urgentOrdersEnabled: boolean;
  urgentMinimumHours: number;
};

export type DeliveryCity = {
  id: string;
  name: string;
  price: number;
  active: boolean;
};
