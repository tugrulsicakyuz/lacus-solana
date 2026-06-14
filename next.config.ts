import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bu proje klasörünü workspace kökü kabul et; üst dizindeki başıboş
  // package-lock.json yüzünden çıkan "inferred workspace root" uyarısını susturur.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
