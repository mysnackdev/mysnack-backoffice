"use client";

import React from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/firebase";
import DashboardShell from "@/components/DashboardShell";
import { useAuth } from "@/context/AuthContext";

type StoreProfile = {
  nome?: string;
  displayName?: string;
  storeName?: string;
  name?: string;
  descricao?: string;
  categoria?: string;
  telefone?: string;
  minimo?: number;
  id?: string;
};

export default function MinhaLojaPage() {
  const { user } = useAuth(); // ✅ garante uid e corrige deps do useEffect

  const [form, setForm] = React.useState<StoreProfile>({
    nome: "",
    descricao: "",
    categoria: "Brasileira",
    telefone: "",
    minimo: 0,
    id: "",
  });
  const [saving, setSaving] = React.useState(false);
  const [lastUpdated, setLastUpdated] = React.useState<string>(() =>
    new Date().toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  );

  React.useEffect(() => {
    if (!user) return;
    const r = ref(db, `backoffice/tenants/${user.uid}/storeProfile`);
    const off = onValue(r, (snap) => {
      if (!snap.exists()) return;
      const v = snap.val() as StoreProfile;
      setForm((prev) => ({
        ...prev,
        nome: v.nome ?? v.displayName ?? v.storeName ?? v.name ?? "",
        descricao: v.descricao ?? "",
        categoria: v.categoria ?? prev.categoria ?? "Brasileira",
        telefone: v.telefone ?? "",
        minimo:
          typeof v.minimo === "number"
            ? v.minimo
            : Number((v.minimo as unknown as string) || 0),
        id: v.id ?? "",
      }));
      setLastUpdated(
        new Date().toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    });
    return () => off();
  }, [user]); // ✅ adiciona 'user' para resolver o warning do eslint

  const handleChange =
    (key: keyof StoreProfile) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      let val: string | number = e.target.value;
      if (key === "minimo") {
        val = Number((e.target as HTMLInputElement).value || 0);
      }
      setForm((f) => ({ ...f, [key]: val as never }));
    };

  const copyId = async () => {
    if (!form.id) return;
    try {
      await navigator.clipboard.writeText(form.id);
    } catch {
      /* noop */
    }
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await update(ref(db, `backoffice/tenants/${user.uid}/storeProfile`), {
        nome: form.nome,
        descricao: form.descricao,
        categoria: form.categoria,
        telefone: form.telefone,
        minimo: Number(form.minimo || 0),
        id: form.id || crypto.randomUUID(),
        updatedAt: Date.now(),
      });
      setLastUpdated(
        new Date().toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Perfil da loja</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-zinc-500">
            <span className="inline-flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" className="opacity-70" aria-hidden>
                <path fill="currentColor" d="M7 2v2H5v2H3v14h18V6h-2V4h-2V2zm0 4h10v2H7zm-2 4h14v8H5z"/>
              </svg>
              Última atualização: {lastUpdated}
            </span>
          </div>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Online
        </span>
      </div>

      <div className="rounded-xl border bg-white p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-zinc-900">Perfil da loja</h2>
          <p className="text-sm text-zinc-600">Informações obrigatórias*</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-5">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Nome da loja*</span>
              <input
                className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
                value={form.nome || ""}
                onChange={handleChange("nome")}
                placeholder="Nome que vai aparecer para seus clientes"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium">Descrição da loja</span>
              <textarea
                className="min-h-[96px] w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
                value={form.descricao || ""}
                onChange={handleChange("descricao")}
                placeholder="Breve descrição em até 400 caracteres"
                maxLength={400}
              />
              <div className="mt-1 text-right text-xs text-zinc-400">
                {(form.descricao?.length || 0)}/400
              </div>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium">Categoria*</span>
              <select
                className="w-full rounded-lg border bg-white px-3 py-2 outline-none focus:ring-2"
                value={form.categoria || "Brasileira"}
                onChange={handleChange("categoria")}
              >
                <option>Brasileira</option>
                <option>Lanches</option>
                <option>Pizzas</option>
                <option>Doces</option>
                <option>Japonesa</option>
                <option>Italiana</option>
                <option>Saudável</option>
              </select>
            </label>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Telefone de contato*</span>
                <input
                  className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
                  value={form.telefone || ""}
                  onChange={handleChange("telefone")}
                  placeholder="(21) 99999-9999"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium">Pedido mínimo</span>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg border bg-zinc-50 px-2 py-2 text-sm">R$</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
                    value={Number(form.minimo || 0)}
                    onChange={handleChange("minimo")}
                  />
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Menor valor de um pedido, sem taxa de entrega
                </p>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium">ID da loja</span>
                <div className="flex items-center gap-2">
                  <input
                    className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
                    value={form.id || ""}
                    onChange={handleChange("id")}
                    placeholder="gerado automaticamente"
                  />
                  <button
                    type="button"
                    onClick={copyId}
                    className="rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50"
                    title="Copiar ID"
                  >
                    📋
                  </button>
                </div>
              </label>
            </div>

            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer select-none font-medium">
                Nota de avaliação da loja
              </summary>
              <p className="mt-2 text-sm text-zinc-600">
                Configure aqui como a nota é mostrada aos clientes (em breve).
              </p>
            </details>

            <details className="rounded-lg border p-4">
              <summary className="cursor-pointer select-none font-medium">
                Tempo de entrega previsto
              </summary>
              <p className="mt-2 text-sm text-zinc-600">
                Defina o tempo médio estimado de entrega (em breve).
              </p>
            </details>

            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                className="rounded-lg border px-4 py-2 text-sm hover:bg-zinc-50"
                onClick={() => history.back()}
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {saving ? "Salvando..." : "Salvar e continuar"}
              </button>
            </div>
          </div>

          <aside className="lg:col-span-1">
            <div className="rounded-xl border bg-white p-4">
              <div className="aspect-video w-full rounded-lg bg-pink-100 grid place-items-center text-3xl">
                📷
              </div>
              <div className="mt-3">
                <div className="text-sm font-semibold">{form.nome || "Sua loja"}</div>
                <div className="text-xs text-zinc-500">
                  {form.categoria || "Categoria"} • 0 km • Mínimo{" "}
                  {Number(form.minimo || 0).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );

  return <DashboardShell>{content}</DashboardShell>;
}
