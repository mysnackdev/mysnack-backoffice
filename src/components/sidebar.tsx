"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";

function itemClass(active: boolean) {
  return "block px-4 py-2 rounded-xl " + (active ? "bg-zinc-900 text-white" : "hover:bg-zinc-100");
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    try {
      await signOut(auth);
      router.replace("/login");
    } catch {
      // opcional: exibir toast/erro
    }
  }

  const path = pathname ?? "";
  const isHome = path === "/";
  const isProducts = path.startsWith("/products");
  const isShop = path.startsWith("/shop");

  return (
    <aside className="w-72 shrink-0 border-r border-zinc-200 p-4 bg-white h-screen sticky top-0">
      <div className="px-2 pb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-zinc-900" />
          <div>
            <p className="font-semibold">MySnack</p>
            <p className="text-xs text-zinc-500">Backoffice</p>
          </div>
        </div>
      </div>

      <nav className="space-y-2" aria-label="Navegação principal">
        <Link
          href="/"
          className={itemClass(isHome)}
          aria-current={isHome ? "page" : undefined}
        >
          Início
        </Link>

        <Link
          href="/products"
          className={itemClass(isProducts)}
          aria-current={isProducts ? "page" : undefined}
        >
          Cardápio
        </Link>

        <Link
          href="/shop"
          className={itemClass(isShop)}
          aria-current={isShop ? "page" : undefined}
        >
          Minha loja
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
