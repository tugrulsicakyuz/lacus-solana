"use client";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";

// Pages that have their own embedded editorial footer
const EDITORIAL_PATHS = ["/", "/launchpad", "/primary", "/secondary", "/manage/issue"];

export default function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hasOwnFooter = EDITORIAL_PATHS.includes(pathname);
  return (
    <>
      <Navbar />
      {children}
      {!hasOwnFooter && <Footer />}
    </>
  );
}
