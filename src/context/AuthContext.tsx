"use client";

import React, {createContext, useContext, useEffect, useMemo, useState} from "react";
import {onAuthStateChanged, User} from "firebase/auth";
import {getDatabase, onValue, ref} from "firebase/database";
import {auth} from "../../firebase";

export type Role = "admin" | "operacao" | "operador" | "viewer" | "unknown";
type AuthState = { user: User | null; loading: boolean; role: Role };

const Ctx = createContext<AuthState>({
  user: null, loading: true, role: "unknown",
});

export function AuthProvider({children}:{children: React.ReactNode}) {
  const [user, setUser] = useState<User|null>(null);
  const [role, setRole] = useState<Role>("unknown");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (!u) { setRole("unknown"); return; }
      const db = getDatabase();
      const r = ref(db, `backoffice/users/${u.uid}/role`);
      const unsub2 = onValue(r, (snap) => {
        const v = (snap.val() as string|null) || "unknown";
        setRole((v === "admin" || v === "operacao" || v === "operador") ? (v as Role) : "unknown");
      });
      return () => unsub2();
    });
    return () => unsub();
  }, []);

  const value = useMemo(() => ({user, role, loading}), [user, role, loading]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
