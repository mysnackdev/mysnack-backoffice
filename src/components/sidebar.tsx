"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import { useAuth } from "@/context/AuthContext";
import { onValue, ref } from "firebase/database";
import { db } from "../../firebase";

function itemClass(active: boolean) {
  return "block px-4 py-2 rounded-xl " + (active ? "bg-zinc-900 text-white" : "hover:bg-zinc-100");
}

export default function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [storeName, setStoreName] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user) return;
    const r = ref(db, `backoffice/tenants/${user.uid}/storeProfile`);
    const off = onValue(
      r,
      (snap) => {
        const v = snap.exists() ? snap.val() : null;
        const nm = v?.displayName || v?.storeName || v?.nome || v?.name || null;
        setStoreName(nm);
      },
      () => setStoreName(null)
    );
    return () => off();
  }, [user]);

  async function handleSignOut() {
    try {
      await signOut(auth);
    } finally {
      router.replace("/login");
    }
  }

  // ✅ normalize pathname -> string e derive booleans
  const path = pathname ?? "";
  const isHome     = path === "/";
  const isMenus    = path.startsWith("/menus");
  const isPayments = path.startsWith("/payment-methods");
  const isDelivery = path.startsWith("/delivery-configuration");
  const isOpening  = path.startsWith("/opening-hours");
  const isShop     = path.startsWith("/my-store");

  return (
    <aside className="min-h-screen w-full max-w-[280px] border-r bg-white p-6 hidden md:block">
      <div className="mb-6">
        <div className="text-xl font-semibold">MySnack</div>
        {storeName ? <div className="text-xs text-zinc-500 mt-1">{storeName}</div> : null}
      </div>

      <nav className="space-y-2">
        <Link href="/" className={itemClass(isHome)} aria-current={isHome ? "page" : undefined}>
          Início
        </Link>

        <div className="pt-2 text-xs uppercase text-zinc-500 px-2">Configurações</div>

        <Link
          href="/payment-methods"
          className={itemClass(isPayments)}
          aria-current={isPayments ? "page" : undefined}
        >
          Forma de pagamento
        </Link>

        <Link
          href="/delivery-configuration"
          className={itemClass(isDelivery)}
          aria-current={isDelivery ? "page" : undefined}
        >
          Configurações de entrega
        </Link>

        <Link
          href="/opening-hours"
          className={itemClass(isOpening)}
          aria-current={isOpening ? "page" : undefined}
        >
          Horário de funcionamento
        </Link>

        <Link
          href="/my-store"
          className={itemClass(isShop)}
          aria-current={isShop ? "page" : undefined}
        >
          Minha loja
        </Link>

        <Link
          href="/menus"
          className={itemClass(isMenus)}
          aria-current={isMenus ? "page" : undefined}
        >
          Cardápio
        </Link>
      </nav>

      <div className="mt-auto pt-6">
        <button
          onClick={handleSignOut}
          className="w-full rounded-xl border px-4 py-2 hover:bg-zinc-50"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}
