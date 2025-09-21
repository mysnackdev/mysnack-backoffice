"use client";
import { useEffect, useState } from 'react';
import { getDatabase, onValue, ref } from 'firebase/database';
import { getAuth } from 'firebase/auth';

export function useMyStoreId() {
  const [storeId, setStoreId] = useState<string|undefined>(process.env.NEXT_PUBLIC_DEFAULT_STORE_ID);
  useEffect(() => {
    const auth = getAuth();
    const unsub = auth.onAuthStateChanged((u) => {
      if (!u) return;
      const db = getDatabase();
      const r = ref(db, `backoffice/users/${u.uid}/storeId`);
      onValue(r, (snap) => {
        const v = snap.val();
        if (v) setStoreId(String(v));
      });
    });
    return () => unsub();
  }, []);
  return storeId;
}
