"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthService } from "@/services/auth.service";
import { useAuth } from "@/context/AuthContext";

// Type guard: verifica se o objeto possui uma string em `message`
function isErrorWithMessage(e: unknown): e is { message: string } {
  return typeof e === "object" && e !== null && "message" in e && typeof (e as { message: unknown }).message === "string";
}

// Extrai mensagem de erro de forma segura, sem usar `any`
function getErrorMessage(err: unknown, fallback = "Erro ao enviar e-mail de recuperação"): string {
  if (typeof err === "string") return err;
  if (isErrorWithMessage(err)) return err.message;
  return fallback;
}

export default function ForgotPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) router.replace("/portal");
  }, [user, router]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await AuthService.forgot(email);
      setSent(true);
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
        <h1 className="text-lg font-semibold">Recuperar senha</h1>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {sent ? (
          <p className="text-sm text-green-700">
            Enviamos um link de redefinição para <strong>{email}</strong>.
          </p>
        ) : (
          <>
            <label className="block text-sm">
              E-mail
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                className="mt-1 w-full rounded-md border p-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-zinc-900 text-white py-2"
            >
              {loading ? "Enviando..." : "Enviar link"}
            </button>
          </>
        )}

        <div className="flex justify-between text-sm">
          <Link className="underline" href="/login">
            Voltar ao login
          </Link>
          <Link className="underline" href="/signup">
            Criar conta
          </Link>
        </div>
      </form>
    </div>
  );
}
