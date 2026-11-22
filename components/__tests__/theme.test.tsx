import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { resolveTheme, THEME_SCRIPT, themeCookie } from "@/components/theme";
import { ThemeToggle } from "@/components/theme-toggle";

// Exécute le script du <head> avec un document et un réglage système simulés ; renvoie la classe posée.
function runScript(cookie: string, systemDark: boolean) {
  const classes = new Set<string>();
  const document = {
    cookie,
    documentElement: { classList: { toggle: (name: string, on: boolean) => (on ? classes.add(name) : classes.delete(name)) } },
  };
  const matchMedia = (query: string) => ({ matches: query === "(prefers-color-scheme: dark)" && systemDark });
  new Function("document", "matchMedia", THEME_SCRIPT)(document, matchMedia);
  return classes.has("dark");
}

describe("resolveTheme : quel thème afficher (lot 6)", () => {
  it("suit le réglage du système sans choix enregistré", () => {
    expect(resolveTheme(undefined, true)).toBe("dark");
    expect(resolveTheme(undefined, false)).toBe("light");
  });

  it("garde le choix enregistré, quel que soit le système", () => {
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
  });

  it("ignore un cookie inconnu et suit le système", () => {
    expect(resolveTheme("bleu", true)).toBe("dark");
    expect(resolveTheme("", false)).toBe("light");
  });
});

describe("THEME_SCRIPT : la classe .dark avant le premier affichage (lot 6)", () => {
  it("pose .dark quand le système est sombre et qu'aucun choix n'est enregistré", () => {
    expect(runScript("", true)).toBe(true);
    expect(runScript("", false)).toBe(false);
  });

  it("pose .dark quand « Sombre » est retenu dans le cookie, même si le système est clair", () => {
    expect(runScript("theme=dark", false)).toBe(true);
    expect(runScript("autre=1; theme=dark", false)).toBe(true);
  });

  it("ne pose pas .dark quand « Clair » est retenu, même si le système est sombre", () => {
    expect(runScript("theme=light", true)).toBe(false);
  });
});

describe("themeCookie : le choix retenu (lot 6)", () => {
  it("retient le thème pour tout le site pendant un an", () => {
    expect(themeCookie("dark")).toBe("theme=dark; path=/; max-age=31536000; SameSite=Lax");
    expect(themeCookie("light")).toBe("theme=light; path=/; max-age=31536000; SameSite=Lax");
  });
});

describe("ThemeToggle : le choix dans le menu (lot 6)", () => {
  it("propose Clair et Sombre, sans en marquer un avant de connaître le thème affiché", () => {
    const html = renderToStaticMarkup(<ThemeToggle />);

    expect(html).toContain('aria-label="Thème"');
    expect(html).toMatch(/<button[^>]*>[\s\S]*?Clair<\/button>/);
    expect(html).toMatch(/<button[^>]*>[\s\S]*?Sombre<\/button>/);
    expect(html).not.toContain('aria-pressed="true"');
  });
});
