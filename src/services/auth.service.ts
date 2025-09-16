
import { signInWithEmailAndPassword, signOut as fbSignOut, createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile } from "firebase/auth";
import { ref, set, update } from "firebase/database";
import { auth, db } from "../../firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../../firebase";

/** Campos esperados no cadastro */
export type SignUpInput = {
  name: string;
  phone: string;
  email: string;
  password: string;
  role: "operacao" | "operador";
  /** CNPJ informado no cadastro (obrigatório para ambos os papéis) */
  cnpj?: string;
  /** Razão social (obrigatório para operação; opcional para operador) */
  razaoSocial?: string;
};

/** Normaliza CNPJ: apenas dígitos, 14 chars ou undefined */
function sanitizeCnpj(v?: string | null): string | undefined {
  if (!v) return undefined;
  const digits = String(v).replace(/\D+/g, "");
  if (digits.length !== 14) return undefined;
  return digits;
}

export class AuthService {
  /** Login */
  static async signIn(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  }

  /** Cadastro e provisionamento base no RTDB */
  static async signUp(input: SignUpInput) {
    const { name, phone, email, password, role } = input;
    const cnpjRaw = input.cnpj;
    const razaoSocial = (input.razaoSocial || "").trim() || undefined;
    const cnpj = sanitizeCnpj(cnpjRaw);

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    const now = Date.now();

    // Nome no perfil auth (não bloqueia fluxo se falhar)
    try {
      await updateProfile(cred.user, { displayName: name });
    } catch {}

    // Nó base do usuário no backoffice
    await set(ref(db, `backoffice/users/${uid}`), {
      name,
      phone: phone || null,
      email,
      role,
      createdAt: now,
      updatedAt: now,
      active: true,
    });

    if (role === "operacao") {
      // Operação cria uma nova loja vinculada ao próprio uid como storeId
      const storeId = uid;
      const cnpjOk = sanitizeCnpj(cnpj || "");
      if (!cnpjOk) throw new Error("CNPJ inválido. Informe um CNPJ com 14 dígitos.");
      if (!razaoSocial) throw new Error("Razão social é obrigatória para cadastro de operação.");

      // Índice CNPJ -> storeId (para operadores se vincularem)
      await update(ref(db), {
      });

      // Perfil da loja ("minha loja")
      await update(ref(db), {
        [`backoffice/tenants/${storeId}/storeProfile/name`]: name || null,
        [`backoffice/tenants/${storeId}/storeProfile/displayName`]: name || null,
        [`backoffice/tenants/${storeId}/storeProfile/telefone`]: phone || null,
        [`backoffice/tenants/${storeId}/storeProfile/cnpj`]: cnpjOk,
        [`backoffice/tenants/${storeId}/storeProfile/razaoSocial`]: razaoSocial,
        [`backoffice/tenants/${storeId}/status/online`]: false,
        [`backoffice/tenants/${storeId}/status/cadastroCompleto`]: false,
        [`backoffice/tenants/${storeId}/status/setupUpdatedAt`]: now,
        // Marca o próprio dono como operador aprovado por padrão
        [`backoffice/tenants/${storeId}/operators/${uid}/approved`]: true,
        [`backoffice/tenants/${storeId}/operators/${uid}/owner`]: true,
      });

      return cred.user;
    }

    
if (role === "operador") {
  const cnpjOk = sanitizeCnpj(cnpj || "");
  if (!cnpjOk) throw new Error("CNPJ da loja é obrigatório para operador (14 dígitos).");

  const functions = getFunctions(app, "us-central1");
  const linkFn = httpsCallable(functions, "registerOperatorByCNPJ");
  await linkFn({ cnpj: cnpjOk, razaoSocial });

  return cred.user;
}


    // Papel desconhecido
    return cred.user;
  }

  static async forgot(email: string) {
    await sendPasswordResetEmail(auth, email);
    return true;
  }

  static async signOut() {
    await fbSignOut(auth);
  }
}