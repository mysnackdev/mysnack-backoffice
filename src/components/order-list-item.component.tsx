"use client";
import { Order } from "@/models";

export const OrderListItem = ({ item }: { item: Order }) => {
  const color = item.status.color;
  const created = item.createdAt ? new Date(item.createdAt).toLocaleString("pt-BR") : "";

  return (
    <li className="flex flex-col p-4 rounded-xl shadow mb-3 border bg-white">
      <div className="flex justify-between mb-3 border-b border-primary-100 pb-3">
        <div>
          <p className="text-xs text-muted-foreground">Cliente</p>
          <p className="font-bold">{item.user.name || "(sem nome)"}</p>
        </div>
        <div className="text-right text-xs text-muted-foreground">{created}</div>
      </div>

      <div className="flex justify-between items-center">
        <p>Status:</p>
        <p className={`font-bold text-sm px-1.5 py-0.5 rounded-xl ms-2 ${color} text-white`}>
          {item.status.label}
        </p>
      </div>

      {item.onClick && (
        <div className="border-t border-primary-100 mt-3 pt-3 flex justify-end gap-2">
          <button
            className="rounded-md border px-3 py-1 text-xs font-semibold"
            onClick={() => item.onClick?.("prev")}
          >
            Voltar
          </button>
          <button
            className="rounded-md border px-3 py-1 text-xs font-semibold"
            onClick={() => item.onClick?.("next")}
          >
            Avançar
          </button>
          <button
            className="rounded-md border px-3 py-1 text-xs font-semibold text-red-600"
            onClick={() => item.onClick?.("cancel")}
          >
            Cancelar
          </button>
</div>
      )}
    </li>
  );
};