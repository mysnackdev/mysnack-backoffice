// src/app/payment-methods/page.tsx
"use client";

import React from "react";
import DashboardShell from "@/components/DashboardShell";
import { db } from "@/firebase";
import { onValue, ref, update } from "firebase/database";
import { useAuth } from "@/context/AuthContext";

type PaymentState = {
  onDelivery: string[];    // Vale-refeição, Outros, Débito, Crédito
  appSite: string[];       // Carteira Digital
  mysnackAwards: string[]; // MySnack Premiação (verde)
  banking: string[];       // Pix, Nubank
};

const DEFAULT_STATE: PaymentState = {
  onDelivery: [],
  appSite: [],
  mysnackAwards: [],
  banking: [],
};

// Chips -------------------------------------------------------------
function Chip(props: { label: string; checked: boolean; onToggle: () => void }) {
  const { label, checked, onToggle } = props;
  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        "rounded-full border px-4 py-2 text-sm font-medium transition",
        checked
          ? "border-rose-500 bg-rose-50 text-rose-700"
          : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50",
      ].join(" ")}
      aria-pressed={checked}
    >
      {label}
    </button>
  );
}

function GreenChip(props: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      {props.label}
    </span>
  );
}

function Section(props: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-white p-6">
      <h3 className="text-xl font-semibold text-zinc-900">{props.title}</h3>
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {props.children}
      </div>
    </section>
  );
}

// Opções ------------------------------------------------------------
const onDeliveryOptions = ["Crédito", "Débito", "Vale-refeição", "Outros"];
const appSiteOptions = ["Carteira Digital"];
const mysnackAwardsOptions = ["Cupom MySnack", "Cashback", "Selo Fidelidade"];
const bankingOptions = ["Pix", "Nubank"];

// Página ------------------------------------------------------------
export default function PaymentMethodsPage() {
  const { user } = useAuth();
  const [saving, setSaving] = React.useState(false);
  const [state, setState] = React.useState<PaymentState>(DEFAULT_STATE);

  // Carrega do RTDB por tenant
  React.useEffect(() => {
    if (!user) return;
    const r = ref(db, `backoffice/tenants/${user.uid}/payments`);
    return onValue(r, (snap) => {
      if (!snap.exists()) return;
      const v = snap.val() as Partial<PaymentState>;
      setState((s) => ({
        ...s,
        onDelivery: Array.isArray(v.onDelivery) ? v.onDelivery : s.onDelivery,
        appSite: Array.isArray(v.appSite) ? v.appSite : s.appSite,
        mysnackAwards: Array.isArray(v.mysnackAwards) ? v.mysnackAwards : s.mysnackAwards,
        banking: Array.isArray(v.banking) ? v.banking : s.banking,
      }));
    });
  }, [user]);

  function toggle<K extends keyof PaymentState>(key: K, label: string) {
    setState((s) => {
      const has = s[key].includes(label);
      const next = has ? s[key].filter((x) => x !== label) : [...s[key], label];
      return { ...s, [key]: next } as PaymentState;
    });
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    try {
      await update(ref(db, `backoffice/tenants/${user.uid}/payments`), state);
    } finally {
      setSaving(false);
    }
  }

  const acceptRecommendations = () => {
    const recOnDelivery = ["Crédito", "Débito"];
    setState((s) => ({
      ...s,
      onDelivery: Array.from(new Set([...s.onDelivery, ...recOnDelivery])),
      banking: Array.from(new Set([...s.banking, "Pix"])),
    }));
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            Configurações de Forma de Pagamento
          </h1>
        </div>

        {/* Destaque com recomendações */}
        <div className="rounded-2xl border bg-gradient-to-br from-zinc-900 to-zinc-800 text-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="mt-1 h-3 w-3 rounded-full bg-rose-400" />
              <div>
                <p className="text-base font-medium">
                  Recomendação MySnack: habilite pagamentos mais populares
                </p>
                <p className="text-sm text-white/80">
                  Ative crédito, débito e Pix para aumentar a conversão.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={acceptRecommendations}
              className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
            >
              Aceitar recomendações
            </button>
          </div>
        </div>

        {/* Recebendo no balcão/na entrega */}
        <Section title="Recebendo no balcão/na entrega">
          {onDeliveryOptions.map((label) => (
            <Chip
              key={label}
              label={label}
              checked={state.onDelivery.includes(label)}
              onToggle={() => toggle("onDelivery", label)}
            />
          ))}
        </Section>

        {/* Pagamento por app/site (opcional/oculto com markup válido) */}
        {false && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-zinc-900">Pagamento por app/site</h2>
            <Section title="Carteira Digital">
              {/* itens de Carteira Digital ocultos */}
              {appSiteOptions.map((label) => (
                <Chip
                  key={label}
                  label={label}
                  checked={state.appSite.includes(label)}
                  onToggle={() => toggle("appSite", label)}
                />
              ))}
            </Section>
          </div>
        )}

        {/* MySnack Premiação (verde) (oculta) */}
        {false && (
          <section className="rounded-2xl border bg-white p-6">
            <h3 className="text-xl font-semibold text-zinc-900">MySnack Premiação</h3>
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {mysnackAwardsOptions.map((label) => (
                <GreenChip key={label} label={label} />
              ))}
            </div>
          </section>
        )}

        {/* Bancos / Pix */}
        <section className="rounded-2xl border bg-white p-6">
          <h3 className="text-xl font-semibold text-zinc-900">Bancos & Pix</h3>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {bankingOptions.map((label) => (
              <Chip
                key={label}
                label={label}
                checked={state.banking.includes(label)}
                onToggle={() => toggle("banking", label)}
              />
            ))}
          </div>
        </section>

        <div className="flex items-center justify-center py-8">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-2xl bg-rose-600 px-8 py-3 text-white text-[15px] font-semibold hover:bg-rose-700 disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </div>
    </DashboardShell>
  );
}
