// NOTE: A partir de 2025-09-24, métodos de pagamento são opcionais e não bloqueiam ficar online.
// src/components/shopping/PaymentsCard.tsx
"use client";

import React from "react";
import { onValue, ref } from "firebase/database";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../../../firebase";
import { ShoppingPayments, defaultPayments } from "@/types/payments";
import { Toaster, toast } from "@/components/ui/toast";

function Chip({ active, onToggle, children }: { active?: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        "rounded-full border px-4 py-2 text-sm transition",
        active ? "bg-rose-600 text-white border-rose-600" : "bg-white text-neutral-700 border-neutral-300",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function PaymentsCard({ slug }: { slug: string }) {
  const [payments, setPayments] = React.useState<ShoppingPayments>(defaultPayments);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const unsubscribe = onValue(
      ref(db, `backoffice/shoppings/${slug}/payments`),
      (snap) => {
        setPayments(snap.val() || defaultPayments);
        setLoading(false);
      },
      (err) => {
        console.error('payments/onValue error', err);
        setError('Sem permissão para ler pagamentos ou caminho inválido.');
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [slug]);

  const toggle = (path: string) => {
    setPayments((p) => {
      const next: any = JSON.parse(JSON.stringify(p || defaultPayments));
      const parts = path.split(".");
      let cur = next;
      for (let i = 0; i < parts.length - 1; i++) cur = (cur[parts[i]] ??= {});
      const leaf = parts[parts.length - 1];
      cur[leaf] = !cur[leaf];
      return next;
    });
  };

  const save = async () => {
    const fn = httpsCallable(functions, "setShoppingPayments");
    await fn({ slug, payments });
    toast.success("Formas de pagamento salvas.");
  };

  return (
    <section className="border rounded-2xl p-4 space-y-4">
      <Toaster />
      <div className="text-lg font-semibold">Formas de pagamento</div>
      {loading ? (<div className="text-xs text-neutral-500">Sincronizando…</div>) : null}
      {error ? (<div className="text-xs text-rose-600">{error}</div>) : null}

      <div className="space-y-2">
        <div className="font-medium">Recebendo no balcão/na entrega</div>
        <div className="flex flex-wrap gap-3">
          <Chip active={!!payments.counter?.credit} onToggle={() => toggle("counter.credit")}>Crédito</Chip>
          <Chip active={!!payments.counter?.debit} onToggle={() => toggle("counter.debit")}>Débito</Chip>
          <Chip active={!!payments.counter?.voucher} onToggle={() => toggle("counter.voucher")}>Vale-refeição</Chip>
          <Chip active={!!payments.counter?.other} onToggle={() => toggle("counter.other")}>Outros</Chip>
        </div>
      </div>

      <div className="space-y-2">
        <div className="font-medium">Bancos & Pix</div>
        <div className="flex flex-wrap gap-3">
          <Chip active={!!payments.bank?.pix} onToggle={() => toggle("bank.pix")}>Pix</Chip>
          <Chip active={!!payments.bank?.banks?.nubank} onToggle={() => toggle("bank.banks.nubank")}>Nubank</Chip>
        </div>
      </div>

      <div>
        <button onClick={save} className="rounded-full bg-rose-600 text-white px-5 py-2">Salvar alterações</button>
      </div>

      <p className="text-xs text-neutral-500">Definido no shopping e espelhado para todas as lojas deste shopping.</p>
    </section>
  );
}
