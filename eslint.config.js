import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  /* `.next` holds generated route types that trip half the rules and are never edited by
     hand. `.mainbase` is a scratch clone of this whole repo that tooling drops in the working
     directory — it currently carries a second copy of every source file, so linting it
     reported every problem twice and walked several hundred MB to do it. Both are ignored by
     git; ESLint needs telling separately. */
  { ignores: ["dist", ".next", ".mainbase"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
);
