// src/components/StoreStatusToolbar.tsx
"use client";

function canToggleOnline(): boolean {
  // Nova regra: permitir ficar online sem métodos de pagamento configurados.
  return true;
}



import React, { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/firebase";
import { setTenantOnlineCF } from "@/services/admin.service";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/toast";

type Setup = "configurado" | "em_configuracao";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type StoreDoc = { status?: { online?: boolean; cadastroCompleto?: boolean; _setup?: Setup; onlineReason?: string | null }; shoppingSlug?: string | null; approved?: boolean; suspended?: boolean };

function Dot({ on }: { on: boolean }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{ backgroundColor: on ? "#16a34a" : "#9ca3af" }}
    />
  );
}

function reasonText(code?: string | null): string {
  if (!code) return "";
  switch (code) {
    case "missing-shopping": return "Escolha um shopping";
    case "awaiting-approval": return "Aguardando aprovação do shopping";
    case "suspended": return "Loja suspensa pelo shopping";
    case "denied": return "Regras não atendidas para ficar online";
    case "incomplete-setup": return "Complete as etapas obrigatórias";
    default: return code;
  }
}

export default function StoreStatusToolbar() {
  const { user } = useAuth();
  const uid = user?.uid;

  const [online, setOnline] = useState(false);
  const [cadastroCompleto, setCadastroCompleto] = useState(false);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_setup, setSetup] = useState<Setup>("em_configuracao");
  const [shoppingSlug, setShoppingSlug] = useState<string | null>(null);
  const [suspended, setSuspended] = useState<boolean>(false);
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    const r = ref(db, `backoffice/tenants/${uid}`);
    const off = onValue(r, (snap) => {
      const base = (snap.val() || {}) as StoreDoc;
      const st = base.status || {};
      setOnline(Boolean(st.online));
      setCadastroCompleto(Boolean(st.cadastroCompleto));
      setSetup((st._setup as Setup) || "em_configuracao");
      setShoppingSlug(base.shoppingSlug || null);
      
      setSuspended(Boolean(base.suspended));
      setReason(st.onlineReason || null);
    });
    return () => off();
  }, [uid]);


  async function toggleOnline() {
    if (!uid) return;
    // Guardas de pré-requisito: mostrar alerta mas não bloquear o clique
    if (!shoppingSlug) { toast.error("Escolha um shopping para ficar online"); return; }
    if (!cadastroCompleto) { toast.error("Finalize o cadastro para ativar a loja"); return; }
    await setTenantOnlineCF({ storeId: uid, online: !online });
  }

  return (
    <div className="flex items-center gap-2">
      <Dot on={online} />
      <button
        onClick={() => canToggleOnline() && toggleOnline()}
        
        title={
          reason
            ? reasonText(reason)
            : !cadastroCompleto
            ? "Finalize o cadastro para ativar a loja"
            : !shoppingSlug
            ? "Escolha um shopping"
            : suspended
            ? "Loja suspensa pelo shopping": ""
        }
        className="rounded-lg px-3 py-2 text-sm border hover:bg-zinc-50 disabled:opacity-60"
      >
        {online ? "Ficar offline" : "Ficar online"}
      </button>

      {!online && reason ? (
        <div className="text-xs inline-flex items-center gap-2 rounded-md border px-2 py-1 bg-zinc-50">
          <span>Motivo:</span>
          <span>{reasonText(reason)}</span>
        </div>
      ) : null}
    </div>
  );
}