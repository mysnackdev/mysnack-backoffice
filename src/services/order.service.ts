import { DataSnapshot, onValue, ref, update, Unsubscribe } from "firebase/database";
import { db } from "../../firebase";
import { Order } from "@/models";

export class OrderService {
  static updateOrder = async (
    orderKey: string,
    orderParams: { status: string }
  ): Promise<void> => {
    try {
      const orderRef = ref(db, `pedidos/${orderKey}`);
      const status = Order.toDTO(orderParams.status);
      await update(orderRef, { status });
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Erro ao atualizar pedido:", error.message);
        throw new Error("Erro ao atualizar pedido. Tente novamente.");
      }
      console.error("Erro ao atualizar pedido:", error);
      throw new Error("Erro ao atualizar pedido. Tente novamente.");
    }
  };

  static trackOrders = (callback: (snapshot: DataSnapshot) => void): Unsubscribe => {
    const ordersRef = ref(db, "pedidos");
    return onValue(ordersRef, callback);
  };
}
