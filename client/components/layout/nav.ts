export const NAV = [
  { href: "/dashboard", label: "Overview", icon: "M3 11l9-7.5L21 11M5 9.5V20h5v-6h4v6h5V9.5" },
  {
    href: "/dashboard/drivers",
    label: "Drivers",
    icon: "M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM21 20v-1a4 4 0 0 0-3-3.9M16 4.1a3.5 3.5 0 0 1 0 6.8",
  },
  {
    href: "/dashboard/tracking",
    label: "Live tracking",
    icon: "M12 21s7-6.2 7-11.5a7 7 0 1 0-14 0C5 14.8 12 21 12 21ZM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  },
  {
    href: "/dashboard/logs",
    label: "Session logs",
    icon: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  },
];

export function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname.startsWith(href);
}