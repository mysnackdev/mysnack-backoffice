"use client";
import React, { useState } from "react";
import { ref, push, set } from "firebase/database";
import { db } from "@/firebase";

// Cria um pedido fake e muda o status em 3s para disparar a Cloud Function de push.
export default function PushTestCard() {
  const [creating, setCreating] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("TEST_USER_UID");

  const runTest = async () => {
    try {
      setCreating(true);
      const orderRef = push(ref(db, "orders"));
      const id = orderRef.key as string;
      await set(orderRef, {
        id,
        userId,
        status: "pedido realizado",
        createdAt: Date.now(),
      });
      setOrderId(id);
      setTimeout(async () => {
        await set(ref(db, `orders/${id}/status`), "pedido confirmado");
        setCreating(false);
      }, 3000);
    } catch (e) {
      console.error(e);
      setCreating(false);
    }
  };

  return (
    <div className="p-4 rounded-xl border border-black/10 bg-white shadow-sm">
      <div className="font-semibold mb-2">Teste de Push (E2E)</div>
      <label className="text-sm block mb-1">UID do usuário (destinatário):</label>
      <input
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        className="w-full mb-3 px-2 py-1.5 rounded border border-black/20"
        placeholder="UID do usuário que receberá o push"
      />
      <button
        disabled={creating}
        onClick={runTest}
        className="px-3 py-1.5 rounded-md border border-black/20 hover:bg-black/5 disabled:opacity-60"
      >
        {creating ? "Criando pedido..." : "Disparar teste"}
      </button>
      {orderId && (
        <div className="text-sm text-black/70 mt-2">
          Pedido de teste: <code>{orderId}</code>
        </div>
      )}
    </div>
  );
}
