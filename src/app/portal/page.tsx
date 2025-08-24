"use client";

import React, { useState, FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PortalParceiro() {
  const [logoSrc, setLogoSrc] = useState<string>("/logo.png");
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    router.push(`/login?email=${encodeURIComponent(email)}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-50 to-rose-100 grid place-items-center px-4 py-10">
      <div className="w-full max-w-5xl grid gap-8 lg:grid-cols-2 items-stretch">
        {/* Painel esquerdo */}
        <section className="rounded-3xl bg-rose-100/80 border shadow-sm p-8 lg:p-12 flex flex-col items-center justify-center text-center">
          <div className="rounded-full bg-white shadow-md p-3 mb-6">
            <Image src={logoSrc} alt="Logo" width={120} height={120} className="rounded-full"
              onError={() => { if (logoSrc !== "/file.svg") setLogoSrc("/file.svg"); }} />
          </div>
          <h1 className="text-3xl font-semibold">Portal do Parceiro</h1>
          <p className="mt-2 text-zinc-600">Gerencie sua loja de forma fácil e rápida</p>
        </section>

        {/* Cartão à direita */}
        <section className="rounded-3xl bg-white border shadow-lg p-8 lg:p-12 flex flex-col justify-center">
          <h2 className="text-3xl font-semibold text-center">Portal do Parceiro</h2>
          <p className="mt-2 text-center text-zinc-600">
            Gerencie sua loja de forma fácil e rápida
          </p>

          <form onSubmit={onSubmit} className="mt-8">
            <label className="block text-sm font-medium text-zinc-800">E-mail</label>
            <input
              type="email"
              placeholder="nome@email.com.br"
              className="mt-2 w-full h-12 rounded-xl border px-4 bg-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <p className="mt-2 text-sm text-zinc-500">
              Preencha os campos destacados para prosseguir
            </p>

            <button
              type="submit"
              disabled={!email || loading}
              className="mt-6 w-full h-12 rounded-xl bg-rose-500 text-white font-medium shadow-[0_6px_0_#d34b4b] active:translate-y-[2px] active:shadow-[0_4px_0_#d34b4b] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Carregando..." : "Avançar"}
            </button>

            <p className="mt-6 text-center text-sm">
              Ainda não tem cadastro? {" "}
              <Link href="/signup" className="text-rose-600 hover:underline">
                Cadastre sua loja
              </Link>
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}