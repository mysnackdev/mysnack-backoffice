// src/app/menus/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import DashboardShell from "@/components/DashboardShell";
import { ref, onValue, update, remove } from "firebase/database";
import { db, storage } from "@/firebase";
import { ref as sRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/context/AuthContext";

type MenuItem = {
  key: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  type?: "preparado" | "industrializado";
  category?: string;
  categories?: string[];
  updatedAt?: number;
};

// Estrutura esperada no RTDB (sem a chave)
type MenuItemDB = {
  name?: string;
  description?: string;
  price?: number | string;
  imageUrl?: string;
  type?: "preparado" | "industrializado";
  category?: string;
  categories?: unknown; // pode vir bagunçado; filtramos abaixo
  updatedAt?: number;
};

function Modal({
  children,
  open,
  onClose,
}: {
  children: React.ReactNode;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-[560px] max-w-[90vw] rounded-2xl bg-white p-6 shadow-xl">
        {children}
      </div>
    </div>
  );
}

function formatDateTime(ts?: number | null) {
  if (!ts) return "";
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} às ${hh}:${min}`;
}

export default function MenusPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<string[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [file, setFile] = useState<File | null>(null);

  // status/online e última atualização do cardápio
  const [statusOnline, setStatusOnline] = useState<boolean>(false);
  const [lastUpdatedCardapio, setLastUpdatedCardapio] = useState<number | null>(
    null
  );

  useEffect(() => {
    if (!user) return;
    const uid = user.uid;

    const r1 = ref(db, `backoffice/tenants/${uid}/menu/categories`);
    const r2 = ref(db, `backoffice/tenants/${uid}/menu/items`);
    const r3 = ref(db, `backoffice/tenants/${uid}/status/online`);
    const r4 = ref(db, `backoffice/tenants/${uid}/lastUpdated/cardapio`);

    const unsub1 = onValue(r1, (snap) => {
      const v = snap.val();
      setCategories(Array.isArray(v) ? (v as string[]) : []);
    });

    const unsub2 = onValue(r2, (snap) => {
      const v = (snap.val() as Record<string, MenuItemDB> | null) || {};
      const list: MenuItem[] = Object.entries(v).map(([key, val]) => {
        const rawCategories = val.categories;
        const normalizedCategories = Array.isArray(rawCategories)
          ? (rawCategories.filter((c): c is string => typeof c === "string") as string[])
          : val.category
          ? [val.category]
          : [];

        return {
          key,
          name: String(val?.name ?? ""),
          description: val?.description ? String(val.description) : "",
          price: Number((val?.price as number | string | undefined) ?? 0),
          imageUrl: val?.imageUrl ?? "",
          type: val?.type === "industrializado" ? "industrializado" : "preparado",
          category:
            val?.category ??
            (normalizedCategories.length > 0 ? normalizedCategories[0] : ""),
          categories: normalizedCategories,
          updatedAt: typeof val?.updatedAt === "number" ? val.updatedAt : 0,
        };
      });
      setItems(list);
    });

    const unsub3 = onValue(r3, (snap) => setStatusOnline(Boolean(snap.val())));
    const unsub4 = onValue(r4, (snap) =>
      setLastUpdatedCardapio(
        typeof snap.val() === "number" ? (snap.val() as number) : null
      )
    );

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  }, [user]);

  const grouped = useMemo(() => {
    const g: Record<string, MenuItem[]> = {};
    const cats = categories.length
      ? categories
      : Array.from(new Set(items.map((i) => i.category || "Outros")));
    cats.forEach((c) => (g[c] = []));
    items.forEach((it) => {
      const c = it.category || "Outros";
      if (!g[c]) g[c] = [];
      g[c].push(it);
    });
    return g;
  }, [categories, items]);

  async function touchLastUpdated(uid: string) {
    await update(ref(db, `backoffice/tenants/${uid}/lastUpdated`), {
      cardapio: Date.now(),
    });
  }

  async function saveEdit() {
    if (!user || !editing) return;
    const uid = user.uid;
    const key = editing.key;

    await update(ref(db, `backoffice/tenants/${uid}/menu/items/${key}`), {
      name: editing.name,
      description: editing.description ?? "",
      price: Number(editing.price || 0),
      type: editing.type ?? "preparado",
      updatedAt: Date.now(),
    });

    if (file) {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `backoffice/${uid}/menu/items/${key}.${ext}`;
      const sr = sRef(storage, path);
      await uploadBytes(sr, file);
      const url = await getDownloadURL(sr);
      await update(ref(db, `backoffice/tenants/${uid}/menu/items/${key}`), {
        imageUrl: url,
        updatedAt: Date.now(),
      });
    }

    await touchLastUpdated(uid);
    setEditing(null);
    setFile(null);
  }

  async function deleteItem(it: MenuItem) {
    if (!user) return;
    const uid = user.uid;
    await remove(ref(db, `backoffice/tenants/${uid}/menu/items/${it.key}`));
    await touchLastUpdated(uid);
  }

  return (
    <DashboardShell>
      <div className="space-y-8">
        {/* Cabeçalho com status e última atualização */}
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
            Cardápio
          </h1>
          <div className="flex items-center gap-3">
            <span
              className={
                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium " +
                (statusOnline
                  ? "bg-green-100 text-green-700"
                  : "bg-zinc-100 text-zinc-700")
              }
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: statusOnline ? "#16a34a" : "#9ca3af",
                }}
              />
              {statusOnline ? "Online" : "Offline"}
            </span>
            {lastUpdatedCardapio && (
              <span className="text-xs text-zinc-500">
                Última atualização: {formatDateTime(lastUpdatedCardapio)}
              </span>
            )}
          </div>
        </header>

        {/* Bloco de escolha (layout original) */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Cardápio</h2>
          <p className="text-sm text-zinc-500">Escolha como montar seu cardápio</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/menus/ai"
              className="rounded-2xl border p-6 hover:shadow-sm transition"
            >
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    className="text-blue-600"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M12 2L4 14h6v8l8-12h-6z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <div className="font-medium">
                    Manter o cardápio dos tipos atendidos
                  </div>
                  <div className="text-sm text-zinc-500">
                    Nossa inteligência artificial vai ler e estruturar seu
                    cardápio
                  </div>
                  <div className="text-xs text-zinc-400">até 50 min</div>
                </div>
              </div>
            </Link>

            <Link
              href="/menus/new"
              className="rounded-2xl border p-6 hover:shadow-sm transition"
            >
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    className="text-green-600"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M11 5h2v14h-2zM5 11h14v2H5z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <div className="font-medium">Crio o cardápio do zero</div>
                  <div className="text-sm text-zinc-500">
                    Você cadastra seus produtos como quiser
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* Itens cadastrados */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Itens cadastrados</h3>
            <div className="flex items-center gap-2">
              <Link
                href="/menus/new"
                className="rounded-lg bg-rose-600 px-4 py-2 text-white hover:bg-rose-700"
              >
                Adicionar itens
              </Link>
            </div>
          </div>

          {Object.keys(grouped).length === 0 ? (
            <div className="rounded-xl border p-6 text-center text-zinc-500">
              Nenhum item cadastrado ainda. Clique em{" "}
              <b>Crio o cardápio do zero</b> para começar.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([cat, list]) => (
                <section key={cat} className="rounded-xl border">
                  <div className="flex items-center justify-between p-4">
                    <div className="font-semibold">{cat}</div>
                  </div>
                  <div className="border-t grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                    {list.map((it) => (
                      <div
                        key={it.key}
                        className="rounded-xl border p-3 hover:shadow-sm transition"
                      >
                        <button
                          onClick={() => setEditing(it)}
                          className="text-left w-full"
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative h-14 w-14 rounded-lg bg-zinc-100 flex items-center justify-center overflow-hidden">
                              {it.imageUrl ? (
                                <Image
                                  src={it.imageUrl}
                                  alt={it.name || "Item do cardápio"}
                                  fill
                                  sizes="56px"
                                  className="object-cover rounded-lg"
                                  unoptimized
                                />
                              ) : (
                                <span className="text-xs text-zinc-400">
                                  sem foto
                                </span>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium truncate">
                                {it.name}
                              </div>
                              <div className="text-xs text-zinc-500">
                                {(it.price || 0).toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })}
                              </div>
                            </div>
                          </div>
                        </button>
                        <div className="mt-3 flex items-center justify-end">
                          <button
                            onClick={() => deleteItem(it)}
                            className="rounded-lg border px-3 py-1 text-sm hover:bg-zinc-50"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Modal de edição (com upload) */}
      <Modal
        open={!!editing}
        onClose={() => {
          setEditing(null);
          setFile(null);
        }}
      >
        {editing && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                <button
                  className={
                    "rounded-lg px-3 py-1 border " +
                    (editing.type === "preparado"
                      ? "bg-zinc-900 text-white"
                      : "")
                  }
                  onClick={() =>
                    setEditing((e) => (e ? { ...e, type: "preparado" } : e))
                  }
                >
                  Item preparado
                </button>
                <button
                  className={
                    "rounded-lg px-3 py-1 border " +
                    (editing.type === "industrializado"
                      ? "bg-zinc-900 text-white"
                      : "")
                  }
                  onClick={() =>
                    setEditing((e) =>
                      e ? { ...e, type: "industrializado" } : e
                    )
                  }
                >
                  Item industrializado
                </button>
              </div>
              <button
                onClick={() => {
                  setEditing(null);
                  setFile(null);
                }}
                className="text-zinc-500"
              >
                ✕
              </button>
            </div>

            <label className="rounded-xl border-2 border-dashed p-4 text-center text-sm text-zinc-500 mb-4 block cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file || editing.imageUrl ? (
                <span>Imagem selecionada</span>
              ) : (
                <span>Adicionar foto (JPG, PNG até 5MB)</span>
              )}
            </label>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium">Nome do item</label>
                <input
                  type="text"
                  value={editing.name}
                  onChange={(e) =>
                    setEditing((s) => (s ? { ...s, name: e.target.value } : s))
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Descrição</label>
                <textarea
                  value={editing.description ?? ""}
                  onChange={(e) =>
                    setEditing((s) =>
                      s ? { ...s, description: e.target.value } : s
                    )
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Preço</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={editing.price ?? 0}
                  onChange={(e) =>
                    setEditing((s) =>
                      s ? { ...s, price: Number(e.target.value) } : s
                    )
                  }
                  className="mt-1 w-full max-w-[200px] rounded-lg border px-3 py-2"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                className="rounded-lg border px-4 py-2 hover:bg-zinc-50"
                onClick={() => {
                  setEditing(null);
                  setFile(null);
                }}
              >
                Cancelar
              </button>
              <button
                className="rounded-lg bg-rose-600 px-4 py-2 text-white hover:bg-rose-700"
                onClick={saveEdit}
              >
                Salvar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardShell>
  );
}
