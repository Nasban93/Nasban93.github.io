import { useContext } from "react";
import { LangContext } from "../context/LangContext";
import { en } from "./en";
import { ar } from "./ar";

export function useT() {
  const { lang } = useContext(LangContext);
  return lang === "ar" ? ar : en;
}

export function useLang() {
  return useContext(LangContext);
}
