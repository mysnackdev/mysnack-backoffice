// src/app/finance/page.tsx
"use client";

import React from "react";
import { onValue, ref, update } from "firebase/database";
import { db } from "@/firebase";
import { syncSetupStatus } from "@/lib/completeness";
import DashboardShell from "@/components/DashboardShell";
import { Toaster, toast } from "@/components/ui/toast";
import { useAuth } from "@/context/AuthContext";

type FinanceData = {
  bankAccount: {
    holderName: string;
    cpfCnpj: string; // digits only
    bankCode: string; // 3 digits
    agency?: string;
    account: string;
    accountType: "corrente" | "poupanca" | "conta_pagamento";
    pixKeyType?: string;
    pixKey?: string;
  };
  payout: {
    provider: "manual" | "stripe" | "pagarme";
    automatic: boolean;
    cycle?: "semanal" | "mensal";
    dayOfWeek?: number; // 0-6
    dayOfMonth?: number; // 1-31
    minPayout?: number; // BRL
  };
  fees?: {
    serviceFeePercent?: number;
    cardFeePercent?: number;
    cardFeeFixed?: number;
    deliveryFeeSharePercent?: number;
  };
  fiscal?: {
    legalName?: string;
    companyType?: string;
    im?: string;
    cnae?: string;
    regimeTributario?: string;
    address?: {
      zip: string; // 8 digits
      city: string;
      state: string; // UF
      street?: string;
      number?: string;
      complement?: string;
      neighborhood?: string;
    };
  };
  updatedAt?: number;
};

function onlyDigits(s: string): string {
  return (s || "").replace(/\D+/g, "");
}

function maskCpfCnpj(d: string): string {
  const v = onlyDigits(d);
  if (v.length <= 11) {
    // CPF: 000.000.000-00
    return v
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  // CNPJ: 00.000.000/0000-00
  return v
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function validateFinance(form: FinanceData): string[] {
  const issues: string[] = [];
  const acc = form.bankAccount;
  const po = form.payout;

  if (!acc.holderName || acc.holderName.trim().length < 2) issues.push("Titular é obrigatório.");
  const cpf = onlyDigits(acc.cpfCnpj || "");
  if (!(cpf.length === 11 || cpf.length === 14)) issues.push("CPF/CNPJ deve conter 11 ou 14 dígitos.");
  if (!/^[0-9]{3}$/.test(acc.bankCode || "")) issues.push("Código do banco deve ter 3 dígitos.");
  if (!acc.account || acc.account.trim().length < 1) issues.push("Número da conta é obrigatório.");
  if (!acc.accountType) issues.push("Tipo de conta é obrigatório.");

  if (!po.provider) issues.push("Provedor de payout é obrigatório.");
  if (typeof po.automatic !== "boolean") issues.push("Defina se o payout é automático.");
  if (po.cycle === "semanal" && (po.dayOfWeek ?? -1) < 0) issues.push("Para ciclo semanal, informe o dia da semana (0-6).");
  if (po.cycle === "mensal" && (po.dayOfMonth ?? 0) < 1) issues.push("Para ciclo mensal, informe o dia do mês (1-31).");
  if (po.minPayout != null && Number(po.minPayout) < 0) issues.push("Mínimo para repasse não pode ser negativo.");

  const addr = form.fiscal?.address;
  if (addr?.zip && !/^\d{8}$/.test(addr.zip)) issues.push("CEP deve ter 8 dígitos.");
  if (addr?.zip && !addr?.city) issues.push("Cidade é obrigatória quando o CEP é informado.");
  if (addr?.zip && !(addr?.state || "").match(/^[A-Z]{2}$/)) issues.push("UF deve ter 2 letras (ex.: RJ).");

  const fees = form.fees || {};
  const percOk = (v?: number) => v == null || (v >= 0 && v <= 100);
  if (!percOk(fees.serviceFeePercent)) issues.push("% Serviço deve estar entre 0 e 100.");
  if (!percOk(fees.cardFeePercent)) issues.push("% Cartão deve estar entre 0 e 100.");
  if (fees.cardFeeFixed != null && fees.cardFeeFixed < 0) issues.push("R$ fixo cartão não pode ser negativo.");
  if (!percOk(fees.deliveryFeeSharePercent)) issues.push("% do frete deve estar entre 0 e 100.");

  return issues;
}

export default function FinancePage() {
  const { user } = useAuth();

  const [form, setForm] = React.useState<FinanceData>({
    bankAccount: {
      holderName: "",
      cpfCnpj: "",
      bankCode: "",
      agency: "",
      account: "",
      accountType: "corrente",
      pixKeyType: "",
      pixKey: "",
    },
    payout: {
      provider: "manual",
      automatic: false,
      cycle: "semanal",
      dayOfWeek: 5,
      minPayout: 0,
    },
    fees: {
      serviceFeePercent: 10,
      cardFeePercent: 3,
      cardFeeFixed: 0.49,
      deliveryFeeSharePercent: 0,
    },
    fiscal: {
      legalName: "",
      companyType: "",
      im: "",
      cnae: "",
      regimeTributario: "",
      address: {
        zip: "",
        city: "",
        state: "",
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
      },
    },
  });
  const [saving, setSaving] = React.useState(false);
  const [online, setOnline] = React.useState(false);
  const [showErrors, setShowErrors] = React.useState(false);
  const [lastUpdated, setLastUpdated] = React.useState<string>("");

  // carregar dados
  React.useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    const r = ref(db, `backoffice/tenants/${uid}/finance`);
    const off = onValue(r, (s) => {
      if (!s.exists()) return;
      const v = s.val() as Partial<FinanceData> & { updatedAt?: number };
      setForm((f) => ({
        ...f,
        ...v,
        bankAccount: { ...f.bankAccount, ...(v.bankAccount || {}) },
        payout: { ...f.payout, ...(v.payout || {}) },
        fees: { ...f.fees, ...(v.fees || {}) },
        fiscal: { ...f.fiscal, ...(v.fiscal || {}) },
      }));
      if (typeof v.updatedAt === "number") {
        const d = new Date(v.updatedAt);
        setLastUpdated(
          d.toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        );
      }
    });
    return () => off();
  }, [user]);

  // badge online/offline
  React.useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    const rStatus = ref(db, `backoffice/tenants/${uid}/status`);
    const offS = onValue(rStatus, (s) => {
      const val = (s.val() as { online?: boolean } | null) || {};
      setOnline(!!val.online);
    });
    return () => offS();
  }, [user]);

  // setField imutável por caminho "a.b.c"
  function setField(path: string, value: unknown) {
    setForm((curr) => {
      const clone: FinanceData = JSON.parse(JSON.stringify(curr)) as FinanceData;
      const parts = path.split(".");
      let obj: Record<string, unknown> = (clone as unknown) as Record<string, unknown>;
      for (let i = 0; i < parts.length - 1; i++) {
        const k = parts[i];
        const next = (obj[k] ?? {}) as Record<string, unknown>;
        obj[k] = next;
        obj = next;
      }
      obj[parts[parts.length - 1]] = value;
      return clone;
    });
  }

  function invalidMap(f: FinanceData): Record<string, string> {
    const issues = validateFinance(f);
    const map: Record<string, string> = {};
    for (const msg of issues) {
      if (/Titular/.test(msg)) map["holderName"] = msg;
      if (/CPF\/CNPJ/.test(msg)) map["cpfCnpj"] = msg;
      if (/código do banco|3 dígitos/i.test(msg)) map["bankCode"] = msg;
      if (/Número da conta/.test(msg)) map["account"] = msg;
      if (/Tipo de conta/.test(msg)) map["accountType"] = msg;
      if (/Provedor/.test(msg)) map["provider"] = msg;
      if (/automático/.test(msg)) map["automatic"] = msg;
      if (/semanal.*dia da semana/i.test(msg)) map["dayOfWeek"] = msg;
      if (/mensal.*dia do mês/i.test(msg)) map["dayOfMonth"] = msg;
      if (/Mínimo para repasse/.test(msg)) map["minPayout"] = msg;
      if (/% Serviço/.test(msg)) map["serviceFeePercent"] = msg;
      if (/% Cartão/.test(msg)) map["cardFeePercent"] = msg;
      if (/R\$ fixo cartão/.test(msg)) map["cardFeeFixed"] = msg;
      if (/% do frete/.test(msg)) map["deliveryFeeSharePercent"] = msg;
      if (/CEP/.test(msg)) map["zip"] = msg;
      if (/Cidade é obrigatória/.test(msg)) map["city"] = msg;
      if (/UF/.test(msg)) map["state"] = msg;
    }
    return map;
  }

  const invalid = invalidMap(form);

  const save = async () => {
    if (!user) return;
    const issues = validateFinance(form);
    if (issues.length) {
      setShowErrors(true);
      toast.error("Corrija os campos antes de salvar:\n\n• " + issues.join("\n• "));
      return;
    }
    setSaving(true);
    try {
      const uid = user.uid;

      // normalização: dígitos e números
      const normalized: FinanceData = {
        ...form,
        bankAccount: {
          ...form.bankAccount,
          cpfCnpj: onlyDigits(form.bankAccount.cpfCnpj),
        },
        payout: {
          ...form.payout,
          minPayout:
            form.payout.minPayout == null ? undefined : Number(form.payout.minPayout),
        },
        fees: form.fees
          ? {
              serviceFeePercent:
                form.fees.serviceFeePercent == null
                  ? undefined
                  : Number(form.fees.serviceFeePercent),
              cardFeePercent:
                form.fees.cardFeePercent == null
                  ? undefined
                  : Number(form.fees.cardFeePercent),
              cardFeeFixed:
                form.fees.cardFeeFixed == null
                  ? undefined
                  : Number(form.fees.cardFeeFixed),
              deliveryFeeSharePercent:
                form.fees.deliveryFeeSharePercent == null
                  ? undefined
                  : Number(form.fees.deliveryFeeSharePercent),
            }
          : undefined,
        fiscal: form.fiscal
          ? {
              ...form.fiscal,
              address: form.fiscal.address
                ? {
                    ...form.fiscal.address,
                    zip: onlyDigits(form.fiscal.address.zip || ""),
                  }
                : undefined,
            }
          : undefined,
      };

      const payload: FinanceData & { updatedAt: number } = {
        ...normalized,
        updatedAt: Date.now(),
      };

      await update(ref(db, `backoffice/tenants/${uid}/finance`), payload);
      await update(ref(db, `backoffice/tenants/${uid}/lastUpdated`), { finance: Date.now() });

      await syncSetupStatus(uid);
      toast.success("Configurações financeiras salvas.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Não foi possível salvar.\n" + msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Finance</h1>
            <p className="text-sm text-zinc-500">
              {lastUpdated ? <>Última atualização: {lastUpdated}</> : "Sem atualizações ainda"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={[
                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium border",
                online
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-zinc-200 bg-zinc-100 text-zinc-700",
              ].join(" ")}
            >
              <span
                className={[
                  "h-2 w-2 rounded-full",
                  online ? "bg-emerald-500" : "bg-zinc-400",
                ].join(" ")}
              />
              {online ? "Online" : "Offline"}
            </span>

            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar configurações"}
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Coluna esquerda (principal) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Conta bancária */}
            <section className="rounded-xl border bg-white p-6">
              <h2 className="text-lg font-semibold mb-4">Conta bancária</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="mb-1 block text-sm">Titular*</span>
                  <input
                    className={`w-full rounded-lg border px-3 py-2 ${showErrors && invalid["holderName"] ? "border-rose-500 ring-rose-200 focus:ring-rose-200" : ""}`}
                    value={form.bankAccount.holderName}
                    onChange={(e) => setField("bankAccount.holderName", e.target.value)}
                    title={showErrors && invalid["holderName"] ? invalid["holderName"] : undefined}
                    aria-invalid={(showErrors && !!invalid["holderName"]) || undefined}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">CPF/CNPJ*</span>
                  <input
                    className={`w-full rounded-lg border px-3 py-2 ${showErrors && invalid["cpfCnpj"] ? "border-rose-500 ring-rose-200 focus:ring-rose-200" : ""}`}
                    value={maskCpfCnpj(form.bankAccount.cpfCnpj)}
                    onChange={(e) => setField("bankAccount.cpfCnpj", onlyDigits(e.target.value))}
                    title={showErrors && invalid["cpfCnpj"] ? invalid["cpfCnpj"] : undefined}
                    aria-invalid={(showErrors && !!invalid["cpfCnpj"]) || undefined}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">Banco (código 3 dígitos)*</span>
                  <input
                    className={`w-full rounded-lg border px-3 py-2 ${showErrors && invalid["bankCode"] ? "border-rose-500 ring-rose-200 focus:ring-rose-200" : ""}`}
                    value={form.bankAccount.bankCode}
                    onChange={(e) => setField("bankAccount.bankCode", e.target.value)}
                    placeholder="ex.: 001"
                    title={showErrors && invalid["bankCode"] ? invalid["bankCode"] : undefined}
                    aria-invalid={(showErrors && !!invalid["bankCode"]) || undefined}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">Agência</span>
                  <input
                    className="w-full rounded-lg border px-3 py-2"
                    value={form.bankAccount.agency || ""}
                    onChange={(e) => setField("bankAccount.agency", e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">Conta*</span>
                  <input
                    className={`w-full rounded-lg border px-3 py-2 ${showErrors && invalid["account"] ? "border-rose-500 ring-rose-200 focus:ring-rose-200" : ""}`}
                    value={form.bankAccount.account}
                    onChange={(e) => setField("bankAccount.account", e.target.value)}
                    title={showErrors && invalid["account"] ? invalid["account"] : undefined}
                    aria-invalid={(showErrors && !!invalid["account"]) || undefined}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">Tipo de conta*</span>
                  <select
                    className={`w-full rounded-lg border px-3 py-2 bg-white ${showErrors && invalid["accountType"] ? "border-rose-500 ring-rose-200 focus:ring-rose-200" : ""}`}
                    value={form.bankAccount.accountType}
                    onChange={(e) => setField("bankAccount.accountType", e.target.value)}
                    title={showErrors && invalid["accountType"] ? invalid["accountType"] : undefined}
                    aria-invalid={(showErrors && !!invalid["accountType"]) || undefined}
                  >
                    <option value="corrente">Corrente</option>
                    <option value="poupanca">Poupança</option>
                    <option value="conta_pagamento">Conta pagamento</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <label className="block">
                  <span className="mb-1 block text-sm">Chave Pix (tipo)</span>
                  <select
                    className="w-full rounded-lg border px-3 py-2 bg-white"
                    value={form.bankAccount.pixKeyType || ""}
                    onChange={(e) => setField("bankAccount.pixKeyType", e.target.value)}
                  >
                    <option value="">Selecione</option>
                    <option value="cpf">CPF</option>
                    <option value="cnpj">CNPJ</option>
                    <option value="email">E-mail</option>
                    <option value="phone">Telefone</option>
                    <option value="random">Chave aleatória</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">Chave Pix</span>
                  <input
                    className="w-full rounded-lg border px-3 py-2"
                    value={form.bankAccount.pixKey || ""}
                    onChange={(e) => setField("bankAccount.pixKey", e.target.value)}
                  />
                </label>
              </div>
            </section>

            {/* Payout */}
            <section className="rounded-xl border bg-white p-6">
              <h2 className="text-lg font-semibold mb-4">Payout</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="block">
                  <span className="mb-1 block text-sm">Provedor*</span>
                  <select
                    className={`w-full rounded-lg border px-3 py-2 bg-white ${showErrors && invalid["provider"] ? "border-rose-500 ring-rose-200 focus:ring-rose-200" : ""}`}
                    value={form.payout.provider}
                    onChange={(e) => setField("payout.provider", e.target.value)}
                    title={showErrors && invalid["provider"] ? invalid["provider"] : undefined}
                    aria-invalid={(showErrors && !!invalid["provider"]) || undefined}
                  >
                    <option value="manual">Manual</option>
                    <option value="stripe">Stripe</option>
                    <option value="pagarme">Pagar.me</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">Automático</span>
                  <select
                    className="w-full rounded-lg border px-3 py-2 bg-white"
                    value={String(form.payout.automatic)}
                    onChange={(e) => setField("payout.automatic", e.target.value === "true")}
                  >
                    <option value="false">Não</option>
                    <option value="true">Sim</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">Ciclo</span>
                  <select
                    className="w-full rounded-lg border px-3 py-2 bg-white"
                    value={form.payout.cycle || ""}
                    onChange={(e) =>
                      setField(
                        "payout.cycle",
                        (e.target.value || undefined) as FinanceData["payout"]["cycle"]
                      )
                    }
                  >
                    <option value="">Sem ciclo</option>
                    <option value="semanal">Semanal</option>
                    <option value="mensal">Mensal</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <label className="block">
                  <span className="mb-1 block text-sm">Dia da semana (0=Dom, 6=Sáb)</span>
                  <input
                    type="number"
                    min={0}
                    max={6}
                    className={`w-full rounded-lg border px-3 py-2 ${showErrors && invalid["dayOfWeek"] ? "border-rose-500 ring-rose-200 focus:ring-rose-200" : ""}`}
                    value={form.payout.dayOfWeek ?? ""}
                    onChange={(e) =>
                      setField(
                        "payout.dayOfWeek",
                        e.target.value === "" ? undefined : Number(e.target.value)
                      )
                    }
                    title={showErrors && invalid["dayOfWeek"] ? invalid["dayOfWeek"] : undefined}
                    aria-invalid={(showErrors && !!invalid["dayOfWeek"]) || undefined}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">Dia do mês (1-31)</span>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    className={`w-full rounded-lg border px-3 py-2 ${showErrors && invalid["dayOfMonth"] ? "border-rose-500 ring-rose-200 focus:ring-rose-200" : ""}`}
                    value={form.payout.dayOfMonth ?? ""}
                    onChange={(e) =>
                      setField(
                        "payout.dayOfMonth",
                        e.target.value === "" ? undefined : Number(e.target.value)
                      )
                    }
                    title={showErrors && invalid["dayOfMonth"] ? invalid["dayOfMonth"] : undefined}
                    aria-invalid={(showErrors && !!invalid["dayOfMonth"]) || undefined}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">Mínimo para repasse (R$)</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className={`w-full rounded-lg border px-3 py-2 ${showErrors && invalid["minPayout"] ? "border-rose-500 ring-rose-200 focus:ring-rose-200" : ""}`}
                    value={form.payout.minPayout ?? ""}
                    onChange={(e) =>
                      setField(
                        "payout.minPayout",
                        e.target.value === "" ? undefined : Number(e.target.value)
                      )
                    }
                    title={showErrors && invalid["minPayout"] ? invalid["minPayout"] : undefined}
                    aria-invalid={(showErrors && !!invalid["minPayout"]) || undefined}
                  />
                </label>
              </div>
            </section>

            {/* Taxas */}
            <section className="rounded-xl border bg-white p-6">
              <h2 className="text-lg font-semibold mb-4">Taxas</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <label className="block">
                  <span className="mb-1 block text-sm">% Serviço</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    className={`w-full rounded-lg border px-3 py-2 ${showErrors && invalid["serviceFeePercent"] ? "border-rose-500 ring-rose-200 focus:ring-rose-200" : ""}`}
                    value={form.fees?.serviceFeePercent ?? ""}
                    onChange={(e) =>
                      setField(
                        "fees.serviceFeePercent",
                        e.target.value === "" ? undefined : Number(e.target.value)
                      )
                    }
                    title={showErrors && invalid["serviceFeePercent"] ? invalid["serviceFeePercent"] : undefined}
                    aria-invalid={(showErrors && !!invalid["serviceFeePercent"]) || undefined}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">% Cartão</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    className={`w-full rounded-lg border px-3 py-2 ${showErrors && invalid["cardFeePercent"] ? "border-rose-500 ring-rose-200 focus:ring-rose-200" : ""}`}
                    value={form.fees?.cardFeePercent ?? ""}
                    onChange={(e) =>
                      setField(
                        "fees.cardFeePercent",
                        e.target.value === "" ? undefined : Number(e.target.value)
                      )
                    }
                    title={showErrors && invalid["cardFeePercent"] ? invalid["cardFeePercent"] : undefined}
                    aria-invalid={(showErrors && !!invalid["cardFeePercent"]) || undefined}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">R$ fixo cartão</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className={`w-full rounded-lg border px-3 py-2 ${showErrors && invalid["cardFeeFixed"] ? "border-rose-500 ring-rose-200 focus:ring-rose-200" : ""}`}
                    value={form.fees?.cardFeeFixed ?? ""}
                    onChange={(e) =>
                      setField(
                        "fees.cardFeeFixed",
                        e.target.value === "" ? undefined : Number(e.target.value)
                      )
                    }
                    title={showErrors && invalid["cardFeeFixed"] ? invalid["cardFeeFixed"] : undefined}
                    aria-invalid={(showErrors && !!invalid["cardFeeFixed"]) || undefined}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">% do frete</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    className={`w-full rounded-lg border px-3 py-2 ${showErrors && invalid["deliveryFeeSharePercent"] ? "border-rose-500 ring-rose-200 focus:ring-rose-200" : ""}`}
                    value={form.fees?.deliveryFeeSharePercent ?? ""}
                    onChange={(e) =>
                      setField(
                        "fees.deliveryFeeSharePercent",
                        e.target.value === "" ? undefined : Number(e.target.value)
                      )
                    }
                    title={
                      showErrors && invalid["deliveryFeeSharePercent"]
                        ? invalid["deliveryFeeSharePercent"]
                        : undefined
                    }
                    aria-invalid={(showErrors && !!invalid["deliveryFeeSharePercent"]) || undefined}
                  />
                </label>
              </div>
            </section>

            {/* Fiscal */}
            <section className="rounded-xl border bg-white p-6">
              <h2 className="text-lg font-semibold mb-4">Fiscal</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="block">
                  <span className="mb-1 block text-sm">Razão Social</span>
                  <input
                    className="w-full rounded-lg border px-3 py-2"
                    value={form.fiscal?.legalName || ""}
                    onChange={(e) => setField("fiscal.legalName", e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">Tipo de empresa</span>
                  <input
                    className="w-full rounded-lg border px-3 py-2"
                    value={form.fiscal?.companyType || ""}
                    onChange={(e) => setField("fiscal.companyType", e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">Regime Tributário</span>
                  <input
                    className="w-full rounded-lg border px-3 py-2"
                    value={form.fiscal?.regimeTributario || ""}
                    onChange={(e) => setField("fiscal.regimeTributario", e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text sm">Inscrição Municipal (IM)</span>
                  <input
                    className="w-full rounded-lg border px-3 py-2"
                    value={form.fiscal?.im || ""}
                    onChange={(e) => setField("fiscal.im", e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text sm">CNAE</span>
                  <input
                    className="w-full rounded-lg border px-3 py-2"
                    value={form.fiscal?.cnae || ""}
                    onChange={(e) => setField("fiscal.cnae", e.target.value)}
                  />
                </label>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <label className="block">
                  <span className="mb-1 block text-sm">CEP</span>
                  <input
                    className={`w-full rounded-lg border px-3 py-2 ${showErrors && invalid["zip"] ? "border-rose-500 ring-rose-200 focus:ring-rose-200" : ""}`}
                    value={form.fiscal?.address?.zip || ""}
                    onChange={(e) => setField("fiscal.address.zip", onlyDigits(e.target.value))}
                    title={showErrors && invalid["zip"] ? invalid["zip"] : undefined}
                    aria-invalid={(showErrors && !!invalid["zip"]) || undefined}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">Cidade</span>
                  <input
                    className={`w-full rounded-lg border px-3 py-2 ${showErrors && invalid["city"] ? "border-rose-500 ring-rose-200 focus:ring-rose-200" : ""}`}
                    value={form.fiscal?.address?.city || ""}
                    onChange={(e) => setField("fiscal.address.city", e.target.value)}
                    title={showErrors && invalid["city"] ? invalid["city"] : undefined}
                    aria-invalid={(showErrors && !!invalid["city"]) || undefined}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">UF</span>
                  <input
                    className={`w-full rounded-lg border px-3 py-2 uppercase ${showErrors && invalid["state"] ? "border-rose-500 ring-rose-200 focus:ring-rose-200" : ""}`}
                    value={form.fiscal?.address?.state || ""}
                    onChange={(e) => setField("fiscal.address.state", e.target.value.toUpperCase())}
                    title={showErrors && invalid["state"] ? invalid["state"] : undefined}
                    aria-invalid={(showErrors && !!invalid["state"]) || undefined}
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-sm">Rua</span>
                  <input
                    className="w-full rounded-lg border px-3 py-2"
                    value={form.fiscal?.address?.street || ""}
                    onChange={(e) => setField("fiscal.address.street", e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">Número</span>
                  <input
                    className="w-full rounded-lg border px-3 py-2"
                    value={form.fiscal?.address?.number || ""}
                    onChange={(e) => setField("fiscal.address.number", e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">Complemento</span>
                  <input
                    className="w-full rounded-lg border px-3 py-2"
                    value={form.fiscal?.address?.complement || ""}
                    onChange={(e) => setField("fiscal.address.complement", e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm">Bairro</span>
                  <input
                    className="w-full rounded-lg border px-3 py-2"
                    value={form.fiscal?.address?.neighborhood || ""}
                    onChange={(e) => setField("fiscal.address.neighborhood", e.target.value)}
                  />
                </label>
              </div>
            </section>
          </div>

          {/* Coluna direita */}
          <aside className="lg:col-span-1 space-y-6">
            <div className="rounded-xl border bg-white p-4">
              <h3 className="font-semibold mb-2">Resumo</h3>
              <ul className="text-sm text-zinc-600 space-y-1">
                <li>Provedor: <b>{form.payout.provider}</b></li>
                <li>Automático: <b>{form.payout.automatic ? "Sim" : "Não"}</b></li>
                <li>Ciclo: <b>{form.payout.cycle || "-"}</b></li>
                <li>Min. repasse: <b>{(form.payout.minPayout ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</b></li>
              </ul>
            </div>

            <div className="rounded-xl border bg-white p-4">
              <h3 className="font-semibold mb-2">Dicas</h3>
              <p className="text-sm text-zinc-600">
                Complete os dados obrigatórios para liberar o payout automático.
              </p>
            </div>
          </aside>
        </div>
      </div>
      <Toaster />
    </DashboardShell>
  );
}
