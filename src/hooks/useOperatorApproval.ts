"use client";

import { useEffect, useRef, useState } from "react";
import { ref, onValue, get } from "firebase/database";
import { auth, db } from "@/services/firebase";

export type ApprovalState = {
  loading: boolean;
  approved: boolean;
  storeId: string | null;
};

type OperatorIndex = { storeId?: string | null; approved?: boolean | string | number; owner?: boolean };

export function useOperatorApproval(): ApprovalState {
  const [state, setState] = useState<ApprovalState>({ loading: true, approved: false, storeId: null });

  const opStoreIdRef = useRef<string | null>(null);
  const userStoreIdRef = useRef<string | null>(null);
  const opApprovedRef = useRef<boolean | null>(null);
  const tenApprovedRef = useRef<boolean | null>(null);

  const computeStoreId = () => opStoreIdRef.current || userStoreIdRef.current || null;
  const computeApproved = () => {
    const votes: Array<boolean | null> = [opApprovedRef.current, tenApprovedRef.current];
    if (votes.some(v => v === false)) return false;
    if (votes.some(v => v === true)) return true;
    return false;
  };
  const publish = () => setState({ loading: false, approved: computeApproved(), storeId: computeStoreId() });

  useEffect(() => {
    let unsubs: Array<() => void> = [];
    let offAuth: (() => void) | null = null;

    const stop = () => {
      unsubs.forEach(fn => { try { fn(); } catch (_e) {} });
      unsubs = [];
    };

    async function fallbackDiscoverStoreId(uid: string) {
      try {
        const snap = await get(ref(db, "backoffice/tenants"));
        if (!snap.exists()) return;
        const tenants = snap.val() as unknown as Record<string, { operators?: Record<string, OperatorIndex> }>;
        for (const sid of Object.keys(tenants)) {
          const op = tenants[sid]?.operators?.[uid];
          if (op) {
            userStoreIdRef.current = String(sid);
            tenApprovedRef.current =
              op.owner === true ? true :
              (op.approved === true || op.approved === "true" || op.approved === 1) ? true :
              (op.approved === false || op.approved === "false" || op.approved === 0) ? false :
              null;
            publish();
            break;
          }
        }
      } catch (_e) {}
    }

    offAuth = auth.onIdTokenChanged(user => {
      stop();
      opStoreIdRef.current = null;
      userStoreIdRef.current = null;
      opApprovedRef.current = null;
      tenApprovedRef.current = null;

      if (!user) {
        setState({ loading: false, approved: false, storeId: null });
        return;
      }
      setState(prev => ({ ...prev, loading: true }));

      // A) /backoffice/operators/{uid}
      const aRef = ref(db, `backoffice/operators/${user.uid}`);
      const offA = onValue(aRef, (ss) => {
        const v = ss.val() as unknown as OperatorIndex | null;
        opStoreIdRef.current = (v?.storeId ?? null) ? String(v?.storeId) : null;
        opApprovedRef.current =
          v?.owner === true ? true :
          (v?.approved === true || v?.approved === "true" || v?.approved === 1) ? true :
          (v?.approved === false || v?.approved === "false" || v?.approved === 0) ? false :
          null;
        publish();
      });
      unsubs.push(offA as unknown as () => void);

      // B) /backoffice/users/{uid}/storeId -> valida em tenants
      const bRef = ref(db, `backoffice/users/${user.uid}/storeId`);
      const offB = onValue(bRef, (ss) => {
        const sid = ss.exists() ? String(ss.val()) : null;
        userStoreIdRef.current = sid;
        if (sid) {
          const tRef = ref(db, `backoffice/tenants/${sid}/operators/${user.uid}`);
          const offT = onValue(tRef, (ts) => {
            const op = ts.val() as unknown as OperatorIndex | null;
            tenApprovedRef.current =
              op?.owner === true ? true :
              (op?.approved === true || op?.approved === "true" || op?.approved === 1) ? true :
              (op?.approved === false || op?.approved === "false" || op?.approved === 0) ? false :
              null;
            publish();
          });
          unsubs.push(offT as unknown as () => void);
        } else {
          tenApprovedRef.current = null;
          publish();
        }
      });
      unsubs.push(offB as unknown as () => void);

      // Fallback em 300ms
      setTimeout(() => {
        if (!opStoreIdRef.current && !userStoreIdRef.current && auth.currentUser) {
          void fallbackDiscoverStoreId(auth.currentUser.uid);
        }
      }, 300);
    });

    return () => {
      if (offAuth) offAuth();
      stop();
    };
  }, []);

  return state;
}
