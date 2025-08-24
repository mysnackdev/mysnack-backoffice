"use client";

import React, {useEffect} from "react";
import {useAuth} from "@/context/AuthContext";
import {useRouter} from "next/navigation";
import Sidebar from "@/components/sidebar";

export default function ProtectedLayout({children}:{children: React.ReactNode}){
  const {user, role, loading} = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/portal"); return; }
    if (!(role === "admin" || role === "operacao")) {
      router.replace("/portal?e=forbidden");
    }
  }, [user, role, loading, router]);

  if (loading || !user) { return <div className="p-8">Carregando…</div>; }
  if (!(role === "admin" || role === "operacao")) {
    return <div className="p-8">Acesso negado.</div>;
  }

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-h-screen">
        <header className="flex items-center justify-end gap-3 p-4 border-b bg-white">
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
            Online
          </span>
          <div className="text-sm text-zinc-700">
            {user?.email}
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
