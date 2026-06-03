export type User = {
  id: string;
  phone: string;
  name?: string | null;
  email?: string | null;
  roles: string[];
  status: string;
  createdAt?: string;
};

export type Rider = {
  id: string;
  status: string;
  availabilityStatus: string;
  vehicleType?: string | null;
  vehicleNumber?: string | null;
  user?: User;
  city?: City;
  zone?: Zone | null;
  createdAt?: string;
};

export type City = {
  id: string;
  name: string;
  state: string;
  slug: string;
  isActive: boolean;
  zones?: Zone[];
};

export type Zone = {
  id: string;
  cityId: string;
  name: string;
  slug: string;
  isActive: boolean;
  baseDeliveryFee?: string | number;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  isActive: boolean;
  defaultCommissionPercent?: string | number;
  parent?: Category | null;
  children?: Category[];
};

export type Shop = {
  id: string;
  name: string;
  phone: string;
  status: string;
  deliveryMode: string;
  city?: City;
  zone?: Zone;
  owner?: User;
  createdAt?: string;
};

export type Product = {
  id: string;
  name: string;
  price: string | number;
  stock: number;
  status: string;
  unit?: string;
  shop?: Shop;
  category?: Category;
};

export type Order = {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  totalAmount: string | number;
  subtotal: string | number;
  deliveryFee: string | number;
  platformFee?: string | number;
  placedAt: string;
  customer?: User;
  shop?: Shop;
  rider?: { user?: User } | null;
  items?: Array<{ id: string; name: string; quantity: number; unitPrice: string | number; lineTotal: string | number }>;
};

export type ItemRequest = {
  id: string;
  description: string;
  status: string;
  quotedAmount?: string | number | null;
  customer?: User;
  city?: City;
  zone?: Zone | null;
  shop?: Shop | null;
  quotes?: Array<{ id: string; amount: string | number; status: string; shop?: Shop | null }>;
  createdAt: string;
};
