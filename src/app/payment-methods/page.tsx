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
  mysnackAwards: [
    "Saldo Alimentação + Refeição",
    "MySnack Pago Pré",
    "Saldo Comer No MySnack",
    "MySnack Pago Crédito Consignado",
    "Limite MySnack Pago",
    "MySnack Saldo Livre",
    "MySnack Pago Crédito",
  ],
  banking: [],
};

function Chip({
  checked,
  label,
  onToggle,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={
        "flex items-center justify-between rounded-2xl border px-4 py-3 text-[15px] " +
        (checked ? "border-rose-300 bg-rose-50" : "border-zinc-200 bg-white hover:bg-zinc-50")
      }
    >
      <span className="flex items-center gap-3">
        <span
          className={
            "grid h-5 w-5 place-items-center rounded-full border " +
            (checked ? "border-rose-600" : "border-zinc-400")
          }
        >
          <span className={"h-2.5 w-2.5 rounded-full " + (checked ? "bg-rose-600" : "bg-transparent")} />
        </span>
        {label}
      </span>
    </button>
  );
}

function GreenChip({ label }: { label: string }) {
  return (
    <div className="rounded-2xl bg-emerald-50 text-emerald-700 px-4 py-3 text-[15px] border border-emerald-200 flex items-center gap-2">
      <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-600 text-white text-[12px]">✓</span>
      {label}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-white p-6">
      <h3 className="text-xl font-semibold text-zinc-900">{title}</h3>
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {children}
      </div>
    </section>
  );
}

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
        onDelivery: v.onDelivery ?? s.onDelivery,
        appSite: v.appSite ?? s.appSite,
        mysnackAwards: v.mysnackAwards ?? s.mysnackAwards,
        banking: v.banking ?? s.banking,
      }));
    });
  }, [user]);

  // ✅ evita no-unused-expressions (if/else em vez de operador ternário só com efeito colateral)
  const toggle = (bucket: keyof PaymentState, label: string) =>
    setState((s) => {
      const set = new Set(s[bucket]);
      if (set.has(label)) {
        set.delete(label);
      } else {
        set.add(label);
      }
      return { ...s, [bucket]: Array.from(set) } as PaymentState;
    });

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await update(ref(db, `backoffice/tenants/${user.uid}/payments`), state);
      await update(ref(db, `backoffice/tenants/${user.uid}/storeProfile`), {
        updatedAt: Date.now(),
      });
    } finally {
      setSaving(false);
    }
  };

  // Listas (ajuste conforme quiser)
  const valeRefeicao = [
    "Green Card Refeição",
    "Verocard",
    "Ben Refeição",
    "Valecard",
    "VR Refeição",
    "Pluxee Refeição (Sodexo Refeição)",
    "Ticket",
    "Alelo Refeição",
    "Nutricard Refeição",
    "Banricard Refeição",
  ];
  const outros = ["Dinheiro", "Cheque"];
  const debito = ["Visa", "Mastercard", "Elo", "Banricompras"];
  const credito = ["Nugo", "Hipercard", "Banricompras", "Visa", "Elo", "Good Card", "Amex", "Mastercard"];
  const carteiraDigital = ["Visa", "Visa Débito", "Visa", "Mastercard", "Elo Débito", "Saldo Da Carteira"];
  const bankingOptions = ["Pix", "Nubank"]; // ✅ usado abaixo (não dá warning)

  // Sugestão simples para o botão "Aceitar recomendações"
  const acceptRecommendations = () => {
    const recOnDelivery = ["Dinheiro", "Visa", "Mastercard", "VR Refeição", "Alelo Refeição"];
    setState((s) => ({
      ...s,
      onDelivery: Array.from(new Set([...s.onDelivery, ...recOnDelivery])),
      // exemplo: habilitar Pix por padrão
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
          {/* opcional: mostrar o nome da loja aqui, se você quiser puxar do contexto */}
        </div>

        <div className="rounded-2xl border bg-gradient-to-br from-zinc-900 to-zinc-800 text-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-rose-500/20 text-rose-200">⚡️</div>
              <div>
                <div className="text-lg font-semibold">Tenha diversas opções de pagamento para vender mais</div>
                <p className="mt-1 text-sm text-white/80 max-w-3xl">
                  Recomendamos aceitar dinheiro, vale-refeição, cartões de crédito e débito.
                  Essas formas de pagamento <b>são utilizadas por 9 em cada 10 clientes</b> da sua região.
                  Você poderá alterar estes dados depois.
                </p>
              </div>
            </div>
            <button
              onClick={acceptRecommendations}
              className="rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20"
            >
              Aceitar recomendações
            </button>
          </div>
        </div>

        {/* Pagamento na entrega */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-zinc-900">Pagamento na entrega</h2>

          <Section title="Vale-refeição">
            {valeRefeicao.map((label) => (
              <Chip
                key={label}
                label={label}
                checked={state.onDelivery.includes(label)}
                onToggle={() => toggle("onDelivery", label)}
              />
            ))}
          </Section>

          <Section title="Outros">
            {outros.map((label) => (
              <Chip
                key={label}
                label={label}
                checked={state.onDelivery.includes(label)}
                onToggle={() => toggle("onDelivery", label)}
              />
            ))}
          </Section>

          <Section title="Débito">
            {debito.map((label) => (
              <Chip
                key={label}
                label={label}
                checked={state.onDelivery.includes(label)}
                onToggle={() => toggle("onDelivery", label)}
              />
            ))}
          </Section>

          <Section title="Crédito">
            {credito.map((label) => (
              <Chip
                key={label}
                label={label}
                checked={state.onDelivery.includes(label)}
                onToggle={() => toggle("onDelivery", label)}
              />
            ))}
          </Section>
        </div>

        {/* Pagamento por app/site */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-zinc-900">Pagamento por app/site</h2>
          <Section title="Carteira Digital">
            {carteiraDigital.map((label, i) => {
              // Mantém identificadores únicos para rótulos repetidos
              const id = `${label}#${i}`;
              return (
                <Chip
                  key={id}
                  label={label}
                  checked={state.appSite.includes(id)}
                  onToggle={() => toggle("appSite", id)}
                />
              );
            })}
          </Section>
        </div>

        {/* MySnack Premiação (verde) */}
        <section className="rounded-2xl border bg-white p-6">
          <h3 className="text-xl font-semibold text-zinc-900">MySnack Premiação</h3>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {state.mysnackAwards.map((label) => (
              <GreenChip key={label} label={label} />
            ))}
          </div>
        </section>

        {/* Pix / Nubank */}
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
