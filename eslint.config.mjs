import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import tseslint from "typescript-eslint";
import betterTailwind from "eslint-plugin-better-tailwindcss";

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

const TS = ["src/**/*.{ts,tsx}"];
const TESTS = ["src/**/*.test.{ts,tsx}"];
const onlyTs = (configs) => configs.map((c) => ({ ...c, files: TS }));

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // The strictest typescript-eslint presets with type information (the counterpart to very_good_analysis in Dart).
  ...onlyTs(tseslint.configs.strictTypeChecked),
  ...onlyTs(tseslint.configs.stylisticTypeChecked),
  {
    files: TS,
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      // The code base uses `type` throughout (unions, intersections, mapped types); one style, not two.
      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      // `onClick={() => setOpen(true)}` is idiomatic React; returning void from a shorthand arrow is fine.
      "@typescript-eslint/no-confusing-void-expression": ["error", { ignoreArrowShorthand: true }],
      // Numbers in template strings ("vor 3 min", "Position 2") are intended.
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      // An empty string falls back on purpose (a missing header, an empty form field), so `||` stays allowed for strings.
      "@typescript-eslint/prefer-nullish-coalescing": ["error", { ignorePrimitives: { string: true } }],
    },
  },
  {
    // Tests may assert presence with `!` and pass empty callbacks.
    files: TESTS,
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-empty-function": "off",
    },
  },
  forbid(["src/domain/**"], ["db", "server", "components", "app", "i18n"], "src/domain is pure: no DB, server, UI or i18n imports."),
  forbid(["src/db/**"], ["server", "components", "app"], "src/db may only import from src/domain."),
  forbid(["src/server/**"], ["components", "app"], "src/server may not import UI."),
  forbid(["src/components/**"], ["db", "server", "app"], "Components get data and actions via props, never from db/server/app."),
  {
    // Theme only (docs/theme.md): colours, sizes and spacing come from tokens in globals.css, never inline.
    files: ["src/**/*.tsx"],
    rules: {
      "react/forbid-dom-props": [
        "error",
        { forbid: [{ propName: "style", message: "Use theme tokens or a utility in globals.css instead of inline style." }] },
      ],
      "react/forbid-component-props": [
        "error",
        { forbid: [{ propName: "style", message: "Use theme tokens or a utility in globals.css instead of inline style." }] },
      ],
    },
  },
  {
    // Tailwind classes are checked against the theme in globals.css (docs/theme.md §3 rule 8): known classes,
    // no conflicts or duplicates, and only tokens. Class order is Prettier's job (prettier-plugin-tailwindcss).
    files: ["src/**/*.tsx"],
    plugins: { "better-tailwindcss": betterTailwind },
    settings: { "better-tailwindcss": { entryPoint: "src/app/globals.css" } },
    rules: {
      ...betterTailwind.configs["correctness-error"].rules,
      "better-tailwindcss/no-duplicate-classes": "error",
      "better-tailwindcss/no-unnecessary-whitespace": "error",
      "better-tailwindcss/no-deprecated-classes": "error",
      "better-tailwindcss/no-restricted-classes": [
        "error",
        {
          restrict: [
            { pattern: "^.*-\\[.+\\]$", message: 'Arbitrary value "$0": make it a token in globals.css (theme.md §3 rule 8).' },
            {
              pattern: "^rounded(-[trblse]{1,2})?(-(sm|md|lg|xl|2xl|3xl))?$",
              message: 'Raw radius "$0": use rounded-panel|slot|pill|tile|box or rounded-full.',
            },
            {
              pattern: "^(bg|text|border|ring|outline|fill|stroke)-[a-z-]+\\/\\d+$",
              message: 'Opacity tint "$0": use a tint token (accent-soft, fill …).',
            },
            { pattern: "^shadow(-(2xs|xs|sm|md|lg|xl|2xl))?$", message: 'Raw shadow "$0": use shadow-floating.' },
            { pattern: "^text-([2-9]xl)$", message: 'Raw font size "$0": use text-title, text-display or a fluid-text-* class.' },
            {
              pattern: "^(bg|text|border|ring)-(white|black)$",
              message: '"$0" bypasses the theme: use on-accent, scrim, qr-bg or another color token.',
            },
          ],
        },
      ],
    },
  },
  // Formatting belongs to Prettier; this switches off the ESLint rules that would fight it.
  prettier,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "coverage/**", "ci-screenshots/**"]),
]);

export default eslintConfig;
