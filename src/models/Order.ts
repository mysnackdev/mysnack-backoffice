import { OrderResponse } from "@/@types";
import { nextOrderStatus, prevOrderStatus } from "@/constants/order-status";
import { setOrderStatus, cancelOrder } from "@/services/order.service";

export class Order {
  public user: { name: string };
  public status: { color: string; label: string };
  public createdAt?: number;
  public cancelled?: boolean;
  public onClick: ((action?: "prev" | "next" | "cancel") => Promise<void>) | null;
  public data: OrderResponse;

  constructor(data: OrderResponse) {
    this.data = data;
    this.user = { name: data.nome };
    this.createdAt = data.createdAt ?? 0;
    this.cancelled = !!data.cancelled;
    this.status = this.resolveStatus(data.status, this.cancelled);
    this.onClick = Order.handleStatusChange(data);
  }

  private resolveStatus(status: string, cancelled: boolean) {
    if (cancelled) return { color: "bg-red-600", label: "Cancelado" };
    const st = Order.ORDER_STATUS;
    return st[status] || { color: "bg-slate-400", label: status };
  }

  static handleStatusChange(data: OrderResponse) {
    return async (action?: "prev" | "next" | "cancel") => {
      if (action === "cancel") {
        await cancelOrder(data.key);
        return;
      }
      if (action === "prev") {
        const prev = prevOrderStatus(data.status);
        if (!prev) return;
        await setOrderStatus(data.key, prev);
        return;
      }
      const next = nextOrderStatus(data.status);
      if (!next) return;
      await setOrderStatus(data.key, next);
    };
  }

  static ORDER_STATUS: Record<string, { color: string; label: string }> = {
    "pedido realizado": { color: "bg-slate-500", label: "Pedido realizado" },
    "pedido confirmado": { color: "bg-blue-500", label: "Pedido confirmado" },
    "pedido sendo preparado": { color: "bg-amber-500", label: "Sendo preparado" },
    "pedido pronto": { color: "bg-green-600", label: "Pronto" },
    "pedido indo até você": { color: "bg-indigo-500", label: "Indo até você" },
    "pedido entregue": { color: "bg-emerald-600", label: "Entregue" },
  };
}
