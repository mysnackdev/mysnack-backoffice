// src/lib/completeness.ts
import { get, ref, update } from "firebase/database";
import { db } from "@/firebase";

export type CompletenessResult = { complete: boolean; missing: string[] };

/** --------- Tipos mínimos usados nas validações --------- */
type StoreProfileData = {
  nome?: string;
  displayName?: string;
  storeName?: string;
  name?: string;
  telefone?: string;
};

const PAYMENT_GROUPS = ["onDelivery", "appSite", "mysnackAwards", "banking"] as const;
type PaymentGroupName = typeof PAYMENT_GROUPS[number];
type PaymentRecord = Record<string, boolean>;
type PaymentGroup = PaymentRecord | boolean[];
type PaymentSettings = Partial<Record<PaymentGroupName, PaymentGroup>>;

type OpeningHoursDay = { enabled?: boolean } | null | undefined;
type OpeningHours = Record<string, OpeningHoursDay>;

type DeliveryModes = { delivery?: boolean; pickup?: boolean; inhouse?: boolean };
type DeliveryData = {
  enabled?: boolean;
  modes?: DeliveryModes;
  areas?: Record<string, unknown>;
};

type PayoutSettings = {
  provider?: "manual" | "stripe" | "pagarme";
  automatic?: boolean;
  cycle?: "semanal" | "mensal";
  dayOfWeek?: number;
  dayOfMonth?: number;
  minPayout?: number;
};

type BankAccount = {
  holderName?: string;
  cpfCnpj?: string;
  bankCode?: string;
  agency?: string;
  account?: string;
  accountType?: "corrente" | "poupanca" | "conta_pagamento";
  pixKeyType?: string;
  pixKey?: string;
};

type FinanceData = {
  bankAccount?: BankAccount;
  payout?: PayoutSettings;
  // outros campos ignorados para a checagem
};

function hasAnyTrue(group: PaymentGroup): boolean {
  if (Array.isArray(group)) return group.some(Boolean);
  return Object.values(group).some(Boolean);
}

export async function evaluateCompleteness(uid: string): Promise<CompletenessResult> {
  const [
    storeProfileSnap,
    paymentsSnap,
    openingHoursSnap,
    menusTenantSnap,
    menuLegacySnap,
    deliverySnap,
    financeSnap,
  ] = await Promise.all([
    get(ref(db, `backoffice/tenants/${uid}/storeProfile`)),
    get(ref(db, `backoffice/tenants/${uid}/payments`)),
    get(ref(db, `backoffice/tenants/${uid}/openingHours`)),
    get(ref(db, `backoffice/tenants/${uid}/menus`)),
    get(ref(db, `backoffice/stores/${uid}/menu/items`)),
    get(ref(db, `backoffice/tenants/${uid}/delivery`)),
    get(ref(db, `backoffice/tenants/${uid}/finance`)),
  ]);

  const storeProfile = (storeProfileSnap.exists() ? (storeProfileSnap.val() as unknown as StoreProfileData) : null);
  const payments     = (paymentsSnap.exists() ? (paymentsSnap.val() as unknown as PaymentSettings) : null);
  const openingHours = (openingHoursSnap.exists() ? (openingHoursSnap.val() as unknown as OpeningHours) : null);
  const menusTenant  = (menusTenantSnap.exists() ? (menusTenantSnap.val() as unknown as Record<string, unknown>) : null);
  const menuLegacy   = (menuLegacySnap.exists() ? (menuLegacySnap.val() as unknown as Record<string, unknown>) : null);
  const delivery     = (deliverySnap.exists() ? (deliverySnap.val() as unknown as DeliveryData) : null);
  const finance      = (financeSnap.exists() ? (financeSnap.val() as unknown as FinanceData) : null);

  const missing: string[] = [];

  // Minha loja
  const hasNome = !!(storeProfile?.nome || storeProfile?.displayName || storeProfile?.storeName || storeProfile?.name);
  const hasTel  = !!storeProfile?.telefone;
  if (!hasNome || !hasTel) {
    const sub: string[] = [];
    if (!hasNome) sub.push("nome da loja");
    if (!hasTel)  sub.push("telefone de contato");
    missing.push(`Minha loja (${sub.join(", ")})`);
  }

  // Pagamentos (>=1 método)
  let pagamentosOK = false;
  if (payments && typeof payments === "object") {
    pagamentosOK = PAYMENT_GROUPS.some((g) => {
      const v = payments[g];
      if (!v) return false;
      return hasAnyTrue(v);
    });
  }
  if (!pagamentosOK) missing.push("Forma de pagamento");

  // Horário (>=1 dia enabled)
  let horarioOK = false;
  if (openingHours && typeof openingHours === "object") {
    horarioOK = Object.values(openingHours).some((d) => !!d?.enabled);
  }
  if (!horarioOK) missing.push("Horário de funcionamento");

  // Cardápio (checa novos e legados)
  const hasItemsTenant = !!(menusTenant && typeof menusTenant === "object" && Object.keys(menusTenant).length > 0);
  const hasItemsLegacy = !!(menuLegacy && typeof menuLegacy === "object" && Object.keys(menuLegacy).length > 0);
  if (!(hasItemsTenant || hasItemsLegacy)) {
    missing.push("Cardápio (adicione pelo menos 1 item)");
  }

  // Delivery
  let deliveryOK = false;
  if (delivery && typeof delivery === "object") {
    const modes = delivery.modes || {};
    const areas = delivery.areas || {};
    const hasMode = !!(modes.delivery || modes.pickup || modes.inhouse);
    const hasArea = typeof areas === "object" && Object.keys(areas).length > 0;
    deliveryOK = delivery.enabled === true && hasMode && (modes.pickup || hasArea);
  }
  if (!deliveryOK) missing.push("Configurações de entrega");

  // Finance
  let financeOK = false;
  if (finance && typeof finance === "object") {
    const acc = finance.bankAccount || {};
    const po  = finance.payout || {};
    const baseOK =
      !!acc.holderName &&
      !!acc.cpfCnpj &&
      !!acc.bankCode &&
      !!acc.account &&
      !!acc.accountType &&
      (po.provider === "manual" || po.provider === "stripe" || po.provider === "pagarme") &&
      (po.automatic === true || po.automatic === false);
    financeOK = baseOK;
  }
  if (!financeOK) missing.push("Financeiro");

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
