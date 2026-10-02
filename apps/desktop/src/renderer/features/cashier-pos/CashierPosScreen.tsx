import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Button } from "@muzammil-pos/ui";
import { debounce } from "@muzammil-pos/utils";
import type { Salesman } from "@muzammil-pos/types";
import { useAuthStore } from "../../store/authStore";
import { cashierApi, type CashierProduct } from "../../services/cashier";
import { salesmenApi } from "../../services/salesmen";
import { ProductGrid } from "./components/ProductGrid";
import { AddToCartModal } from "./components/AddToCartModal";
import { CartPanel } from "./components/CartPanel";

export function CashierPosScreen() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [products, setProducts] = useState<CashierProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

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
      .finally(() => {
        if (!cancelled) setIsLoadingProducts(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search]);

  return (
    <div className="flex h-screen w-screen flex-col bg-gray-50">
      <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Register — Muzammil Store</h1>
          <p className="text-xs text-gray-400">Cashier: {user?.fullName}</p>
        </div>
        <div className="flex items-center gap-2">
          {user?.role === "ADMIN" && (
            <Button variant="secondary" size="sm" onClick={() => navigate("/")}>
              Back to admin
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => logout()}>
            Logout
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <div className="relative mb-4 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                debouncedSetSearch(e.target.value);
              }}
              placeholder="Search products by title…"
              autoFocus
              className="w-full rounded-control border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>

          <ProductGrid products={products} isLoading={isLoadingProducts} onSelectProduct={setActiveProduct} />
        </main>

        <aside className="w-96 shrink-0 border-l border-gray-200 bg-white">
          <CartPanel salesmen={salesmen} />
        </aside>
      </div>

      {activeProduct && <AddToCartModal product={activeProduct} onClose={() => setActiveProduct(null)} />}
    </div>
  );
}