import { createContext } from "react";

export type Lang = "en" | "ar";
export type Theme = "light" | "dark";

export interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export const LangContext = createContext<LangContextValue>({
  lang: "en",
  setLang: () => {},
  theme: "light",
  setTheme: () => {},
});
