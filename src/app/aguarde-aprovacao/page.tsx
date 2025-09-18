"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "../../../firebase";
import { useOperatorApproval } from "@/hooks/useOperatorApproval";

export default function Page() {
  const { user } = useAuth();
  const router = useRouter();
  const { approved, loading } = useOperatorApproval();

  React.useEffect(() => {
    if (!loading && approved) {
      router.replace("/");
      router.refresh();
    }
  }, [approved, loading, router]);

  const goLogin = async () => {
    if (user) await signOut(auth);
    router.replace("/login");
  };

  return (
    <main className="min-h-[80vh] flex items-center justify-center">
      <div className="max-w-xl w-full bg-white border rounded-2xl p-6 shadow-sm">
        <h1 className="text-xl font-semibold mb-2">Aguardando aprovação</h1>
        <p className="text-gray-600 text-sm">
          Seu cadastro foi enviado e está aguardando aprovação do responsável pela loja.
          Assim que o acesso for liberado, seu painel será exibido automaticamente.
        </p>
        <div className="mt-6 flex gap-3">
          <button onClick={() => router.refresh()} className="px-4 py-2 rounded-lg border">Atualizar</button>
          <button onClick={goLogin} className="px-4 py-2 rounded-lg border">Sair</button>
        </div>
      </div>
    </main>
  );
}
