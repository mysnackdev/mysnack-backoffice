// src/lib/completeness.ts
import { get, ref, update } from "firebase/database";
import { db } from "@/firebase";

export type CompletenessResult = { complete: boolean; missing: string[] };

/**
 * Regra de 2025‑09‑24
 * - Métodos de pagamento NÃO são obrigatórios para ficar online.
 * - `cadastroCompleto` = true quando:
 *    1) Loja tem NOME (em qualquer um dos campos conhecidos) e
 *    2) Loja tem TELEFONE (storeProfile.telefone OU users/{uid}.phone) e
 *    3) Loja está vinculada a um SHOPPING (stores/{uid}.shoppingSlug)
 *
 * Observação: este módulo é resiliente às variações de caminho já usadas no app:
 *  - Perfil: `backoffice/tenants/{uid}/storeProfile`
 *  - Usuário: `backoffice/users/{uid}`
 *  - Shopping: `backoffice/stores/{uid}.shoppingSlug`
 */
type StoreProfileData = {
  shoppingSlug?: string | null;
  // possíveis chaves de nome usadas no projeto:
  nome?: string; displayName?: string; storeName?: string; name?: string;
  // possíveis chaves de telefone:
  telefone?: string | null; phone?: string | null;
};

function pickName(p: Partial<StoreProfileData>): string | undefined {
  return p.nome || p.displayName || p.storeName || p.name;
}

function pickPhone(p: Partial<StoreProfileData>, user?: { phone?: string | null }): string | undefined {
  return (p.telefone as string) || (p.phone as string) || (user?.phone as string) || undefined;
}

export async function evaluateCompleteness(uid: string): Promise<CompletenessResult> {
  // Leituras paralelas e tolerantes ao schema:
  const [profileSnap, userSnap, storeSnap] = await Promise.all([
    get(ref(db, `backoffice/tenants/${uid}/storeProfile`)),
    get(ref(db, `backoffice/users/${uid}`)),
    get(ref(db, `backoffice/stores/${uid}`)),
  ]);

  const profile = (profileSnap.exists() ? profileSnap.val() : {}) as Partial<StoreProfileData>;
  const user = (userSnap.exists() ? userSnap.val() : {}) as { phone?: string | null };
  const store = (storeSnap.exists() ? storeSnap.val() : {}) as { shoppingSlug?: string | null };

  const missing: string[] = [];

  const name = pickName(profile);
  if (!name) missing.push("Nome da loja");

  const phone = pickPhone(profile, user);
  if (!phone) missing.push("Telefone de contato");

  const shoppingSlug = (profile.shoppingSlug ?? store.shoppingSlug) as string | null | undefined;
  if (!shoppingSlug) missing.push("Vínculo com shopping");

  return { complete: missing.length === 0, missing };
}

export async function syncSetupStatus(uid: string): Promise<CompletenessResult> {
  const result = await evaluateCompleteness(uid);
  await update(ref(db, `backoffice/stores/${uid}/status`), {
    cadastroCompleto: result.complete,
    setup: result.complete ? "configurado" : "em_configuracao",
    setupUpdatedAt: Date.now(),
  });
  return result;
}