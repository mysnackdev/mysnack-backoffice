// src/components/StoreStatusToolbar.tsx
"use client";

import React, { useEffect, useState } from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "../../firebase";
import { useAuth } from "@/context/AuthContext";

type StoreStatus = {
  online?: boolean;
  cadastroCompleto?: boolean;
  setup?: "configurado" | "em_configuracao";
  setupUpdatedAt?: number;
};

function Dot({ on }: { on: boolean }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{ backgroundColor: on ? "#16a34a" : "#9ca3af" }}
    />
  );
}

export default function StoreStatusToolbar() {
  const { user } = useAuth();
  const [online, setOnline] = useState(false);
  const [cadastroCompleto, setCadastroCompleto] = useState(false);

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    const r = ref(db, `backoffice/stores/${uid}/status`);

    const off = onValue(r, (s) => {
      const raw = s.val() as unknown;
      const v: Partial<StoreStatus> =
        raw && typeof raw === "object" ? (raw as Partial<StoreStatus>) : {};
      setOnline(!!v.online);
      setCadastroCompleto(!!v.cadastroCompleto);
    });

    return () => off();
  }, [user]);

  async function toggle() {
    if (!user) return;
    if (!cadastroCompleto) {
      alert("Finalize o cadastro para ficar online.");
      return;
    }
    await update(ref(db, `backoffice/stores/${user.uid}/status`), {
      online: !online,
    });
  }

  return (
    <div className="flex items-center gap-3">
      <span
        className={
          "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium " +
          (online ? "bg-green-100 text-green-700" : "bg-zinc-100 text-zinc-700")
        }
      >
        <Dot on={online} /> {online ? "Online" : "Offline"}
      </span>

      <button
        onClick={toggle}
        disabled={!cadastroCompleto}
        title={cadastroCompleto ? "" : "Finalize o cadastro para ativar a loja"}
        className="rounded-lg px-3 py-2 text-sm border hover:bg-zinc-50 disabled:opacity-60"
      >
        {online ? "Ficar offline" : "Ficar online"}
      </button>
    </div>
  );
}
