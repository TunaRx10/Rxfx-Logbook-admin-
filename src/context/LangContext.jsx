/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { t as translate } from "../lib/i18n";

const LangContext = createContext();

export const LangProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem("admin_lang");
    return (saved && ["FR", "EN", "ES", "DE", "IT"].includes(saved.toUpperCase())) ? saved.toUpperCase() : "FR";
  });

  const languages = [
    { code: "FR", name: "Français" },
    { code: "EN", name: "English" },
    { code: "ES", name: "Español" },
    { code: "DE", name: "Deutsch" },
    { code: "IT", name: "Italiano" }
  ];

  const t = useCallback((key) => translate(lang, key), [lang]);

  useEffect(() => {
    localStorage.setItem("admin_lang", lang);
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang, languages, t }}>
      {children}
    </LangContext.Provider>
  );
};

export const useLang = () => useContext(LangContext);
