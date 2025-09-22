"use client";
import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  getShoppingCF,
  updateShoppingCF,
  submitShoppingLikertCF,
  listChairsCF,
  upsertChairCF,
  deleteChairCF,
  createShoppingCF,
  type Shop,
  type Chair,
  type LikertSummary
} from "@/services/admin.service";

export default function Page() {
  const searchParams = useSearchParams();
  const slug = (searchParams?.get("slug") || "").trim();

  const [shop, setShop] = React.useState<Shop | null>(null);
  const [form, setForm] = React.useState<{ name?: string; address?: string; lat?: string; lng?: string }>({});
  const [likert, setLikert] = React.useState<LikertSummary | null>(null);
  const [chairs, setChairs] = React.useState<Chair[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [tempName, setTempName] = React.useState<string>("");

  React.useEffect(() => {
    let active = true;
    (async () => {
      if (!slug) { setLoading(false); return; }
      const info = await getShoppingCF(slug);
      if (!active) return;
      setShop(info as Shop);
      setForm({
        name: info?.name ?? "",
        address: info?.address ?? "",
        lat: info?.lat != null ? String(info!.lat) : "",
        lng: info?.lng != null ? String(info!.lng) : "",
      });
      const list = await listChairsCF(slug);
      if (!active) return;
      setChairs(list || []);
      setLikert(info?.likert ?? null);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [slug]);

  async function saveShop(e: React.FormEvent) {
    e.preventDefault();
    const payload: Partial<Shop> & { slug: string } = { slug };
    if (form.name !== undefined) payload.name = form.name;
    if (form.address !== undefined) payload.address = form.address;
    const lat = Number(form.lat); if (!Number.isNaN(lat)) payload.lat = lat;
    const lng = Number(form.lng); if (!Number.isNaN(lng)) payload.lng = lng;
    const updated = await updateShoppingCF(payload);
    setShop((prev) => prev ? ({ ...prev, ...payload }) : updated);
  }

  async function vote(v: number) {
    const result = await submitShoppingLikertCF({ slug, value: v });
    setLikert(result);
  }

  async function addChair(fd: FormData) {
    const label = String(fd.get("label") || "").trim();
    const capacity = Number(fd.get("capacity"));
    const created = await upsertChairCF({ slug, chair: { label, capacity: Number.isFinite(capacity) ? capacity : undefined } });
    setChairs((prev) => [...prev, created as Chair]);
  }

  async function removeChair(id: string) {
    await deleteChairCF({ slug, id });
    setChairs((prev) => prev.filter((c) => c.id !== id));
  }

  const isEmpty = !!slug && !shop?.name && !shop?.address && shop?.lat == null && shop?.lng == null;

  if (!slug) {
    return (
      <div className="max-w-xl mx-auto p-6 space-y-4">
        <h1 className="text-xl font-semibold">Detalhes do shopping</h1>
        <p className="text-sm text-muted-foreground">Passe um <code>?slug=</code> na URL, por exemplo: <code>/shopping?slug=novo</code></p>
        <Link href="/" className="text-blue-600 underline">Voltar</Link>
      </div>
    );
  }

  if (loading) {
    return <div className="p-6">Carregando…</div>;
  }

  if (isEmpty) {
    return (
      <div className="max-w-xl mx-auto p-6 space-y-4">
        <h1 className="text-xl font-semibold">Criar shopping “{slug}”</h1>
        <p className="text-sm text-muted-foreground">Não encontramos dados para este slug. Crie o registro inicial informando um nome.</p>
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const created = await createShoppingCF({ name: tempName || slug, slug });
            setShop(created);
          }}
        >
          <input className="border rounded-lg px-3 py-2 flex-1" placeholder="Nome do shopping" value={tempName} onChange={(e)=>setTempName(e.target.value)} />
          <button className="border rounded-lg px-3 py-2">Criar</button>
        </form>
        <Link href="/" className="text-blue-600 underline">Voltar</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Shopping: {shop?.name || slug}</h1>
        <Link href="/" className="text-blue-600 underline">Voltar</Link>
      </div>

      {/* Dados básicos */}
      <section className="rounded-xl border p-4 space-y-3">
        <div className="font-semibold">Dados</div>
        <form onSubmit={saveShop} className="grid gap-2">
          <input className="border rounded-lg px-3 py-2" placeholder="Nome" value={form.name ?? ""} onChange={(e)=>setForm(p=>({...p,name:e.target.value}))} />
          <input className="border rounded-lg px-3 py-2" placeholder="Endereço" value={form.address ?? ""} onChange={(e)=>setForm(p=>({...p,address:e.target.value}))} />
          <div className="grid grid-cols-2 gap-2">
            <input className="border rounded-lg px-3 py-2" placeholder="Lat" value={form.lat ?? ""} onChange={(e)=>setForm(p=>({...p,lat:e.target.value}))} />
            <input className="border rounded-lg px-3 py-2" placeholder="Lng" value={form.lng ?? ""} onChange={(e)=>setForm(p=>({...p,lng:e.target.value}))} />
          </div>
          <button className="border rounded-lg px-3 py-2 w-fit">Salvar</button>
        </form>
      </section>

      {/* Likert */}
      <section className="rounded-xl border p-4 space-y-3">
        <div className="font-semibold">Avaliação (Likert 1–5)</div>
        <div className="flex gap-2">
          {[1,2,3,4,5].map((v) => (
            <button key={v} onClick={()=>vote(v)} className="border rounded-lg px-3 py-1">{v}</button>
          ))}
        </div>
        {likert ? (
          <div className="text-sm text-muted-foreground">
            Média: {Number(likert.avg || 0).toFixed(2)} • Votos: {likert.count || 0}
          </div>
        ) : <div className="text-sm text-muted-foreground">Ainda sem votos.</div>}
      </section>

      {/* Cadeiras */}
      <section className="rounded-xl border p-4 space-y-3">
        <div className="font-semibold">Cadeiras</div>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={async (e)=>{
            e.preventDefault();
            const formEl = e.currentTarget as HTMLFormElement;
            const fd = new FormData(formEl);
            await addChair(fd);
            formEl.reset();
          }}
        >
          <input name="label" placeholder="Rótulo" className="border rounded-lg px-3 py-2" />
          <input name="capacity" placeholder="Capacidade" className="border rounded-lg px-3 py-2" />
          <button className="border rounded-lg px-3 py-2">Adicionar</button>
        </form>

        <div className="grid sm:grid-cols-2 gap-2">
          {chairs.map((c) => (
            <div key={c.id} className="border rounded-lg p-3 flex items-center justify-between">
              <div>
                <div className="font-medium">{c.label}</div>
                <div className="text-xs text-muted-foreground">Capacidade: {c.capacity ?? "-"}</div>
              </div>
              <button onClick={()=>removeChair(String(c.id))} className="text-red-600 underline text-sm">Remover</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
