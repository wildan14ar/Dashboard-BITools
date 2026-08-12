"use client";

import { usePathname } from "next/navigation";
import { JSX, ReactNode, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PanelLeftClose, PanelLeftOpen, ChevronDown } from "lucide-react";
import ButtonLogout from "@/components/atoms/ButtonLogout";
import ButtonTheme from "@/components/atoms/ButtonTheme";
import Link from "next/link";
import { useLanguage } from "@/hooks/use-language";

// Unified menu item type for Sidebar
export type SubMenuItem = { 
  key: string;
  translations: Record<string, string>;
  href: string;
};

export type MenuItem = {
  key: string;
  translations: Record<string, string>;
  icon: JSX.Element;
  href?: string;
  subMenu?: SubMenuItem[];
};

// Sidebar props
type SidebarProps = {
  menuConfig?: MenuItem[];
  validSidebar?: string[];
  logoSrc?: string;
  brandName?: string;
  isMenuOpen?: boolean;
  defaultMenuOpen?: boolean;
  onMenuToggle?: (open: boolean) => void;
  children?: ReactNode;
  widthClassName?: string;
  widthValue?: number;
};

export default function Sidebar({
  menuConfig = [],
  validSidebar = ["/dashboard/**"],
  isMenuOpen: controlledMenu,
  defaultMenuOpen = true,
  onMenuToggle,
  children,
  widthClassName = "sm:w-64",
  widthValue = 256,
  brandName,
}: SidebarProps) {
  const pathname = usePathname();
  const { locale } = useLanguage();

  // Convert menuConfig to menuItems based on locale
  const menuItems = menuConfig.map((item) => ({
    name: item.translations[locale] || item.translations["en"] || item.key,
    icon: item.icon,
    href: item.href,
    subMenu: item.subMenu?.map((sub) => ({
      name: sub.translations[locale] || sub.translations["en"] || sub.key,
      href: sub.href,
    })),
  }));

    // Function to check if current path matches any valid sidebar pattern
    const isValidPath = (currentPath: string, validPaths: string[]): boolean => {
        const currentSegments = currentPath.split("/").filter(Boolean);

        return validPaths.some((validPath) => {
            if (validPath.endsWith("/**")) {
                const baseSegments = validPath.slice(0, -3).split("/").filter(Boolean);
                return baseSegments.every((seg, i) => currentSegments[i] === seg);
            }

            if (validPath.endsWith("/*")) {
                const baseSegments = validPath.slice(0, -2).split("/").filter(Boolean);
                if (currentSegments.length > baseSegments.length + 1) return false;
                return baseSegments.every((seg, i) => currentSegments[i] === seg);
            }

            const targetSegments = validPath.split("/").filter(Boolean);
            if (currentSegments.length !== targetSegments.length) return false;
            return targetSegments.every((seg, i) => currentSegments[i] === seg);
        });
    };

    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultMenuOpen);
    const isControlledMenu = controlledMenu !== undefined;
    const open = isControlledMenu ? controlledMenu! : uncontrolledOpen;
    const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);
    const placement = "left";

    const toggleMenu = () => {
        const next = !open;
        if (isControlledMenu) {
            onMenuToggle?.(next);
        } else {
            setUncontrolledOpen(next);
        }
    };

    const toggleSubMenu = (name: string) => {
        setOpenSubMenu((prev) => (prev === name ? null : name));
    };

    const offsetX = open ? 0 : placement === "left" ? -widthValue : widthValue;

    return (
        <>
            {/* Collapsed sidebar */}
            {!open && (
                <div
                    className={`hidden sm:block h-full ${placement}-4 border-r border-border p-3 bg-background shadow-sm ${isValidPath(pathname, validSidebar) ? "block" : "hidden"
                        }`}
                >
                    <div className="flex flex-col items-center gap-4">
                        {/* Toggle button */}
                        <button
                            onClick={toggleMenu}
                            className="p-2 rounded-lg bg-card border border-border hover:bg-accent transition-colors shadow-sm"
                            aria-label="Open sidebar"
                        >
                            <PanelLeftOpen size={20} />
                        </button>

                        {/* Collapsed menu items */}
                        <div className="hidden sm:flex flex-col items-center gap-3">
                            {menuItems.map((item) => (
                                <Link
                                    href={item.href ?? item.subMenu?.[0]?.href ?? "#"}
                                    key={item.name}
                                    title={item.name}
                                    className="p-2 rounded-lg bg-card border border-border hover:bg-accent transition-colors shadow-sm"
                                >
                                    {item.icon}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Expanded sidebar */}
            {open && (
                <motion.aside
                    initial={false}
                    animate={placement === "left" ? { x: offsetX } : { x: -offsetX }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className={`fixed md:sticky top-0 ${placement}-0 h-screen w-full ${widthClassName} flex flex-col bg-background border-r border-border shadow-xl z-50 ${isValidPath(pathname, validSidebar) ? "block" : "hidden"
                        }`}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4.5 py-2 border-b border-border">
                        <Link href="/" className="flex items-center gap-2 group no-underline">
                            <span className="font-bold text-xl text-foreground group-hover:text-primary transition-colors">
                                {brandName || "Dashboard"}
                            </span>
                        </Link>
                        <button
                            onClick={toggleMenu}
                            className="p-2 rounded-lg hover:bg-accent transition-colors"
                            aria-label="Close sidebar"
                        >
                            <PanelLeftClose size={20} />
                        </button>
                    </div>

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto scroll-hidden-y">
                        {/* Navigation */}
                        {menuItems.length > 0 && (
                            <nav className="p-3 space-y-1">
                                {menuItems.map((item) => (
                                    <div key={item.name} className="space-y-0.5">
                                        {item.subMenu ? (
                                            <button
                                                onClick={() => toggleSubMenu(item.name)}
                                                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                                            >
                                                <div className="flex items-center gap-2">
                                                    {item.icon}
                                                    <span>{item.name}</span>
                                                </div>
                                                <motion.span
                                                    animate={{
                                                        rotate: openSubMenu === item.name ? 180 : 0,
                                                    }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <ChevronDown size={16} />
                                                </motion.span>
                                            </button>
                                        ) : (
                                            <Link
                                                href={item.href || "#"}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${pathname === item.href
                                                    ? "text-primary bg-primary/10"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                                    }`}
                                            >
                                                {item.icon}
                                                <span>{item.name}</span>
                                            </Link>
                                        )}

                                        {/* Submenu */}
                                        <AnimatePresence>
                                            {openSubMenu === item.name && item.subMenu && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="ml-8 mt-1 space-y-1 overflow-hidden"
                                                >
                                                    {item.subMenu.map((sub) => (
                                                        <Link
                                                            key={sub.name}
                                                            href={sub.href}
                                                            className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${pathname === sub.href
                                                                ? "text-primary bg-primary/10"
                                                                : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                                                }`}
                                                        >
                                                            {sub.name}
                                                        </Link>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </nav>
                        )}

                        {/* Additional custom content */}
                        {children && <div className="px-3">{children}</div>}
                    </div>

                    {/* Footer actions */}
                    <div className="p-3 border-t border-border space-y-2">
                        <ButtonTheme variant="text" />
                        <ButtonLogout />
                    </div>
                </motion.aside >
            )
            }

            {/* Overlay for mobile */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={toggleMenu}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
                    />
                )}
            </AnimatePresence>
        </>
    );
}