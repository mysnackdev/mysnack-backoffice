"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { AuthService } from "@/services/auth.service";

// Helpers para extrair mensagem sem usar `any`
function isErrorWithMessage(e: unknown): e is { message: string } {
  return (
    typeof e === "object" &&
    e !== null &&
    "message" in e &&
    typeof (e as { message: unknown }).message === "string"
  );
}
function getErrorMessage(err: unknown, fallback = "Falha ao entrar"): string {
  if (typeof err === "string") return err;
  if (isErrorWithMessage(err)) return err.message;
  return fallback;
}

export default function LandingPortal() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [step, setStep] = React.useState<1 | 2>(1);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onAdvance(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (step === 1) {
      setStep(2);
      return;
    }

    try {
      setLoading(true);
      await AuthService.signIn(email, password);
      router.replace("/");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-2rem)] flex items-center justify-center bg-gradient-to-b from-rose-50 to-rose-100 p-6">
      <div className="grid md:grid-cols-2 gap-8 max-w-5xl w-full">
        <div className="rounded-3xl bg-white/60 backdrop-blur border border-rose-100 p-10">
          <div className="w-20 h-20 mx-auto mb-6 overflow-hidden rounded-full shadow">
            <Image src="/logo.svg" alt="mysnack" width={80} height={80} />
          </div>
          <h1 className="text-2xl font-semibold text-center mb-2">Portal do Parceiro</h1>
          <p className="text-center text-zinc-600">Gerencie sua loja de forma fácil e rápida</p>
        </div>

        <form onSubmit={onAdvance} className="rounded-3xl bg-white shadow p-8 space-y-4 border" aria-busy={loading}>
          <h2 className="text-xl font-semibold text-center">Portal do Parceiro</h2>
          <p className="text-sm text-zinc-600 text-center">Gerencie sua loja de forma fácil e rápida</p>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <label className="block text-sm">
            E-mail
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              className="mt-1 w-full rounded-lg border p-2"
              placeholder="nome@email.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          {step === 2 && (
            <label className="block text-sm">
              Senha
              <input
                type="password"
                autoComplete="current-password"
                className="mt-1 w-full rounded-lg border p-2"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
          )}

          <button
            type="submit"
            disabled={loading || !email || (step === 2 && !password)}
            className="w-full rounded-lg bg-rose-600 text-white py-2 shadow hover:brightness-110 disabled:opacity-60"
          >
            {step === 1 ? "Avançar" : (loading ? "Entrando..." : "Entrar")}
          </button>

          <p className="text-sm text-center">
            Ainda não tem cadastro?{" "}
            <a href="/signup" className="text-rose-600 underline">
              Cadastre sua loja
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
