/**
 * Registers scripts/asset-stub-loader.mjs so a harness can import app modules that
 * statically import images. See that file for why.
 *
 *   node --import tsx --import ./scripts/asset-stub-register.mjs scripts/<harness>.ts
 */
import { register } from "node:module";

register("./asset-stub-loader.mjs", import.meta.url);
