import {
  LayoutDashboard,
  Boxes,
  Receipt,
  Truck,
  UserRound,
  Wallet,
  BarChart3,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  subtitle: string;
  icon: LucideIcon;
  /** Match the path exactly (used for the dashboard at "/"). */
  end?: boolean;
}

export interface NavGroup {
  title?: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      {
        to: "/",
        label: "Dashboard",
        subtitle: "Overview of today's shop activity",
        icon: LayoutDashboard,
        end: true,
      },
    ],
  },
  {
    title: "Operations",
    items: [
      { to: "/inventory", label: "Inventory", subtitle: "Products, sizes, colors and stock levels", icon: Boxes },
      { to: "/sales", label: "Sales", subtitle: "Invoices, payments and sales history", icon: Receipt },
      { to: "/suppliers", label: "Suppliers", subtitle: "Supplier accounts and balances", icon: Truck },
      { to: "/salesmen", label: "Salesmen", subtitle: "Sales staff and performance", icon: UserRound },
      { to: "/expenses", label: "Expenses", subtitle: "Record and review shop expenses", icon: Wallet },
    ],
  },
  {
    title: "Management",
    items: [
      { to: "/reports", label: "Reports", subtitle: "Sales, stock and profit/loss reports", icon: BarChart3 },
      { to: "/users", label: "Users", subtitle: "Staff accounts, roles and status", icon: Users },
      { to: "/settings", label: "Settings", subtitle: "Receipt, stock alerts and backups", icon: Settings },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

/** Finds the nav entry for the current URL path (used for the topbar page title). */
export function findNavItem(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)));
}