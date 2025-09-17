"use client";
import React from "react";
import { onValue, ref, get } from "firebase/database";
import { db } from "../../../firebase";
import { useAuth } from "@/context/AuthContext";
import { approveOperatorCF, suspendOperatorCF, getUsersBasicCF } from "@/services/operator.service";

type Operator = {
  uid: string;
  approved?: boolean;
  invitedAt?: number;
  email?: string;
  name?: string;
  phone?: string;
};

export default function OperatorsCard() {
  const { user } = useAuth();
  const [storeId, setStoreId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [ops, setOps] = React.useState<Operator[]>([]);

  // Resolve storeId: se houver backoffice/users/{uid}/storeId usa ele; caso contrário usa o próprio uid (dono).
  React.useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    (async () => {
      try {
        const snap = await get(ref(db, `backoffice/users/${uid}/storeId`));
        const sId = snap.exists() ? String(snap.val()) : uid;
        setStoreId(sId);
      } catch {
        setStoreId(uid);
      }
    })();
  }, [user]);

  // Assina operadores do tenant
  React.useEffect(() => {
    if (!storeId) return;
    const r = ref(db, `backoffice/tenants/${storeId}/operators`);
    const off = onValue(r, async (snap) => {
      const v = (snap.val() || {}) as Record<string, { approved?: boolean; invitedAt?: number; requestedAt?: number; email?: string }>;
      const list = Object.keys(v).map((uid) => ({
        uid,
        approved: !!v[uid]?.approved,
        invitedAt: v[uid]?.invitedAt || v[uid]?.requestedAt || 0,
        email: v[uid]?.email || "",
      })) as Operator[];

      if (list.length > 0) {
        try {
          const map = await getUsersBasicCF(list.map((o) => o.uid));
          setOps(
            list
              .map((o) => ({
                ...o,
                name: map[o.uid]?.name || o.name,
                email: map[o.uid]?.email || o.email,
                phone: map[o.uid]?.phone || o.phone,
              }))
              .sort((a, b) => (Number(!!a.approved) - Number(!!b.approved)) || (a.invitedAt || 0) - (b.invitedAt || 0))
          );
        } catch {
          setOps(list);
        }
      } else {
        setOps([]);
      }
      setLoading(false);
    });
    return () => off();
  }, [storeId]);

  async function approve(op: Operator) {
    if (!storeId) return;
    await approveOperatorCF({ operatorUid: op.uid, storeId });
  }

  async function suspend(op: Operator) {
    if (storeId && op.uid === storeId) { alert('Não é possível suspender a conta de operação desta loja.'); return; }
    if (!storeId) return;
    await suspendOperatorCF({ operatorUid: op.uid, storeId });
  }

  const isOperacao = (uid: string) => storeId && uid === storeId;

  return (
    <section className="rounded-xl border p-4">
      <h2 className="text-lg font-semibold">Funcionários / Operadores</h2>
      <p className="mb-4 text-sm text-zinc-600">
        Pessoas vinculadas ao seu CNPJ. Aprove ou suspenda acessos.
      </p>

      {loading ? (
        <div className="text-sm text-zinc-500">Carregando operadores…</div>
      ) : ops.length === 0 ? (
        <div className="text-sm text-zinc-500">Nenhum operador encontrado.</div>
      ) : (
        <div className="space-y-3">
          {ops.map((op) => (
            <div key={op.uid} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{op.name || op.email || op.uid}</div>
                  <div className="text-xs text-zinc-500">{op.email || "—"}</div>
                  {op.phone && <div className="text-xs text-zinc-500">{op.phone}</div>}
                  <div className="mt-1 text-xs">
                    Status:{" "}
                    {op.approved ? (!isOperacao(op.uid) ? (
                      <span className="text-emerald-600">aprovado</span>
                    ) : null) : (
                      <span className="text-amber-600">aguardando aprovação</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {op.approved ? (!isOperacao(op.uid) ? (
                    <button
                      className="rounded-md border px-3 py-1 text-sm hover:bg-rose-50"
                      onClick={() => suspend(op)}
                    >
                      Suspender
                    </button>
                  ) : null) : (
                    <button
                      className="rounded-md border px-3 py-1 text-sm hover:bg-emerald-50"
                      onClick={() => approve(op)}
                    >
                      Aprovar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
