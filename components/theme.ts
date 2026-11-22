// Couche présentation : le thème clair ou sombre (lot 6). Préférence d'affichage, pas une règle métier.
// Le cookie n'est pas lu par le serveur : avec cacheComponents, `cookies()` dans le layout racine
// empêcherait le prérendu. Un script en ligne dans le <head> pose la classe `.dark` avant le premier
// affichage (voir node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md).

export type Theme = "light" | "dark";

export const THEME_COOKIE = "theme";

// Le choix retenu l'emporte ; sans choix valable, on suit le réglage du système.
// Écrite sans aucune dépendance : son texte est recopié tel quel dans THEME_SCRIPT.
export function resolveTheme(cookie: string | null | undefined, systemDark: boolean): Theme {
  if (cookie === "dark" || cookie === "light") return cookie;
  return systemDark ? "dark" : "light";
}

// Exécuté par le navigateur pendant la lecture du <head>, avant d'afficher quoi que ce soit.
export const THEME_SCRIPT = `(function(){try{var resolve=${resolveTheme.toString()};var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]*)/);var t=resolve(m?decodeURIComponent(m[1]):null,matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",t==="dark")}catch(e){}})()`;

// Le choix fait dans le menu, retenu un an pour tout le site.
export function themeCookie(theme: Theme): string {
  return `${THEME_COOKIE}=${theme}; path=/; max-age=31536000; SameSite=Lax`;
}
