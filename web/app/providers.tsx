// app/providers.tsx
"use client";

import { HeroUIProvider } from "@heroui/react";
import { ToastProvider } from "@heroui/toast";
import { useRouter } from "next/navigation";
// import {ThemeProvider as NextThemesProvider} from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <HeroUIProvider navigate={router.push}>
      {/* <NextThemesProvider attribute="class" defaultTheme="dark"> */}
      <ToastProvider placement="top-right" toastProps={{ timeout: 3000 }} />
      {children}
      {/* </NextThemesProvider> */}
    </HeroUIProvider>
  );
}
