// src/components/MenuWizard.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ref, push, set, update } from "firebase/database";
import { db, storage } from "@/firebase";
import { ref as sRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/context/AuthContext";

type Category = string;

type MenuItemDraft = {
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;     // URL já salva (quando houver)
  imageFile?: File;      // arquivo temporário para upload
  type: "preparado" | "industrializado";
  categories: Category[];
  category?: Category;
};

const SUGGESTED_CATEGORIES: Category[] = [
  "Pratos Do Dia",
  "Pratos Individuais",
  "Pratos Executivos",
  "Marmitex",
  "Carnes",
  "Acompanhamentos",
  "Porções",
  "Sobremesas",
  "Bebidas",
];

function Chip({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={
        "rounded-full border px-3 py-1 text-sm mr-2 mb-2 " +
        (active ? "bg-zinc-900 text-white" : "hover:bg-zinc-100")
      }
      aria-pressed={active}
    >
      + {label}
    </button>
  );
}

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

export default function MenuWizard() {
  const { user } = useAuth();
  const router = useRouter();

  // steps: 0 = categorias, 1 = itens, 2 = revisão/salvar
  const [step, setStep] = useState(0);

  const [selected, setSelected] = useState<Category[]>([]);
  const [customCat, setCustomCat] = useState("");

  const [itemsByCat, setItemsByCat] = useState<Record<string, MenuItemDraft[]>>(
    {}
  );

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<{ cat: Category; idx: number } | null>(
    null
  );
  const [draft, setDraft] = useState<MenuItemDraft | null>(null);

  // ---- helpers de categoria ----
  function toggleCategory(c: Category) {
    setSelected((prev) => {
      const next = prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c];
      setItemsByCat((old) => {
        const clone = { ...old };
        if (!next.includes(c)) {
          delete clone[c];
        } else {
          clone[c] = clone[c] ?? [];
        }
        return clone;
      });
      return next;
    });
  }

  function removeCategory(c: Category) {
    setSelected((prev) => prev.filter((x) => x !== c));
    setItemsByCat((old) => {
      const clone = { ...old };
      delete clone[c];
      return clone;
    });
  }

  // ---- itens por categoria ----
  function addItem(cat: Category) {
    setItemsByCat((prev) => {
      const list = prev[cat] ? [...prev[cat]] : [];
      list.push({
        name: "Novo item",
        description: "",
        price: 0,
        imageUrl: "",
        type: "preparado",
        categories: [cat],
        category: cat,
      });
      return { ...prev, [cat]: list };
    });
  }

  function openEdit(cat: Category, idx: number) {
    const it = itemsByCat[cat]?.[idx];
    if (!it) return;
    setDraft({ ...it });
    setEditing({ cat, idx });
    setModalOpen(true);
  }

  function saveEdit() {
    if (!editing || !draft) return;
    const { cat, idx } = editing;
    setItemsByCat((prev) => {
      const list = [...(prev[cat] || [])];
      list[idx] = { ...draft, category: cat, categories: [cat] };
      return { ...prev, [cat]: list };
    });
    setModalOpen(false);
    setEditing(null);
  }

  function deleteItem(cat: Category, idx: number) {
    setItemsByCat((prev) => {
      const list = [...(prev[cat] || [])];
      list.splice(idx, 1);
      return { ...prev, [cat]: list };
    });
  }

  // ---- navegação dos passos ----
  const canGoNextFrom0 = selected.length > 0;
  const canGoNextFrom1 = useMemo(() => {
    // pelo menos 1 item em alguma categoria selecionada
    return selected.some((c) => (itemsByCat[c] || []).length > 0);
  }, [selected, itemsByCat]);

  // ---- salvar no RTDB + Storage ----
  async function handleFinish() {
    if (!user) {
      alert("Você precisa estar logado para continuar.");
      return;
    }
    const uid = user.uid;

    // 1) salva categorias
    await set(ref(db, `backoffice/stores/${uid}/menu/categories`), selected);

    // 2) salva itens por categoria (push + upload opcional)
    for (const cat of selected) {
      const list = itemsByCat[cat] || [];
      for (const it of list) {
        const payload = {
          name: it.name || "Item sem nome",
          description: it.description || "",
          price: Number(it.price || 0),
          imageUrl: it.imageUrl || "",
          type: it.type,
          categories: [cat],
          category: cat,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: uid,
        };
        const itemRef = push(ref(db, `backoffice/stores/${uid}/menu/items`));
        await set(itemRef, payload);
        const key = itemRef.key as string;

        if (it.imageFile) {
          const ext = (it.imageFile.name.split(".").pop() || "jpg").toLowerCase();
          const path = `backoffice/${uid}/menu/items/${key}.${ext}`;
          const sr = sRef(storage, path);
          await uploadBytes(sr, it.imageFile);
          const url = await getDownloadURL(sr);
          await update(ref(db, `backoffice/stores/${uid}/menu/items/${key}`), {
            imageUrl: url,
            updatedAt: Date.now(),
          });
        }
      }
    }

    // 3) lastUpdated/cardapio
    await update(ref(db, `backoffice/stores/${uid}/lastUpdated`), {
      cardapio: Date.now(),
    });

    router.push("/menus");
  }

  // ---- UI passo 0: categorias ----
  const Step0 = (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Categorias</h2>
      <p className="text-sm text-zinc-500">
        Selecione as categorias que você pretende usar no seu cardápio.
      </p>

      <div className="mt-2">
        {SUGGESTED_CATEGORIES.map((c) => (
          <Chip
            key={c}
            label={c}
            active={selected.includes(c)}
            onToggle={() => toggleCategory(c)}
          />
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          className="w-[240px] rounded-lg border px-3 py-2"
          placeholder="Adicionar categoria personalizada"
          value={customCat}
          onChange={(e) => setCustomCat(e.target.value)}
        />
        <button
          type="button"
          onClick={() => {
            const c = customCat.trim();
            if (!c) return;
            if (!selected.includes(c)) toggleCategory(c);
            setCustomCat("");
          }}
          className="rounded-lg border px-3 py-2 hover:bg-zinc-50"
        >
          Adicionar
        </button>
      </div>

      {selected.length > 0 && (
        <div className="mt-4">
          <div className="text-sm font-medium mb-1">Selecionadas:</div>
          <div className="flex flex-wrap">
            {selected.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => removeCategory(c)}
                className="mr-2 mb-2 rounded-full border px-3 py-1 text-sm hover:bg-zinc-50"
                title="Remover categoria"
              >
                {c} ✕
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="pt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setStep(1)}
          disabled={!canGoNextFrom0}
          className="rounded-lg bg-rose-600 px-4 py-2 text-white hover:bg-rose-700 disabled:opacity-60"
        >
          Continuar
        </button>
      </div>
    </section>
  );

  // ---- UI passo 1: itens ----
  const Step1 = (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Itens por categoria</h2>
      <p className="text-sm text-zinc-500">
        Adicione itens em cada categoria. Você pode editar nome, descrição, preço e imagem.
      </p>

      {selected.length === 0 ? (
        <div className="rounded-xl border p-6 text-center text-zinc-500">
          Nenhuma categoria selecionada. Volte e adicione pelo menos uma categoria.
        </div>
      ) : (
        <div className="space-y-6">
          {selected.map((cat) => (
            <div key={cat} className="rounded-xl border">
              <div className="flex items-center justify-between p-4">
                <div className="font-semibold">{cat}</div>
                <button
                  type="button"
                  onClick={() => addItem(cat)}
                  className="rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50"
                >
                  + Adicionar item
                </button>
              </div>
              <div className="border-t grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {(itemsByCat[cat] || []).length === 0 ? (
                  <div className="col-span-full text-sm text-zinc-500">
                    Nenhum item nesta categoria ainda.
                  </div>
                ) : (
                  (itemsByCat[cat] || []).map((it, idx) => (
                    <div
                      key={`${cat}-${idx}`}
                      className="rounded-xl border p-3 hover:shadow-sm transition"
                    >
                      <button
                        onClick={() => openEdit(cat, idx)}
                        className="text-left w-full"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-14 w-14 rounded-lg bg-zinc-100 grid place-items-center text-xs text-zinc-400">
                            {it.imageFile
                              ? "novo arquivo"
                              : it.imageUrl
                              ? "com foto"
                              : "sem foto"}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium truncate">{it.name}</div>
                            <div className="text-xs text-zinc-500">
                              {Number(it.price || 0).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </div>
                          </div>
                        </div>
                      </button>
                      <div className="mt-3 flex items-center justify-end">
                        <button
                          onClick={() => deleteItem(cat, idx)}
                          className="rounded-lg border px-3 py-1 text-sm hover:bg-zinc-50"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pt-2 flex justify-between">
        <button
          type="button"
          onClick={() => setStep(0)}
          className="rounded-lg border px-4 py-2 hover:bg-zinc-50"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={() => setStep(2)}
          disabled={!canGoNextFrom1}
          className="rounded-lg bg-rose-600 px-4 py-2 text-white hover:bg-rose-700 disabled:opacity-60"
        >
          Revisar
        </button>
      </div>
    </section>
  );

  // ---- UI passo 2: revisão/salvar ----
  const totalItems = useMemo(
    () =>
      selected.reduce((acc, c) => acc + ((itemsByCat[c] || []).length || 0), 0),
    [selected, itemsByCat]
  );

  const Step2 = (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Revisão</h2>
      <p className="text-sm text-zinc-500">
        Confira suas categorias e itens. Quando estiver tudo certo, clique em
        <b> Concluir</b> para salvar seu cardápio.
      </p>

      <div className="rounded-xl border p-4">
        <div className="text-sm">
          <b>Categorias:</b> {selected.join(", ") || "-"}
        </div>
        <div className="text-sm mt-1">
          <b>Total de itens:</b> {totalItems}
        </div>
      </div>

      <div className="pt-2 flex justify-between">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="rounded-lg border px-4 py-2 hover:bg-zinc-50"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={handleFinish}
          className="rounded-lg bg-rose-600 px-4 py-2 text-white hover:bg-rose-700"
        >
          Concluir
        </button>
      </div>
    </section>
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
          Cardápio
        </h1>
        <div className="mt-1 flex items-center gap-2 text-sm text-zinc-500">
          <span className="inline-flex items-center gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              className="opacity-70"
              aria-hidden
            >
              <path
                fill="currentColor"
                d="M7 2v2H5v2H3v14h18V6h-2V4h-2V2zm0 4h10v2H7zm-2 4h14v8H5z"
              />
            </svg>
            Assistente de criação de cardápio
          </span>
        </div>
      </header>

      {/* Stepper simples */}
      <div className="flex items-center gap-2 text-sm">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={
                "h-6 w-6 grid place-items-center rounded-full border " +
                (step === i
                  ? "bg-zinc-900 text-white"
                  : i < step
                  ? "bg-zinc-200"
                  : "bg-white")
              }
            >
              {i + 1}
            </div>
            {i < 2 && <div className="w-10 h-px bg-zinc-300" />}
          </div>
        ))}
      </div>

      {step === 0 && Step0}
      {step === 1 && Step1}
      {step === 2 && Step2}

      {/* Modal de edição */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        {draft && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                <button
                  className={
                    "rounded-lg px-3 py-1 border " +
                    (draft.type === "preparado" ? "bg-zinc-900 text-white" : "")
                  }
                  onClick={() =>
                    setDraft((d) => (d ? { ...d, type: "preparado" } : d))
                  }
                >
                  Item preparado
                </button>
                <button
                  className={
                    "rounded-lg px-3 py-1 border " +
                    (draft.type === "industrializado"
                      ? "bg-zinc-900 text-white"
                      : "")
                  }
                  onClick={() =>
                    setDraft((d) =>
                      d ? { ...d, type: "industrializado" } : d
                    )
                  }
                >
                  Item industrializado
                </button>
              </div>
              <button
                onClick={() => setModalOpen(false)}
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
                onChange={(e) =>
                  setDraft((d) =>
                    d ? { ...d, imageFile: e.target.files?.[0] ?? undefined } : d
                  )
                }
              />
              {draft.imageFile || draft.imageUrl ? (
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
                  value={draft.name}
                  onChange={(e) =>
                    setDraft((d) => (d ? { ...d, name: e.target.value } : d))
                  }
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Descrição</label>
                <textarea
                  value={draft.description ?? ""}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, description: e.target.value } : d
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
                  value={draft.price ?? 0}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, price: Number(e.target.value) } : d
                    )
                  }
                  className="mt-1 w-full max-w-[200px] rounded-lg border px-3 py-2"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                className="rounded-lg border px-4 py-2 hover:bg-zinc-50"
                onClick={() => setModalOpen(false)}
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
    </div>
  );
}
