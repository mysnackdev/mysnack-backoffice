"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onValue, ref } from "firebase/database";
import { AuthService } from "@/services/auth.service";
import { db } from "../../../firebase";
import { useAuth } from "@/context/AuthContext";

type Props = { children: React.ReactNode };

type StoreProfile = Partial<{
  displayName: string;
  storeName: string;
  nome: string;
  name: string;
}>;

/**
 * Sidebar recebe o nome da EMPRESA a partir de `backoffice/storeProfile`.
 * Fallback: displayName do usuário ou prefixo do e-mail.
 */
export default function DashboardShell({ children }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [storeName, setStoreName] = React.useState<string | null>(null);

  const handleSignOut = async () => {
    try {
      await AuthService.signOut();
    } finally {
      router.replace("/");
    }
  };

  React.useEffect(() => {
    const r = ref(db, "backoffice/storeProfile");
    const off = onValue(
      r,
      (snap) => {
        const v: StoreProfile | null = snap.exists()
          ? (snap.val() as StoreProfile)
          : null;
        const name = v?.displayName ?? v?.storeName ?? v?.nome ?? v?.name ?? null;
        setStoreName(name);
      },
      (err) => {
        console.error("onValue(storeProfile) error:", err);
        setStoreName(null);
      }
    );
    return () => off();
  }, []);

  const userFallback =
    user?.displayName || (user?.email ? user.email.split("@")[0] : null);
  const company = storeName || userFallback || "Minha Empresa";

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="grid grid-cols-12 gap-4">
        {/* Sidebar */}
        <aside className="col-span-12 md:col-span-3 lg:col-span-3 xl:col-span-2 bg-white border-r min-h-screen p-4">
          <div className="mb-4">
            <div className="text-lg font-semibold">MySnack</div>
            <div className="text-xs text-zinc-500">{company}</div>
          </div>

          <div className="mb-4 rounded-lg border bg-rose-50 p-3 text-sm">
            <div className="font-medium text-rose-700">Loja fechada</div>
            <div className="text-rose-700/80">Em configuração</div>
          </div>

          <nav className="space-y-1 text-sm">
            <Link className="block rounded-md px-3 py-2 hover:bg-zinc-100" href="/">
              Início
            </Link>

            <div className="mt-3 text-xs uppercase text-zinc-500 px-3">
              Configurações
            </div>
            <Link className="block rounded-md px-3 py-2 hover:bg-zinc-100" href="#">
              Forma de pagamento
            </Link>
            <Link className="block rounded-md px-3 py-2 hover:bg-zinc-100" href="#">
              Configurações de entrega
            </Link>
            <Link className="block rounded-md px-3 py-2 hover:bg-zinc-100" href="#">
              Horário de funcionamento
            </Link>
            <Link className="block rounded-md px-3 py-2 hover:bg-zinc-100" href="#">
              Minha loja
            </Link>
            <Link className="block rounded-md px-3 py-2 hover:bg-zinc-100" href="#">
              Financeiro
            </Link>
            <Link className="block rounded-md px-3 py-2 hover:bg-zinc-100" href="#">
              Cardápio
            </Link>

            <div className="mt-4 border-t pt-3 px-3 text-xs uppercase text-zinc-500">
              Conta
            </div>
            <button
              onClick={handleSignOut}
              className="block text-left w-full rounded-md px-3 py-2 hover:bg-zinc-100"
            >
              Sair
            </button>
          </nav>
        </aside>

        {/* Content */}
        <main className="col-span-12 md:col-span-9 lg:col-span-9 xl:col-span-10 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
