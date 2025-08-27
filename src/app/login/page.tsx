"use client";
import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthService } from "@/services/auth.service";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (user) router.replace("/portal");
  }, [user, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await AuthService.signIn(email, password);
      router.replace("/portal");
    } catch (err: any) {
      setError(err?.message ?? "Erro ao entrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-2xl shadow p-6 space-y-4">
        <h1 className="text-lg font-semibold">Entrar no Backoffice</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <label className="block text-sm">
          E-mail
          <input type="email" className="mt-1 w-full rounded-md border p-2" value={email} onChange={(e)=>setEmail(e.target.value)} required />
        </label>
        <label className="block text-sm">
          Senha
          <input type="password" className="mt-1 w-full rounded-md border p-2" value={password} onChange={(e)=>setPassword(e.target.value)} required />
        </label>
        <button disabled={loading} className="w-full rounded-md bg-zinc-900 text-white py-2">{loading? "Entrando..." : "Entrar"}</button>
        <div className="flex justify-between text-sm">
          <Link className="underline" href="/signup">Criar conta</Link>
          <Link className="underline" href="/forgot">Esqueci minha senha</Link>
        </div>
      </form>
    </div>
  );
}
