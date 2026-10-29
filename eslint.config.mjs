import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Layering (architecture.md §9). Imports may only point "left":
 *   domain  ←  db  ←  server  ←  components  ←  app
 * Each block below lists what a layer must NOT import.
 */
const forbid = (files, layers, message) => ({
  files,
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: layers.map((layer) => ({
          group: [`@/${layer}`, `@/${layer}/*`, `**/src/${layer}/*`],
          message,
        })),
      },
    ],
  },
});

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  forbid(
    ["src/domain/**"],
    ["db", "server", "components", "app", "i18n"],
    "src/domain is pure: no DB, server, UI or i18n imports.",
  ),
  forbid(
    ["src/db/**"],
    ["server", "components", "app"],
    "src/db may only import from src/domain.",
  ),
  forbid(
    ["src/server/**"],
    ["components", "app"],
    "src/server may not import UI.",
  ),
  forbid(
    ["src/components/**"],
    ["db", "server", "app"],
    "Components get data and actions via props, never from db/server/app.",
  ),
  {
    // Theme only (docs/theme.md): colours, sizes and spacing come from tokens in globals.css, never inline.
    files: ["src/**/*.tsx"],
    rules: {
      "react/forbid-dom-props": ["error", { forbid: [{ propName: "style", message: "Use theme tokens or a utility in globals.css instead of inline style." }] }],
      "react/forbid-component-props": ["error", { forbid: [{ propName: "style", message: "Use theme tokens or a utility in globals.css instead of inline style." }] }],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "coverage/**", "ci-screenshots/**"]),
]);

export default eslintConfig;
