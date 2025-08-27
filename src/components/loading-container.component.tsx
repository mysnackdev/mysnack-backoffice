// loading-container.component.tsx
"use client";
import React, { PropsWithChildren } from "react";

type LoadingContainerProps = PropsWithChildren<{
  loading: boolean;
  className?: string;
}>;

export function LoadingContainer({
  loading,
  className,
  children,
}: LoadingContainerProps) {
  if (loading) {
    return <div className={className}>Carregando…</div>;
  }
  return <>{children}</>;
}
