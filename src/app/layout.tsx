import "./globals.css";
import type {Metadata} from "next";
import {AuthProvider} from "@/context/AuthContext";

export const metadata: Metadata = { title: "MySnack Backoffice" };

export default function RootLayout({children}:{children: React.ReactNode}) {
  return (
    <html lang="pt-BR">
      <body className="bg-zinc-50">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
