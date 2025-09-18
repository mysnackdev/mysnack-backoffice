export const ORDER_FLOW = [
  "pedido realizado",
  "pedido confirmado",
  "pedido sendo preparado",
  "pedido pronto",
  "pedido indo até você",
  "pedido entregue",
] as const;

export type OrderStatus = typeof ORDER_FLOW[number] | "cancelado";

export function nextStatus(current: string): OrderStatus | null {
  const i = (ORDER_FLOW as readonly string[]).indexOf(current);
  if (i === -1) return ORDER_FLOW[0];
  if (i >= ORDER_FLOW.length - 1) return null;
  return ORDER_FLOW[i + 1];
}

export function isTerminal(status?: string) {
  return status === "cancelado" || status === "pedido entregue";
}
