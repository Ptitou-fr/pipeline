import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Sens des dépendances : présentation → service → données (voir INTENT.md).
// Chaque entrée interdit d'importer une couche, via l'alias `@/` ou un chemin relatif.
const layer = (name) => ({
  regex: `^(@/|(\\.\\.?/)+)${name}(/|$)`,
  message: `Import interdit : la couche « ${name} » n'est pas accessible depuis ici (voir INTENT.md).`,
});
const forbidLayers = (files, names) => ({
  files,
  rules: {
    "no-restricted-imports": ["error", { patterns: names.map(layer) }],
  },
});

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  forbidLayers(["app/**", "components/**"], ["data"]),
  forbidLayers(["services/**"], ["components", "app"]),
  forbidLayers(["data/**"], ["services", "components", "app"]),
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
