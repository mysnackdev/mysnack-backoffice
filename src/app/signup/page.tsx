"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthService } from "@/services/auth.service";
import { useAuth } from "@/context/AuthContext";

// Helpers para extrair mensagem sem usar `any`
function isErrorWithMessage(e: unknown): e is { message: string } {
  return (
    typeof e === "object" &&
    e !== null &&
    "message" in e &&
    typeof (e as { message: unknown }).message === "string"
  );
}
function getErrorMessage(err: unknown, fallback = "Erro ao criar conta"): string {
  if (typeof err === "string") return err;
  if (isErrorWithMessage(err)) return err.message;
  return fallback;
}

export default function SignupPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) router.replace("/portal");
  }, [user, router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await AuthService.signUp(name, phone, email, password);
      router.replace("/portal");
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-4"
        aria-busy={loading}
      >
        <h1 className="text-lg font-semibold">Criar conta (operação)</h1>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <label className="block text-sm">
          Nome
          <input
            className="mt-1 w-full rounded-md border p-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        </label>

        <label className="block text-sm">
          Telefone
          <input
            className="mt-1 w-full rounded-md border p-2"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
          />
        </label>

        <label className="block text-sm">
          E-mail
          <input
            type="email"
            className="mt-1 w-full rounded-md border p-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            inputMode="email"
            autoComplete="email"
            required
          />
        </label>

        <label className="block text-sm">
          Senha
          <input
            type="password"
            className="mt-1 w-full rounded-md border p-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-zinc-900 text-white py-2"
        >
          {loading ? "Criando..." : "Criar conta"}
        </button>

        <div className="flex justify-between text-sm">
          <Link className="underline" href="/login">
            Já tenho conta
          </Link>
          <Link className="underline" href="/forgot">
            Esqueci minha senha
          </Link>
        </div>
      </form>
    </div>
  );
}
