const CATEGORY_IMAGES = {
    shirts: 'https://images.unsplash.com/photo-1594938291221-94d38d3c2864?auto=format&fit=crop&w=1200&q=80',
    bags: 'https://images.unsplash.com/photo-1544816155-12df9643f23b?auto=format&fit=crop&w=1200&q=80',
    accessories: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?auto=format&fit=crop&w=1200&q=80',
    knitwear: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=1200&q=80',
};

const BRAND_IMAGES = {
    northloom: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80',
    'field-oak': 'https://images.unsplash.com/photo-1590874103328-eac38a94180c?auto=format&fit=crop&w=800&q=80',
    'harbor-thread': 'https://images.unsplash.com/photo-1631541909061-71e349d1f203?auto=format&fit=crop&w=800&q=80',
};

export function categoryDemoImage(category) {
    return category?.image_url || CATEGORY_IMAGES[category?.slug] || null;
}

export function brandDemoImage(brand) {
    return brand?.logo_url || brand?.image_url || BRAND_IMAGES[brand?.slug] || null;
}
