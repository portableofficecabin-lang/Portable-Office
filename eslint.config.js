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
      /* Issue #100: these two photos show a leasing company's container number with a truck
         plate, and a shipping line's livery. They are kept on disk for history only and must
         not be shown again. */
      "no-restricted-imports": ["error", {
        patterns: [{
          group: [
            "**/assets/rental/cargo-storage-container-40ft.webp",
            "**/assets/rental/cargo-storage-container-20ft.jpg",
          ],
          message: "Rejected photo (issue #100). Use /images/products/storage-container-corten-steel/ (20ft-storage-container-corten-steel-three-quarter.webp or 40ft-storage-container-three-quarter.webp).",
        }],
      }],
    },
  },
);
