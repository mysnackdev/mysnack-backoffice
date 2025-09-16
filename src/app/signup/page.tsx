"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthService, SignUpInput } from "@/services/auth.service";
import { useAuth } from "@/context/AuthContext";

function isErrorWithMessage(e: unknown): e is { message: string } {
  return typeof e === "object" && e !== null && "message" in e && typeof (e as { message: unknown }).message === "string";
}

export default function SignupPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"operacao" | "operador">("operacao");

  // Campos extras
  const [cnpj, setCnpj] = useState("");          // obrigatório para ambos
  const [razao, setRazao] = useState("");        // obrigatório para operacao

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload: SignUpInput = { name, phone, email, password, role, cnpj, razaoSocial: razao };
      await AuthService.signUp(payload);
      router.replace("/");
    } catch (e) {
      setError(isErrorWithMessage(e) ? e.message : "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100vh] grid place-items-center bg-rose-50 p-6">
      <form onSubmit={onSubmit} className="w-full max-w-xl space-y-4 rounded-2xl bg-white p-6 shadow border">
        <h1 className="text-xl font-semibold">Criar conta</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRole("operacao")}
            className={"px-3 py-1.5 rounded-md border " + (role === "operacao" ? "bg-black text-white" : "bg-white")}
          >
            Sou operação
          </button>
          <button
            type="button"
            onClick={() => setRole("operador")}
            className={"px-3 py-1.5 rounded-md border " + (role === "operador" ? "bg-black text-white" : "bg-white")}
          >
            Sou operador
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <label className="block text-sm">Nome completo
            <input className="mt-1 w-full rounded-md border p-2" value={name} onChange={(e)=>setName(e.target.value)} required />
          </label>
          <label className="block text-sm">Telefone
            <input className="mt-1 w-full rounded-md border p-2" value={phone} onChange={(e)=>setPhone(e.target.value)} required />
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <label className="block text-sm">E-mail
            <input type="email" className="mt-1 w-full rounded-md border p-2" value={email} onChange={(e)=>setEmail(e.target.value)} required />
          </label>
          <label className="block text-sm">Senha
            <input type="password" className="mt-1 w-full rounded-md border p-2" value={password} onChange={(e)=>setPassword(e.target.value)} required />
          </label>
        </div>

        {/* Campos específicos */}
        <div className="grid md:grid-cols-2 gap-3">
          <label className="block text-sm">CNPJ {role === "operacao" ? "(da empresa)" : "(da loja)"}
            <input className="mt-1 w-full rounded-md border p-2" value={cnpj} onChange={(e)=>setCnpj(e.target.value)} required />
          </label>
          {role === "operacao" && (
            <label className="block text-sm">Razão Social
              <input className="mt-1 w-full rounded-md border p-2" value={razao} onChange={(e)=>setRazao(e.target.value)} required />
            </label>
          )}
        </div>

        <button type="submit" disabled={loading} className="w-full rounded-md bg-zinc-900 text-white py-2">
          {loading ? "Criando..." : "Criar conta"}
        </button>

        <div className="text-sm flex justify-between">
          <Link href="/login" className="underline">Já tenho conta</Link>
          <Link href="/forgot" className="underline">Esqueci minha senha</Link>
        </div>
      </form>
    </div>
  );
}
