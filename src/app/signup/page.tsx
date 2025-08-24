"use client";

import { FormEvent, useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import type { FirebaseError } from "firebase/app";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "../../../firebase";
import { ref, set, update } from "firebase/database";

function PencilIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}


function formatPhoneBR(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}

function mapSignupError(err: FirebaseError): string {
  switch (err.code) {
    case "auth/weak-password":
      return "A senha precisa ter pelo menos 6 caracteres.";
    case "auth/invalid-email":
      return "E-mail inválido. Verifique o endereço digitado.";
    case "auth/email-already-in-use":
      return "Este e-mail já está em uso.";
    case "auth/network-request-failed":
      return "Falha de rede. Verifique sua conexão e tente novamente.";
    default:
      return "Não foi possível criar sua conta agora. Tente novamente.";
  }
}

export default function SignupPage() {
  const qp = useSearchParams();
  const preEmail = qp.get("email") ?? "";

  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [email, setEmail] = useState<string>(preEmail);
  const [pass, setPass] = useState<string>("");
  const [canEditEmail, setCanEditEmail] = useState<boolean>(preEmail ? false : false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [touched, setTouched] = useState<{name?: boolean; phone?: boolean; email?: boolean; pass?: boolean}>({});

  const router = useRouter();

  const isValid = !!name.trim() && !!phone.trim() && !!email.trim() && pass.length >= 6;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValid) { setTouched({name:true, phone:true, email:true, pass:true}); return; }

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      try { await updateProfile(cred.user, { displayName: name }); } catch {}

      const payload = {
        role: "operacao",
        accountType: "operacao",
        uid: cred.user.uid,
        name,
        phone,
        email,
        createdAt: Date.now(),
      };

      const updates: Record<string, any> = {};
      updates[`backoffice/users/${cred.user.uid}`] = payload;
      updates[`backoffice/roles/${cred.user.uid}`] = "operacao"; // índice rápido p/ permissões

      try {
        await update(ref(db), updates);
      } catch (err) {
        console.warn("RTDB multi-path update failed; falling back to sequential writes.", err);
        // Fallback em duas etapas (cada uma validada pelas regras)
        await set(ref(db, `backoffice/users/${cred.user.uid}`), payload);
        try { await set(ref(db, `backoffice/roles/${cred.user.uid}`), "operacao"); } catch {}
      }

      router.replace("/");
    } catch (e: any) {
      console.error("Signup error:", e);
      const msg = (e?.code ? mapSignupError(e as FirebaseError) : (e?.message || "Erro ao criar conta."));
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center px-4 py-10 bg-zinc-50">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl border bg-white shadow-sm p-8"
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-center">
          Que bom te ver por aqui!
        </h1>
        <p className="mt-1 text-center text-zinc-500">
          As informações abaixo serão usadas para iniciar o cadastro do seu restaurante
        </p>

        <label className="block mt-6 text-sm font-medium text-zinc-800">
          Nome completo*
        </label>
        <input
          required
          type="text"
          placeholder="Nome Sobrenome"
          className="mt-2 w-full h-11 rounded-xl border px-3 bg-white"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched((t)=>({...t, name:true}))}
        />

        <label className="block mt-4 text-sm font-medium text-zinc-800">
          Celular*
        </label>
        <input
          required
          type="tel"
          placeholder="(00) 00000-0000"
          className="mt-2 w-full h-11 rounded-xl border px-3 bg-white"
          value={phone}
          onChange={(e) => setPhone(formatPhoneBR(e.target.value))}
          onBlur={() => setTouched((t)=>({...t, phone:true}))}
          aria-invalid={touched.phone && phone.replace(/\D/g, "").length < 10}
        />

        <label className="block mt-4 text-sm font-medium text-zinc-800">
          E-mail*
        </label>
        <div className="relative mt-2">
          <input
            required
            type="email"
            placeholder="seu@email.com"
            className="w-full h-11 rounded-xl border pr-11 pl-3 bg-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setTouched((t)=>({...t, email:true}))}
            readOnly={!canEditEmail}
          />
          {touched.email && !email.trim() && (
            <p className="mt-1 text-xs text-red-600">Informe um e-mail válido.</p>
          )}
          <button
            type="button"
            onClick={() => setCanEditEmail((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-md hover:bg-zinc-100"
            aria-label={canEditEmail ? "Bloquear edição do e-mail" : "Editar e-mail"}
            title={canEditEmail ? "Bloquear edição do e-mail" : "Editar e-mail"}
          >
            <PencilIcon className="h-4 w-4 text-zinc-500" />
          </button>
        </div>
        {!canEditEmail && (
          <p className="mt-1 text-xs text-zinc-500">
            Para ajustar, volte para tela anterior
          </p>
        )}

        <label className="block mt-6 text-sm font-medium text-zinc-800">
          Senha*
        </label>
        <input
          required
          type="password"
          placeholder="Crie uma senha (6+)"
          className="mt-2 w-full h-11 rounded-xl border px-3 bg-white"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          onBlur={() => setTouched((t)=>({...t, pass:true}))}
        />

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          className="mt-6 h-11 w-full rounded-xl bg-rose-400 text-white font-medium disabled:opacity-60 disabled:cursor-not-allowed"
          disabled={loading || !isValid}
        >
          {loading ? "Criando..." : "Continuar"}
        </button>

        <div className="mt-4 text-sm text-center">
          Já tem conta?{" "}
          <Link href="/login" className="text-zinc-700 hover:underline">
            Entrar
          </Link>
        </div>
      </form>
    </main>
  );
}