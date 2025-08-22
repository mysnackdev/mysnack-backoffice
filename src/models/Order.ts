import { OrderResponse } from "@/@types";
import { OrderService } from "@/services";

export class Order {
  public user: {
    name: string;
  };
  public status: {
    color: string;
    label: string;
  };
  public onClick: (() => Promise<void>) | null;

  constructor(data: OrderResponse) {
    this.user = { name: data.nome };
    this.status = Order.ORDER_STATUS[data.status];
    this.onClick =
      data.status.toLowerCase().trim() !== "pronto"
        ? async () => {
            await OrderService.updateOrder(data.key, {
              status: data.status,
            });
          }
        : null;
  }

  static toDTO = (status: string): string => {
    const statuses: Record<string, string> = {
      "aguardando aceite": "aceito",
      aceito: "preparando pedido",
      "preparando pedido": "pronto",
    };

    return statuses[status];
  };

  static ORDER_STATUS: Record<string, { color: string; label: string }> = {
    aceito: {
      color: "bg-blue-500",
      label: "Aceito",
    },
    "preparando pedido": {
      color: "bg-orange-500",
      label: "Preparando pedido",
    },
    pronto: {
      color: "bg-green-500",
      label: "Pronto",
    },
    "aguardando aceite": {
      color: "bg-yellow-500",
      label: "Aguardando aceite",
    },
  };
}
