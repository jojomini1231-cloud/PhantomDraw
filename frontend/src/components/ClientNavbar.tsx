"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";

export function ClientNavbar() {
  const pathname = usePathname();
  
  if (pathname?.startsWith("/admin")) {
    return null;
  }
  
  return <Navbar />;
}
