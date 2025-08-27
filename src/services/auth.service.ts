import { signInWithEmailAndPassword, signOut as fbSignOut, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { ref, set } from "firebase/database";
import { auth } from "../../firebase";
import { db } from "../../firebase";

export class AuthService {
  static async signIn(email: string, password: string) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user;
  }
  static async signUp(name: string, phone: string, email: string, password: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    const now = Date.now();
    // default role: operacao
    await set(ref(db, `backoffice/users/${uid}`), {
      uid, name, phone, email, role: "operacao", accountType: "operacao", createdAt: now
    });
    // fallback index
    await set(ref(db, `backoffice/roles/${uid}`), "operacao");
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
