import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local probes / vendor dumps — not app code
    ".dev/**",
    "demo/**/*.json",
  ]),
  {
    rules: {
      // Pre-existing tour/error UI patterns; not a prod security risk.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
