// src/app/my-store/page.tsx
"use client";

import React from "react";
import {  onValue, ref, update } from "firebase/database";
import { db } from "@/firebase";
import DashboardShell from "@/components/DashboardShell";
import StoreStatusToolbar from "@/components/StoreStatusToolbar";
import OperatorsCard from "@/components/store/OperatorsCard";
import { Toaster, toast } from "@/components/ui/toast";
import { useAuth } from "@/context/AuthContext";
import {  syncSetupStatus } from "@/lib/completeness";
import { listShoppingsCF, linkStoreToShoppingCF } from "@/services/admin.service";
import type { Shop } from "@/services/admin.service";

type StoreProfile = {
  nome?: string;
  descricao?: string;
  categoria?: string;
  telefone?: string;
  minimo?: number;
  id?: string;
  cnpj?: string;
  razaoSocial?: string;
  displayName?: string;
  rating?: number;
  deliveryEta?: string;
};
// (unused) type Setup = 


function formatCNPJ(v?: string) {
  const digits = String(v || "").replace(/\D+/g, "").slice(0, 14);
  if (digits.length !== 14) return v || "—";
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

function useDebounced(value: string, delay = 250) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function AutocompleteShopping({
  value,
  onSelect }: {
  value?: string | null;
  onSelect: (slug: string) => void;
}) {
  const [query, setQuery] = React.useState(value || "");
  const [items, setItems] = React.useState<{ slug: string; name?: string }[]>([]);
  const debounced = useDebounced(query, 250);

  React.useEffect(() => {
    let active = true;
    (async () => {
      const { shoppings } = await listShoppingsCF();
      const list = (shoppings || []).map((s: Shop) => ({ slug: s.slug, name: s.name }));
      const filtered = list.filter(
        (s) =>
          !debounced ||
          s.slug.toLowerCase().includes(debounced.toLowerCase()) ||
          (s.name || "").toLowerCase().includes(debounced.toLowerCase())
      );
      if (active) setItems(filtered.slice(0, 20));
    })().catch(() => {});
    return () => {
      active = false;
    };
  }, [debounced]);

  return (
    <div>
      <div className="text-sm font-medium mb-1">Shopping (obrigatório)</div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Digite o nome ou slug do shopping"
        className="w-full border rounded-lg px-3 py-2"
      />
      <div className="mt-2 border rounded-lg divide-y max-h-48 overflow-auto bg-white">
        {items.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum shopping encontrado</div>
        ) : null}
        {items.map((it) => (
          <button
            key={it.slug}
            type="button"
            onClick={() => {
              onSelect(it.slug);
              setQuery(it.slug);
            }}
            className="w-full text-left px-3 py-2 hover:bg-zinc-50"
          >
            <div className="font-medium">{it.name || it.slug}</div>
            <div className="text-xs text-muted-foreground">{it.slug}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function MinhaLojaPage() {
  const { user } = useAuth();
  const uid = user?.uid || "";

  const [form, setForm] = React.useState<StoreProfile>({
    nome: "",
    descricao: "",
    categoria: "Brasileira",
    telefone: "",
    minimo: 0,
    id: "",
    cnpj: "",
    razaoSocial: "",
    rating: undefined,
    deliveryEta: "" });

  const [shoppingSlug, setShoppingSlug] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!uid) return;

    // Perfil
    const rProfile = ref(db, `backoffice/tenants/${uid}/storeProfile`);
    const off1 = onValue(rProfile, (snap) => {
      const v = (snap.val() || {}) as StoreProfile;
      setForm((p) => ({ ...p, ...v }));
    });

    // Shopping vinculado
    const rShop = ref(db, `backoffice/stores/${uid}/shoppingSlug`);
    const off2 = onValue(rShop, (snap) => setShoppingSlug(snap.val() || null));

    return () => {
      off1();
      off2();
    };
  }, [uid]);

  function handleChange<K extends keyof StoreProfile>(key: K) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const v: string | number = e.target.type === "number" ? Number(e.target.value) : e.target.value;
      setForm((p) => ({ ...p, [key]: v }));
    };
  }

  async function handleBlur<K extends keyof StoreProfile>(key: K) {
    const rProfile = ref(db, `backoffice/tenants/${uid}/storeProfile/${String(key)}`);
    await update(rProfile, { ".": 0 }).catch(() => {}); // noop to ensure path
    await update(ref(db, `backoffice/tenants/${uid}/storeProfile`), { [String(key)]: form[key] as unknown });
    await syncSetupStatus(uid);
  }

  
  async function save() {
    const uid = user?.uid || "";
    await update(ref(db, `backoffice/tenants/${uid}/storeProfile`), {
      nome: form.nome || "",
      descricao: form.descricao || "",
      categoria: form.categoria || "Brasileira",
      telefone: form.telefone || "",
      minimo: Number(form.minimo || 0),
      cnpj: form.cnpj || "",
      razaoSocial: form.razaoSocial || form.nome || "",
      rating: form.rating ?? null,
      deliveryEta: form.deliveryEta || ""
    });
    await syncSetupStatus(uid);
    toast.success("Dados salvos");
  }
return (
    <DashboardShell>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Minha loja</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie as informações da sua loja e o vínculo com o shopping.
          </p>
        </div>
        <StoreStatusToolbar />
      </div>

      {/* GRID PRINCIPAL */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Perfil da loja */}
        <section className="lg:col-span-2 rounded-xl border p-4">
          <div className="text-lg font-semibold mb-2">Perfil da loja</div>
          <div className="grid gap-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Nome da loja*</span>
              <input
                className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
                value={form.nome || ""}
                onChange={handleChange("nome")}
                onBlur={() => handleBlur("nome")}
                placeholder="ex.: Lanchonete Central"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium">Descrição da loja</span>
              <textarea
                className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
                rows={4}
                value={form.descricao || ""}
                onChange={handleChange("descricao")}
                onBlur={() => handleBlur("descricao")}
                placeholder="Breve descrição em até 400 caracteres"
              />
            </label>

            <div className="grid md:grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Categoria*</span>
                <select
                  className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
                  value={form.categoria || "Brasileira"}
                  onChange={handleChange("categoria")}
                  onBlur={() => handleBlur("categoria")}
                >
                  <option value="Brasileira">Brasileira</option>
                  <option value="Lanches">Lanches</option>
                  <option value="Pizza">Pizza</option>
                  <option value="Japonesa">Japonesa</option>
                  <option value="Italiana">Italiana</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium">Telefone de contato*</span>
                <input
                  className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
                  value={form.telefone || ""}
                  onChange={handleChange("telefone")}
                  onBlur={() => handleBlur("telefone")}
                  placeholder="(21) 99999-9999"
                />
              </label>
            </div>

            <div className="grid md:grid-cols-3 gap-4 items-end">
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Pedido mínimo</span>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg border bg-zinc-50 px-2 py-2 text-sm">R$</span>
                  <input
                    type="number"
                    className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
                    value={Number(form.minimo || 0)}
                    onChange={handleChange("minimo")}
                    onBlur={() => handleBlur("minimo")}
                    min={0}
                  />
                </div>
              </label>

              <div className="md:col-span-2">
                <span className="mb-1 block text-sm font-medium">ID da loja</span>
                <div className="flex items-center gap-2">
                  <input
                    className="w-full rounded-lg border px-3 py-2 bg-zinc-50"
                    value={uid}
                    readOnly
                  />
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(uid)}
                    className="rounded-lg border px-3 py-2 text-sm"
                  >
                    copiar
                  </button>
                </div>
              </div>
            </div>
          </div>
        
          {/* Extras: avaliação e tempo de entrega */}
          <details className="rounded-lg border px-4 py-3">
            <summary className="cursor-pointer select-none font-medium">Nota de avaliação da loja</summary>
            <div className="mt-3 grid md:grid-cols-3 gap-3">
              <label className="block md:col-span-1">
                <span className="mb-1 block text-sm text-zinc-600">Nota (0 a 5)</span>
                <input
                  type="number"
                  min={0}
                  max={5}
                  step={0.1}
                  className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
                  value={typeof form.rating === "number" ? form.rating : ""}
                  onChange={(e) => setForm((p) => ({ ...p, rating: e.target.value === "" ? undefined : Number(e.target.value) }))}
                  onBlur={async () => {
                    await update(ref(db, `backoffice/tenants/${uid}/storeProfile`), { rating: form.rating ?? null });
                    await syncSetupStatus(uid);
                  }}
                  placeholder="ex.: 4.6"
                />
              </label>
            </div>
          </details>

          <details className="rounded-lg border px-4 py-3">
            <summary className="cursor-pointer select-none font-medium">Tempo de entrega previsto</summary>
            <div className="mt-3 grid md:grid-cols-3 gap-3">
              <label className="block md:col-span-2">
                <span className="mb-1 block text-sm text-zinc-600">Janela (texto)</span>
                <input
                  className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
                  value={form.deliveryEta || ""}
                  onChange={(e) => setForm((p) => ({ ...p, deliveryEta: e.target.value }))}
                  onBlur={async () => {
                    await update(ref(db, `backoffice/tenants/${uid}/storeProfile`), { deliveryEta: form.deliveryEta || "" });
                    await syncSetupStatus(uid);
                  }}
                  placeholder="ex.: 35–50 min"
                />
              </label>
            </div>
          </details>
</section>

        {/* Identidade fiscal */}
        <section className="rounded-xl border p-4">
          <div className="text-lg font-semibold mb-2">Identidade fiscal</div>
          <div className="grid gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">CNPJ</span>
              <span className="font-medium">{formatCNPJ(form.cnpj)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Razão social</span>
              <span className="font-medium">{form.razaoSocial || form.nome || "—"}</span>
            </div>
          </div>
          <div className="mt-3 rounded-lg bg-pink-50 aspect-video flex items-center justify-center text-zinc-500">
            {/* placeholder para imagem */}
            <span>foto da loja</span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {form.nome || "loja"} • 0 km • Mínimo R$ {Number(form.minimo || 0).toFixed(2)}
          </div>
        </section>
      </div>

      {/* SHOPPING: vinculação */}
      <section className="mt-6 rounded-xl border p-4 max-w-2xl">
        <h2 className="text-lg font-semibold mb-2">Shopping</h2>
        {shoppingSlug ? (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm">Selecionado:</span>
            <code className="text-xs border rounded px-2 py-1 bg-zinc-50">{shoppingSlug}</code>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(shoppingSlug || "")}
              className="text-xs underline"
            >
              copiar
            </button>
          </div>
        ) : null}

        <AutocompleteShopping
          value={shoppingSlug}
          onSelect={async (slug) => {
            try {
              await linkStoreToShoppingCF({ storeId: uid, shoppingSlug: slug });
              await syncSetupStatus(uid);
              toast.success(`Shopping vinculado: ${slug}`);
            } catch (e: unknown) {
              toast.error(`Erro ao vincular: ${(e instanceof Error) ? e.message : String(e)}`);
            }
          }}
        />
        <p className="text-xs text-muted-foreground mt-2">Obrigatório para a loja ficar online.</p>
      </section>

      <Toaster />
    
      <div className="flex items-center justify-between px-4 py-4">
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
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60"
        >
          Salvar e continuar
        </button>
      </div>

      {/* Funcionários / Operadores */}
      <div className="mt-6">
        <OperatorsCard />
      </div>
</DashboardShell>
  );
}