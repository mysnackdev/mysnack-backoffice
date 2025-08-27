export const ORDER_STATUS_FLOW = [
  "pedido realizado",
  "pedido confirmado",
  "pedido sendo preparado",
  "pedido pronto",
  "pedido indo até você",
  "pedido entregue",
] as const;

export type OrderStatus = (typeof ORDER_STATUS_FLOW)[number];

// Type guard opcional (útil em outros pontos do código)
export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUS_FLOW as readonly string[]).includes(value);
}

export function nextOrderStatus(current: string): OrderStatus | null {
  const idx = (ORDER_STATUS_FLOW as readonly string[]).indexOf(current);
  if (idx < 0) return ORDER_STATUS_FLOW[0];
  if (idx >= ORDER_STATUS_FLOW.length - 1) return null;
  return ORDER_STATUS_FLOW[idx + 1];
}
