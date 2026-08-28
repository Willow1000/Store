import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "coverage/**",
      "node_modules/**",
      "drizzle/migrations/**",
      "**/*.d.ts",
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: ["client/src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      // Only the two classic, high-signal hooks rules (catch real bugs:
      // conditional/looped hook calls, stale closures over missing deps).
      // eslint-plugin-react-hooks's "recommended" config in this major
      // version also bundles newer React Compiler-oriented rules
      // (set-state-in-effect, immutability) that flag common, working
      // patterns - e.g. reading a value into state inside a mount effect -
      // as errors; adopting those is a separate, deliberate decision, not
      // a side effect of turning lint on for the first time.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    rules: {
      // This codebase leans on `any` at DB/API boundaries (Drizzle insert
      // shapes, tRPC input passthrough, third-party SDK responses) in ways
      // that would take a much larger, riskier pass to type properly - not
      // something to force through the same change that first turns lint on.
      "@typescript-eslint/no-explicit-any": "off",
      // Bare `catch {}` blocks are a deliberate, common pattern here for
      // best-effort localStorage/analytics calls that must never break the
      // caller - flagging every one would be noise, not a real finding.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  }
);
