"use client";

import { FormEvent, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "../../../firebase";
import { get, ref } from "firebase/database";

export default function LoginPage() {
  const qp = useSearchParams();
  const pre = qp.get("email") ?? "";
  const [email, setEmail] = useState(pre);
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);

      // checa papel em users/{uid}/role, com fallback em roles/{uid}
      const roleSnap = await get(ref(db, `backoffice/users/${cred.user.uid}/role`));
      let role = (roleSnap.val() as string | null) || null;
      if (!role) {
        const r2 = await get(ref(db, `backoffice/roles/${cred.user.uid}`));
        role = (r2.val() as string | null) || null;
      }
      if (!role || !["admin", "operacao", "viewer"].includes(role)) {
        throw new Error("forbidden");
      }

      router.replace("/");
    } catch (err: any) {
      console.error("Login error:", err);
      router.replace("/portal?e=forbidden");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center px-4 py-10">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl border bg-white shadow-sm p-8">
        <h1 className="text-2xl font-bold mb-6">Entrar</h1>
        <input
          className="w-full border rounded-xl p-2 mb-3"
          placeholder="E-mail" type="email"
          value={email} onChange={(e)=>setEmail(e.target.value)} required
        />
        <input
          className="w-full border rounded-xl p-2 mb-4"
          placeholder="Senha" type="password"
          value={pass} onChange={(e)=>setPass(e.target.value)} required
        />
        <button
          className="w-full rounded-xl bg-zinc-900 text-white p-2 mb-3 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
        <div className="text-sm flex justify-between">
          <Link href="/signup" className="text-zinc-700 hover:underline">Criar conta</Link>
          <Link href="/forgot" className="text-zinc-700 hover:underline">Esqueci minha senha</Link>
        </div>
      </form>
    </main>
  );
}
