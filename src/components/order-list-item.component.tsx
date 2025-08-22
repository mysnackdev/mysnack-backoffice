import { Order } from "@/models";

export const OrderListItem = ({ item }: { item: Order }) => {
  const color = item.status.color;

  return (
    <li className="flex flex-col p-4 rounded-xl shadow mb-3">
      <div className="flex justify-between mb-3 border-b border-primary-100 pb-3">
        <p>Cliente</p>
        <p className="font-bold">{item.user.name}</p>
      </div>

      <div className="flex justify-between items-center">
        <p>Status:</p>
        <p
          className={`font-bold text-sm px-1.5 py-0.5 rounded-xl ms-2 ${color} text-white`}
        >
          {item.status.label}
        </p>
      </div>

      {item.onClick && (
        <div className="border-t border-primary-100 mt-3">
          <button
            className="bg-primary text-secondary rounded-xl p-1 font-bold cursor-pointer mt-3 w-full"
            onClick={item.onClick}
          >
            Avançar
          </button>
        </div>
      )}
    </li>
  );
};
