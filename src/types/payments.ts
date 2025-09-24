export type ShoppingPayments = {
  counter?: { credit?: boolean; debit?: boolean; voucher?: boolean; other?: boolean };
  bank?: { pix?: boolean; banks?: Record<string, boolean> };
  updatedAt?: number; updatedBy?: string;
};

export const defaultPayments: ShoppingPayments = {
  counter: { credit: false, debit: false, voucher: false, other: false },
  bank: { pix: false, banks: { nubank: false } },
};
