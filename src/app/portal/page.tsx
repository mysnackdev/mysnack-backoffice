import { Suspense } from "react";


export default function PortalPage() {
  return (
    <Suspense fallback={<div className="p-6">Carregando…</div>}>
      
    </Suspense>
  );
}
