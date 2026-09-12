import { createContext, useContext, useEffect, useState } from "react";
import { store } from "@/lib/api";

const StoreContext = createContext(null);

export const FOR_YOU_SLUG = "for-you";
export const FOR_PET_SLUG = "for-your-pet";

export function StoreProvider({ children }) {
  const [symbol, setSymbol] = useState("₹");
  const [code, setCode] = useState("INR");
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const reloadSettings = () => store.settings().then(setSettings).catch(() => {});

  useEffect(() => {
    // Always use INR for this Indian storefront; ignore WooCommerce currency setting
    setSymbol("₹");
    setCode("INR");
    reloadSettings();
    store.categories()
      .then((c) => setCategories(c))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const money = (val) => {
    const n = Number(val || 0);
    const decimals = code === "INR" || code === "JPY" ? 0 : 2;
    try {
      return new Intl.NumberFormat(code === "INR" ? "en-IN" : "en-US", {
        style: "currency", currency: code,
        minimumFractionDigits: decimals, maximumFractionDigits: decimals,
      }).format(n);
    } catch {
      return `${symbol}${n.toLocaleString("en-IN", { maximumFractionDigits: decimals })}`;
    }
  };

  const catList = Array.isArray(categories) ? categories : [];
  const parents = catList.filter((c) => c.parent === 0);
  const forYou = parents.find((c) => c.slug === FOR_YOU_SLUG);
  const forPet = parents.find((c) => c.slug === FOR_PET_SLUG);
  const childrenOf = (id) => catList.filter((c) => c.parent === id);
  const bySlug = (slug) => catList.find((c) => c.slug === slug);

  const delivery = {
    free_above: Number(settings?.delivery?.free_above ?? 1499),
    fee: Number(settings?.delivery?.fee ?? 99),
  };

  return (
    <StoreContext.Provider
      value={{ symbol, money, categories, loaded, forYou, forPet, childrenOf, bySlug, settings, reloadSettings, delivery }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export const useStore = () => useContext(StoreContext);
