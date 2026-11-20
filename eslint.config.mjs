import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Sens des dépendances : présentation → service → données (voir INTENT.md).
// Chaque entrée interdit d'importer une couche, via l'alias `@/` ou un chemin relatif.
// Dossier → nom de la couche, pour le message d'erreur.
const LAYER_NAMES = { app: "présentation", components: "présentation", services: "service", data: "données" };
const layer = (dir) => ({
  regex: `^(@/|(\\.\\.?/)+)${dir}(/|$)`,
  message: `Import interdit : la couche ${LAYER_NAMES[dir]} (${dir}/) n'est pas accessible depuis ici (voir .claude/rules/).`,
});
// Pilote de la base : seule la couche données l'importe. Il passe par la même règle que les
// couches, car deux `no-restricted-imports` sur les mêmes fichiers s'écraseraient.
const DRIVER = {
  name: "node:sqlite",
  message: "Import interdit : seule la couche données (data/) importe le pilote de la base (voir .claude/rules/data.md).",
};
const forbidLayers = (files, names, { driver = true } = {}) => ({
  files,
  rules: {
    "no-restricted-imports": ["error", { patterns: names.map(layer), paths: driver ? [DRIVER] : [] }],
  },
});

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  forbidLayers(["app/**", "components/**"], ["data"]),
  forbidLayers(["services/**"], ["components", "app"]),
  forbidLayers(["data/**"], ["services", "components", "app"], { driver: false }),
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
