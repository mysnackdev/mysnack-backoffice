"use client";

import AdvanceCancelButtons from "@/components/AdvanceCancelButtons";

type Props = {
  status: string;
  orderId: string;
  className?: string;
};

export default function StatusBadgeWithActions({ status, orderId, className }: Props) {
  return (
    <div className={`flex flex-col items-end gap-2 ${className || ""}`}>
      <span className="text-xs px-2 py-1 rounded-full border">{status}</span>
      <AdvanceCancelButtons orderId={orderId} status={status} />
    </div>
  );
}
