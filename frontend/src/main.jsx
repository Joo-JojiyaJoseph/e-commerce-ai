import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AdminBrands from './admin/AdminBrands.jsx';
import AdminCategories from './admin/AdminCategories.jsx';
import AdminCoupons from './admin/AdminCoupons.jsx';
import { AdminCustomerView, AdminCustomers } from './admin/AdminCustomers.jsx';
import AdminDashboard from './admin/AdminDashboard.jsx';
import AdminIntegrations from './admin/AdminIntegrations.jsx';
import AdminInventory from './admin/AdminInventory.jsx';
import AdminLayout from './admin/AdminLayout.jsx';
import AdminLogin from './admin/AdminLogin.jsx';
import AdminNotifications from './admin/AdminNotifications.jsx';
import { AdminOrderView, AdminOrders } from './admin/AdminOrders.jsx';
import AdminProductForm from './admin/AdminProductForm.jsx';
import AdminProductView from './admin/AdminProductView.jsx';
import AdminProducts from './admin/AdminProducts.jsx';
import AdminReviews from './admin/AdminReviews.jsx';
import { AuthProvider, SessionWatcher } from './auth.jsx';
import Layout from './components/Layout.jsx';
import About from './pages/About.jsx';
import Account from './pages/Account.jsx';
import AccountAddresses from './pages/AccountAddresses.jsx';
import AccountNotifications from './pages/AccountNotifications.jsx';
import AccountOrder from './pages/AccountOrder.jsx';
import AccountOrders from './pages/AccountOrders.jsx';
import AccountReviews, { AccountSecurity } from './pages/AccountReviews.jsx';
import AccountWishlist from './pages/AccountWishlist.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import Contact from './pages/Contact.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Help from './pages/Help.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';
import Notifications from './pages/Notifications.jsx';
import OrderConfirmation from './pages/OrderConfirmation.jsx';
import Product from './pages/Product.jsx';
import Register from './pages/Register.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Shop from './pages/Shop.jsx';
import { CartProvider } from './store/cart.jsx';
import { CatalogProvider } from './store/catalog.jsx';
import { NotificationProvider } from './store/notifications.jsx';
import { WishlistProvider } from './store/wishlist.jsx';
import { ConfirmProvider } from './feedback.jsx';
import { ToastProvider } from './toast.jsx';
import './index.css';

const root = document.getElementById('root');

if (!root) {
    throw new Error('The React root element is missing.');
}

createRoot(root).render(
    <StrictMode>
        <AuthProvider>
            <ToastProvider>
                <SessionWatcher />
                <ConfirmProvider>
                <CatalogProvider>
                    <WishlistProvider>
                        <CartProvider>
                            <NotificationProvider>
                                <BrowserRouter>
                                    <Routes>
                                        <Route path="/admin/login" element={<AdminLogin />} />
                                        <Route path="/admin" element={<AdminLayout />}>
                                            <Route index element={<AdminDashboard />} />
                                            <Route path="products" element={<AdminProducts />} />
                                            <Route path="products/new" element={<AdminProductForm />} />
                                            <Route path="products/:id" element={<AdminProductView />} />
                                            <Route path="products/:id/edit" element={<AdminProductForm />} />
                                            <Route path="categories" element={<AdminCategories />} />
                                            <Route path="brands" element={<AdminBrands />} />
                                            <Route path="inventory" element={<AdminInventory />} />
                                            <Route path="orders" element={<AdminOrders />} />
                                            <Route path="orders/:number" element={<AdminOrderView />} />
                                            <Route path="reviews" element={<AdminReviews />} />
                                            <Route path="customers" element={<AdminCustomers />} />
                                            <Route path="customers/:id" element={<AdminCustomerView />} />
                                            <Route path="coupons" element={<AdminCoupons />} />
                                            <Route path="notifications" element={<AdminNotifications />} />
                                            <Route path="integrations" element={<AdminIntegrations />} />
                                        </Route>
                                        <Route element={<Layout />}>
                                            <Route path="/" element={<Home />} />
                                            <Route path="/shop" element={<Shop />} />
                                            <Route path="/products/:slug" element={<Product />} />
                                            <Route path="/cart" element={<Cart />} />
                                            <Route path="/checkout" element={<Checkout />} />
                                            <Route path="/orders/:number" element={<OrderConfirmation />} />
                                            <Route path="/login" element={<Login />} />
                                            <Route path="/register" element={<Register />} />
                                            <Route path="/forgot-password" element={<ForgotPassword />} />
                                            <Route path="/reset-password" element={<ResetPassword />} />
                                            <Route path="/notifications" element={<Notifications />} />
                                            <Route path="/account" element={<Account />} />
                                            <Route path="/account/orders" element={<AccountOrders />} />
                                            <Route path="/account/orders/:number" element={<AccountOrder />} />
                                            <Route path="/account/addresses" element={<AccountAddresses />} />
                                            <Route path="/account/wishlist" element={<AccountWishlist />} />
                                            <Route path="/account/reviews" element={<AccountReviews />} />
                                            <Route path="/account/notifications" element={<AccountNotifications />} />
                                            <Route path="/account/security" element={<AccountSecurity />} />
                                            <Route path="/about" element={<About />} />
                                            <Route path="/contact" element={<Contact />} />
                                            <Route path="/help" element={<Help />} />
                                            <Route path="*" element={<NotFound />} />
                                        </Route>
                                    </Routes>
                                </BrowserRouter>
                            </NotificationProvider>
                        </CartProvider>
                    </WishlistProvider>
                </CatalogProvider>
                </ConfirmProvider>
            </ToastProvider>
        </AuthProvider>
    </StrictMode>,
);
