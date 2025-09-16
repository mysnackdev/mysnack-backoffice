"use client";

import { useEffect, useRef, useState } from "react";
import { getAuth } from "firebase/auth";
import { getDatabase, ref, onValue } from "firebase/database";
import type { FirebaseApp } from "firebase/app";

export type ApprovalState = {
  loading: boolean;
  approved: boolean;
  storeId: string | null;
};

/**
 * Observa aprovação do operador em tempo real.
 * Regras de combinação (para evitar estados divergentes):
 *  - Se QUALQUER fonte disser explicitamente FALSE -> approved = false
 *  - Caso contrário, se QUALQUER fonte disser TRUE -> approved = true
 *  - Caso nenhuma fonte exista -> false
 * Fontes monitoradas:
 *  A) /backoffice/operators/{uid}  (approved, storeId)
 *  B) /backoffice/users/{uid}/storeId  -> /backoffice/tenants/{storeId}/operators/{uid}/approved
 */
export function useOperatorApproval(app: FirebaseApp): ApprovalState {
  const [state, setState] = useState<ApprovalState>({
    loading: true,
    approved: false,
    storeId: null,
  });

  const opApprovedRef = useRef<boolean | null>(null);
  const opStoreIdRef = useRef<string | null>(null);

  const tenApprovedRef = useRef<boolean | null>(null);
  const userStoreIdRef = useRef<string | null>(null);

  const publish = () => {
    const storeId = opStoreIdRef.current ?? userStoreIdRef.current ?? null;
    const vals: Array<boolean | null> = [opApprovedRef.current, tenApprovedRef.current];
    // Dominância do FALSE explícito
    const anyFalse = vals.some(v => v === false);
    const anyTrue  = vals.some(v => v === true);
    const approved = anyFalse ? false : (anyTrue ? true : false);

    setState(prev => {
      const next = { loading: false, approved, storeId };
      if (prev.loading !== next.loading || prev.approved !== next.approved || prev.storeId !== next.storeId) {
        return next;
      }
      return prev;
    });
  };

  useEffect(() => {
    const auth = getAuth();
    const db = getDatabase(app);
    let unsubs: Array<() => void> = [];

    const stop = () => {
      unsubs.forEach(fn => { try { fn(); } catch {} });
      unsubs = [];
    };

    const offAuth = auth.onAuthStateChanged(user => {
      stop();
      opApprovedRef.current = null;
      opStoreIdRef.current = null;
      tenApprovedRef.current = null;
      userStoreIdRef.current = null;

      if (!user) {
        setState({ loading: false, approved: false, storeId: null });
        return;
      }

      // A) /backoffice/operators/{uid}
      {
        const r = ref(db, `backoffice/operators/${user.uid}`);
        const off = onValue(
          r,
          snap => {
            const v = (snap.val() as { approved?: boolean | string | number; storeId?: string | number } ) || {};
            // importante: FALSE explícito deve aparecer como false, não null
            opApprovedRef.current = (v?.approved === true || v?.approved === "true" || v?.approved === 1)
              ? true
              : (v?.approved === false || v?.approved === "false" || v?.approved === 0)
              ? false
              : null;
            opStoreIdRef.current = v?.storeId ? String(v.storeId) : null;
            publish();
          },
          () => {
            opApprovedRef.current = null;
            publish();
          }
        );
        unsubs.push(off);
      }

      // B) /backoffice/users/{uid}/storeId -> /backoffice/tenants/{sid}/operators/{uid}/approved
      {
        let offTenant: null | (() => void) = null;
        const rStore = ref(db, `backoffice/users/${user.uid}/storeId`);
        const off = onValue(
          rStore,
          s => {
            userStoreIdRef.current = s.exists() ? String(s.val()) : null;
            // rewire tenant subscription
            if (offTenant) { try { offTenant(); } catch {} ; offTenant = null; }
            const sid = userStoreIdRef.current;
            if (sid) {
              const r = ref(db, `backoffice/tenants/${sid}/operators/${user.uid}/approved`);
              offTenant = onValue(
                r,
                ap => {
                  const v = ap.val();
                  tenApprovedRef.current = (v === true || v === "true" || v === 1)
                    ? true
                    : (v === false || v === "false" || v === 0)
                    ? false
                    : null;
                  publish();
                },
                () => {
                  tenApprovedRef.current = null;
                  publish();
                }
              );
              unsubs.push(() => { if (offTenant) offTenant(); });
            } else {
              tenApprovedRef.current = null;
              publish();
            }
          },
          () => {
            userStoreIdRef.current = null;
            publish();
          }
        );
        unsubs.push(off);
      }
    });

    return () => {
      offAuth();
      stop();
    };
  }, [app]);

  return state;
}
