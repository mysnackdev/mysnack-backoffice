export type OrderStatus =
  | "pedido realizado"
  | "pedido confirmado"
  | "pedido sendo preparado"
  | "pedido pronto"
  | "pedido indo até você"
  | "pedido entregue"
  | "pedido cancelado"
  | string;

export type MoneyLike = number | string | null | undefined;

export type ProductRef = {

  name?: string | null;
  price?: MoneyLike;
  label?: string | null;
  [key: string]: unknown;
};

export type DeliveryRef = { fee?: MoneyLike; [key: string]: unknown };
export type FeesRef = { service?: MoneyLike; [key: string]: unknown };


export type OrderItemOption = {
  name?: string | null;
  value?: string | number | boolean | null;
  [key: string]: unknown;
};

export type OrderItem = {
  id?: string;
  name?: string | null;
  title?: string | null;
  productName?: string | null;
  label?: string | null;
  quantity?: number | null;
  price?: MoneyLike;
  qty?: number | null;
  product?: ProductRef | null;
  options?: Record<string, unknown> | OrderItemOption[] | null;
  [key: string]: unknown;
};

export type OrderLike = {
  id?: string;
  items?: OrderItem[] | Record<string, OrderItem> | null;
  [key: string]: unknown;

  // common fields used across UI derivations
  delivery?: DeliveryRef | null;
  fees?: FeesRef | null;

  deliveryFee?: MoneyLike;
  frete?: MoneyLike;
  shippingFee?: MoneyLike;

  serviceFee?: MoneyLike;
  taxa?: MoneyLike;

  discount?: MoneyLike;
  cupomDesconto?: MoneyLike;
  desconto?: MoneyLike;

  total?: MoneyLike;
  amount?: MoneyLike;
};

export type EnrichedOrderExtra = {
  userPhone?: string | null;
  userDocument?: string | null;
  userCity?: string | null;
  userState?: string | null;
  notes?: string | null;
  observations?: string | null;
  obs?: string | null;
  subtotal?: MoneyLike;
  serviceFee?: MoneyLike;
  deliveryFee?: MoneyLike;
  discount?: MoneyLike;
  grandTotal?: MoneyLike;
};
