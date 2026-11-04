"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { LOCALES, Locale, MessageKey, translate } from "@/lib/i18n/messages";

interface I18nValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}

const STORAGE_KEY = "salon.locale";

const I18nContext = createContext<I18nValue>({
  locale: "en",
  setLocale: () => {},
  t: (key, vars) => translate("en", key, vars),
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved && LOCALES.some((l) => l.code === saved)) setLocaleState(saved);
    } catch {
      /* storage unavailable - stay on English */
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback<I18nValue["t"]>((key, vars) => translate(locale, key, vars), [locale]);
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  return useContext(I18nContext);
}

