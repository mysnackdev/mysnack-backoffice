import { Suspense } from "react";
import PortalClient from "./PortalClient";

export default function PortalPage() {
  return (
    <Suspense fallback={<div className="p-6">Carregando…</div>}>
      <PortalClient />
    </Suspense>
  );
}
