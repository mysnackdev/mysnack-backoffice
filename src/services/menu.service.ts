import { ref, push, set } from "firebase/database";
import { db } from "../../firebase";

export type MenuItem = {
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  type: "preparado" | "industrializado";
  categories?: string[];
  createdAt?: number;
  createdBy?: string;
};

export async function createMenuItem(uid: string, item: MenuItem){
  const itemRef = push(ref(db, `backoffice/stores/${uid}/menu/items`));
  const payload = { ...item, createdAt: Date.now() };
  await set(itemRef, payload);
  return itemRef.key;
}
