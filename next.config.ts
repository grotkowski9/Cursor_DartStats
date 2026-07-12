import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Zezwól na podgląd dev z telefonu w tej samej sieci Wi-Fi
  allowedDevOrigins: ["192.168.100.11"],
};

export default nextConfig;
