import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import CartDrawer from './cart/CartDrawer.jsx';
import ChatWidget from './assistant/ChatWidget.jsx';
import { Container, Drawer } from './common.jsx';
import Header, { Footer, MobileNav } from './layout/Chrome.jsx';
import SearchBar from './search/SearchBar.jsx';

export default function Layout() {
    const [searchOpen, setSearchOpen] = useState(false);

    return (
        <div className="min-h-screen pb-24 lg:pb-0">
            <Header />
            <Container as="main" className="reveal py-8 md:py-10">
                <Outlet />
            </Container>
            <Footer />
            <MobileNav onSearch={() => setSearchOpen(true)} />
            <CartDrawer />
            <ChatWidget />
            <Drawer open={searchOpen} title="Search" onClose={() => setSearchOpen(false)} side="left">
                <SearchBar compact autoFocus onNavigate={() => setSearchOpen(false)} />
            </Drawer>
        </div>
    );
}
