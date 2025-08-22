import { Order } from "@/models";
import { OrderListItem } from "./order-list-item.component";
import { EmptyState } from "./empty-state.component";
import { useOrder } from "@/hooks";
import { LoadingContainer } from "./loading-container.component";
import { useEffect } from "react";

export const Orders = () => {
  const { items, setup, loading } = useOrder();

  useEffect(() => {
    setup();
  }, [setup]);

  return (
    <div className="w-xl">
      <h1 className="text-2xl text-center font-bold p-3">Backoffice</h1>
      {loading ? (
        <LoadingContainer />
      ) : items && items.length ? (
        <ul>
          {items.map((elem: Order, index) => (
            <OrderListItem key={index} item={elem} />
          ))}
        </ul>
      ) : (
        <EmptyState />
      )}
    </div>
  );
};
