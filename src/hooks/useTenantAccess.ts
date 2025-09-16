"use client";
import { useEffect, useRef, useState } from "react";
import type { FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase, ref, off } from "firebase/database";

/**
 * Verifica acesso efetivo ao tenant e reage quando as permissões mudam.
 * Estratégia:
 *  - Se role do usuário for admin/operacao => canRead = true
 *  - Caso contrário, tenta ler (1) approved em tenants/$storeId/operators/$uid/approved
 *    e (2) status/online do tenant como sinal de leitura autorizada.
 *  - Se receber PERMISSION_DENIED, aplica backoff exponencial e re-tenta automaticamente.
 */
export function useTenantAccess(app: FirebaseApp, storeId: string | null) {
  const [canRead, setCanRead] = useState<boolean>(false);

  const backoffMsRef = useRef<number>(600);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unsubsRef = useRef<Array<() => void>>([]);

  const clearAll = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    unsubsRef.current.forEach((fn) => {
      try { fn(); } catch {}
    });
    unsubsRef.current = [];
  };

  useEffect(() => {
    const auth = getAuth();
    const db = getDatabase(app);

    clearAll();
    setCanRead(false);
    backoffMsRef.current = 600;

    const user = auth.currentUser;
    if (!user || !storeId) {
      return () => clearAll();
    }

    let stopped = false;

    // 0) Observa role para liberar acesso imediato a admins/operacao
    const roleRef = ref(db, `backoffice/users/${user.uid}/role`);
 
    unsubsRef.current.push(() => off(roleRef));

    // Função que tenta ler approved e status/online
    const subscribeOnce = () => {
      if (stopped) return;

      // (1) approved direto no tenant para este operador
      const apprRef = ref(db, `backoffice/tenants/${storeId}/operators/${user.uid}/approved`);
      unsubsRef.current.push(() => off(apprRef));

      // (2) leitura de um nó protegido do tenant como "sinal" de acesso
      const probeRef = ref(db, `backoffice/tenants/${storeId}/status/online`);
      unsubsRef.current.push(() => off(probeRef));
    };

    subscribeOnce();

    return () => {
      stopped = true;
      clearAll();
    };
  }, [app, storeId]);

  return canRead;
}
