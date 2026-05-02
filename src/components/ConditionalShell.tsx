"use client";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function ConditionalShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
