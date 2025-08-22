import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";

export class AuthService {
  static signIn = (params: { email: string; password: string }) => {
    return signInWithEmailAndPassword(auth, params.email, params.password);
  };
}
