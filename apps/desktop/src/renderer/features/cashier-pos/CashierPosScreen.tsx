import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import clsx from "clsx";
import { Button } from "@muzammil-pos/ui";
import { debounce } from "@muzammil-pos/utils";
import type { Salesman } from "@muzammil-pos/types";
import { useAuthStore } from "../../store/authStore";
import { cashierApi, type CashierProduct } from "../../services/cashier";
import { salesmenApi } from "../../services/salesmen";
import { LanguageSwitch } from "../../components/LanguageSwitch";
import { useT } from "../../i18n/store";
import { ProductGrid } from "./components/ProductGrid";
import { AddToCartModal } from "./components/AddToCartModal";
import { CartPanel } from "./components/CartPanel";

interface CategoryChip {
  id: string;
  name: string;
  count: number;
}

export function CashierPosScreen() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const t = useT();

  const [products, setProducts] = useState<CashierProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<{ id: string; name: string } | null>(null);

  const [salesmen, setSalesmen] = useState<Salesman[]>([]);
  const [activeProduct, setActiveProduct] = useState<CashierProduct | null>(null);

  const debouncedSetSearch = useMemo(() => debounce((value: string) => setSearch(value), 300), []);

  useEffect(() => {
    salesmenApi.listActive().then(setSalesmen).catch(() => {
      // Non-fatal: the salesman dropdown just stays empty if this fails.
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingProducts(true);
    cashierApi
      .listProducts(search || undefined)
      .then((result) => {
        if (!cancelled) setProducts(result);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingProducts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search]);

  // One button per category that has products in the current list. The chosen one always stays visible.
  const categoryChips = useMemo<CategoryChip[]>(() => {
    const chips = new Map<string, CategoryChip>();
    for (const product of products) {
      if (!product.category) continue;
      const chip = chips.get(product.category.id) ?? {
        id: product.category.id,
        name: product.category.name,
        count: 0,
      };
      chip.count += 1;
      chips.set(product.category.id, chip);
    }
    if (category && !chips.has(category.id)) chips.set(category.id, { ...category, count: 0 });
    return [...chips.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [products, category]);

  const visibleProducts = useMemo(
    () => (category ? products.filter((product) => product.category?.id === category.id) : products),
    [products, category]
  );

  return (
    <div className="flex h-screen w-screen flex-col bg-gray-50">
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div>
          <h1 className="text-base font-semibold text-gray-900">{t("Register — Muzammil Store")}</h1>
          <p className="text-xs text-gray-400">{t("Cashier: {name}", { name: user?.fullName ?? "" })}</p>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitch />
          {user?.role === "ADMIN" && (
            <Button variant="secondary" size="sm" onClick={() => navigate("/")}>
              {t("Back to admin")}
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => logout()}>
            {t("Logout")}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <div className="relative mb-3 max-w-md">
            <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                debouncedSetSearch(e.target.value);
              }}
              placeholder={t("Search products by title…")}
              autoFocus
              className="w-full rounded-control border border-gray-300 py-2 ps-9 pe-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>

          {categoryChips.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCategory(null)}
                aria-pressed={category === null}
                className={clsx(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  category === null
                    ? "border-brand bg-brand text-white"
                    : "border-gray-300 bg-white text-gray-600 hover:border-brand hover:text-brand"
                )}
              >
                {t("All")} ({products.length})
              </button>
              {categoryChips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setCategory({ id: chip.id, name: chip.name })}
                  aria-pressed={category?.id === chip.id}
                  className={clsx(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    category?.id === chip.id
                      ? "border-brand bg-brand text-white"
                      : "border-gray-300 bg-white text-gray-600 hover:border-brand hover:text-brand"
                  )}
                >
                  {chip.name} ({chip.count})
                </button>
              ))}
            </div>
          )}

          <ProductGrid products={visibleProducts} isLoading={isLoadingProducts} onSelectProduct={setActiveProduct} />
        </main>

        <aside className="w-96 shrink-0 border-s border-gray-200 bg-white">
          <CartPanel salesmen={salesmen} />
        </aside>
      </div>

      {activeProduct && <AddToCartModal product={activeProduct} onClose={() => setActiveProduct(null)} />}
    </div>
  );
}