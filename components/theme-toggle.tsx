"use client";
// Couche présentation : le choix Clair / Sombre, en bas du menu (lot 6). Le thème affiché est lu sur
// la classe `.dark` de <html>, posée avant le premier affichage par THEME_SCRIPT.
import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { themeCookie, type Theme } from "@/components/theme";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

const currentTheme = (): Theme => (document.documentElement.classList.contains("dark") ? "dark" : "light");
// Côté serveur, le thème n'est pas connu : aucun bouton n'est marqué.
const unknownTheme = () => null;

function chooseTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.cookie = themeCookie(theme);
}

const OPTIONS = [
  { theme: "light", label: "Clair", Icon: Sun },
  { theme: "dark", label: "Sombre", Icon: Moon },
] as const;

export function ThemeToggle() {
  const shown = useSyncExternalStore(subscribe, currentTheme, unknownTheme);

  return (
    <div role="group" aria-label="Thème" className="flex gap-1 rounded-full border border-border bg-muted p-1">
      {OPTIONS.map(({ theme, label, Icon }) => (
        <Button
          key={theme}
          variant="ghost"
          size="sm"
          aria-pressed={shown === null ? undefined : shown === theme}
          onClick={() => chooseTheme(theme)}
          className="flex-1 text-muted-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-sm"
        >
          <Icon aria-hidden="true" />
          {label}
        </Button>
      ))}
    </div>
  );
}
