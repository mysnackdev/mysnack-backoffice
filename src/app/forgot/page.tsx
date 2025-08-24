"use client";

import {FormEvent, useState} from "react";
import {sendPasswordResetEmail} from "firebase/auth";
import Link from "next/link";
import {auth} from "../../../firebase";

export default function ForgotPage() {
  const [email, setEmail] = useState(""); const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch {
      alert("Não foi possível enviar o e-mail de recuperação.");
    }
  }

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <form onSubmit={onSubmit}
        className="bg-white w-full max-w-sm rounded-2xl border p-6 space-y-4">
        <h1 className="text-xl font-semibold">Recuperar senha</h1>
        <input className="w-full border rounded-xl p-2"
          placeholder="E-mail" type="email"
          value={email} onChange={(e)=>setEmail(e.target.value)} required />
        <button className="w-full rounded-xl bg-zinc-900 text-white p-2">
          Enviar instruções
        </button>
        {sent && (
          <p className="text-sm text-emerald-700">
            Verifique seu e-mail para redefinir a senha.
          </p>
        )}
        <div className="text-sm">
          <Link href="/login" className="text-zinc-700 hover:underline">
            Voltar ao login
          </Link>
        </div>
      </form>
    </main>
  );
}
