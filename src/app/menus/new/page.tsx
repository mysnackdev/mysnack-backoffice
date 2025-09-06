// src/app/menus/new/page.tsx
"use client";

import React from "react";
import DashboardShell from "@/components/DashboardShell";
import MenuWizard from "@/components/MenuWizard";

export default function Page(){
  return (
    <DashboardShell>
      <MenuWizard />
    </DashboardShell>
  );
}
