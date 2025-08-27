export const ORDER_STATUS_FLOW = [
  "pedido realizado",
  "pedido confirmado",
  "pedido sendo preparado",
  "pedido pronto",
  "pedido indo até você",
  "pedido entregue",
] as const;

export type OrderStatus = typeof ORDER_STATUS_FLOW[number];

export function nextOrderStatus(current: string): string | null {
  const idx = ORDER_STATUS_FLOW.indexOf(current as any);
  if (idx < 0) return ORDER_STATUS_FLOW[0];
  if (idx >= ORDER_STATUS_FLOW.length - 1) return null;
  return ORDER_STATUS_FLOW[idx + 1];
}
