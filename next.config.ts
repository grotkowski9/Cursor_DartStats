import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com",
      "frame-src https://accounts.google.com https://*.supabase.co",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Zezwól na podgląd dev z telefonu w tej samej sieci Wi-Fi
  allowedDevOrigins: ["192.168.100.11"],
  async rewrites() {
    // Alias lokalny — ta sama treść co /privacy (bez redirectu na sylveoncompany.pl)
    return [{ source: "/polityka-prywatnosci", destination: "/privacy" }];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
