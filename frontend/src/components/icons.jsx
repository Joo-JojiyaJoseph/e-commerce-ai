import {
    AdjustmentsHorizontalIcon,
    ArchiveBoxIcon,
    ArrowLeftIcon,
    ArrowPathIcon,
    ArrowRightIcon,
    ArrowRightOnRectangleIcon,
    BanknotesIcon,
    Bars3Icon,
    BeakerIcon,
    BellIcon,
    BuildingStorefrontIcon,
    ChartBarIcon,
    ChatBubbleLeftRightIcon,
    CheckCircleIcon,
    CheckIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    ClipboardDocumentListIcon,
    CreditCardIcon,
    CubeIcon,
    EnvelopeIcon,
    ExclamationTriangleIcon,
    EyeIcon,
    FunnelIcon,
    GlobeAltIcon,
    HeartIcon,
    HomeIcon,
    InboxIcon,
    InformationCircleIcon,
    LockClosedIcon,
    MagnifyingGlassIcon,
    MapPinIcon,
    MegaphoneIcon,
    MinusIcon,
    PencilSquareIcon,
    PhotoIcon,
    PlusIcon,
    ShoppingBagIcon,
    ShoppingCartIcon,
    SparklesIcon,
    Squares2X2Icon,
    StarIcon,
    TagIcon,
    TrashIcon,
    TruckIcon,
    UserIcon,
    UsersIcon,
    XCircleIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import {
    BellIcon as BellSolidIcon,
    HeartIcon as HeartSolidIcon,
    StarIcon as StarSolidIcon,
} from '@heroicons/react/24/solid';

const outline = {
    MagnifyingGlassIcon,
    ShoppingBagIcon,
    ShoppingCartIcon,
    HeartIcon,
    UserIcon,
    UsersIcon,
    HomeIcon,
    Squares2X2Icon,
    Bars3Icon,
    XMarkIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    StarIcon,
    BellIcon,
    PlusIcon,
    MinusIcon,
    CheckIcon,
    TruckIcon,
    CreditCardIcon,
    BanknotesIcon,
    GlobeAltIcon,
    BeakerIcon,
    InboxIcon,
    TagIcon,
    CubeIcon,
    BuildingStorefrontIcon,
    ClipboardDocumentListIcon,
    ChatBubbleLeftRightIcon,
    MegaphoneIcon,
    ChartBarIcon,
    ArrowPathIcon,
    ArrowLeftIcon,
    ArrowRightIcon,
    ArrowRightOnRectangleIcon,
    LockClosedIcon,
    EnvelopeIcon,
    PhotoIcon,
    PencilSquareIcon,
    TrashIcon,
    EyeIcon,
    FunnelIcon,
    InformationCircleIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    XCircleIcon,
    MapPinIcon,
    SparklesIcon,
    AdjustmentsHorizontalIcon,
    ArchiveBoxIcon,
};

const solid = {
    HeartIcon: HeartSolidIcon,
    StarIcon: StarSolidIcon,
    BellIcon: BellSolidIcon,
};

const aliases = {
    search: 'MagnifyingGlassIcon',
    bag: 'ShoppingBagIcon',
    cart: 'ShoppingCartIcon',
    heart: 'HeartIcon',
    user: 'UserIcon',
    users: 'UsersIcon',
    home: 'HomeIcon',
    grid: 'Squares2X2Icon',
    menu: 'Bars3Icon',
    close: 'XMarkIcon',
    chevron: 'ChevronDownIcon',
    'chevron-right': 'ChevronRightIcon',
    star: 'StarIcon',
    bell: 'BellIcon',
    plus: 'PlusIcon',
    minus: 'MinusIcon',
    check: 'CheckIcon',
    truck: 'TruckIcon',
    'credit-card': 'CreditCardIcon',
    banknotes: 'BanknotesIcon',
    'globe-alt': 'GlobeAltIcon',
    beaker: 'BeakerIcon',
    inbox: 'InboxIcon',
    'shopping-bag': 'ShoppingBagIcon',
    tag: 'TagIcon',
    cube: 'CubeIcon',
    'building-storefront': 'BuildingStorefrontIcon',
    'clipboard-document-list': 'ClipboardDocumentListIcon',
    'chat-bubble': 'ChatBubbleLeftRightIcon',
    megaphone: 'MegaphoneIcon',
    'chart-bar': 'ChartBarIcon',
    'arrow-path': 'ArrowPathIcon',
    'arrow-left': 'ArrowLeftIcon',
    'arrow-right': 'ArrowRightIcon',
    'arrow-right-on-rectangle': 'ArrowRightOnRectangleIcon',
    'lock-closed': 'LockClosedIcon',
    envelope: 'EnvelopeIcon',
    photo: 'PhotoIcon',
    pencil: 'PencilSquareIcon',
    trash: 'TrashIcon',
    eye: 'EyeIcon',
    funnel: 'FunnelIcon',
    'information-circle': 'InformationCircleIcon',
    'exclamation-triangle': 'ExclamationTriangleIcon',
    'check-circle': 'CheckCircleIcon',
    'x-circle': 'XCircleIcon',
    'map-pin': 'MapPinIcon',
    sparkles: 'SparklesIcon',
    'adjustments-horizontal': 'AdjustmentsHorizontalIcon',
    'archive-box': 'ArchiveBoxIcon',
};

function iconName(name) {
    if (aliases[name]) {
        return aliases[name];
    }

    if (name.endsWith('Icon')) {
        return name;
    }

    return `${name
        .split(/[-_\s]+/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join('')}Icon`;
}

export function Icon({
    name,
    variant = 'outline',
    className = 'h-5 w-5',
    title,
    ...props
}) {
    const catalog = variant === 'solid' ? { ...outline, ...solid } : outline;
    const Component = catalog[iconName(name)];

    if (!Component) {
        return null;
    }

    return (
        <Component
            className={className}
            aria-hidden={title ? undefined : true}
            title={title}
            {...props}
        />
    );
}

export default Icon;
