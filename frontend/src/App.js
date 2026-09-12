import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { StoreProvider } from "@/context/StoreContext";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { PawPrint } from "lucide-react";

import Home from "@/pages/Home";
import WorldPage from "@/pages/WorldPage";
import CategoryPage from "@/pages/CategoryPage";
import ProductPage from "@/pages/ProductPage";
import SearchPage from "@/pages/SearchPage";
import CheckoutPage from "@/pages/CheckoutPage";
import AccountPage from "@/pages/AccountPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import InfoPage from "@/pages/InfoPage";
import AdminLoginPage from "@/pages/AdminLoginPage";
import AdminDashboard from "@/pages/AdminDashboard";

function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-32 text-center">
      <PawPrint className="h-12 w-12 text-terracotta" />
      <h1 className="mt-6 font-display text-5xl font-semibold text-ink">404</h1>
      <p className="mt-3 text-muted-foreground">This page has wandered off. Let's get you back home.</p>
      <Button asChild className="mt-6 rounded-full bg-ink text-cream hover:bg-terracotta"><Link to="/">Back to Sojaru</Link></Button>
    </div>
  );
}

function App() {
  return (
    <StoreProvider>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/shop/:slug" element={<WorldPage />} />
                <Route path="/category/:slug" element={<CategoryPage />} />
                <Route path="/new-arrivals" element={<CategoryPage special="new-arrivals" />} />
                <Route path="/sale" element={<CategoryPage special="sale" />} />
                <Route path="/product/:slug" element={<ProductPage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/contact" element={<InfoPage page="contact" />} />
                <Route path="/faq" element={<InfoPage page="faq" />} />
                <Route path="/shipping-returns" element={<InfoPage page="shipping-returns" />} />
                <Route path="/privacy" element={<InfoPage page="privacy" />} />
                <Route path="/terms" element={<InfoPage page="terms" />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
          <Toaster position="bottom-right" richColors closeButton />
        </CartProvider>
      </AuthProvider>
    </StoreProvider>
  );
}

export default App;
