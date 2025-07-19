"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
  NavbarLogo,
  NavbarButton,
} from "@/components/ui/resizable-navbar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useTranslation } from "@/hooks/useTranslation";
import { useSession, signOut } from "next-auth/react";
import { ChevronDown, LogOut, User } from "lucide-react";
import Link from "next/link";

const getNavItems = (t: (key: string) => string) => [
  { name: t("nav.home"), link: "/" },
  { name: t("nav.about"), link: "/about" },
  { name: t("nav.assistant"), link: "/assistant" },
];

export function MainNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { t } = useTranslation();
  const navItems = getNavItems(t);
  const { data: session, status } = useSession();
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setVisible(scrollPosition > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/' });
  };

  const UserMenu = () => (
    <div className="relative" ref={userMenuRef}>
      <button
        onClick={() => setShowUserMenu(!showUserMenu)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      >
        <User className="w-4 h-4" />
        <span>{session?.user?.name || session?.user?.email}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
      </button>
      
      {showUserMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Navbar>
        <NavBody>
          <NavbarLogo />
          <NavItems items={navItems} />
          <div className="relative z-20 flex items-center space-x-2">
            <LanguageToggle />
            <ThemeToggle />
            {status === "loading" ? (
              <div className="px-4 py-2 text-sm text-gray-500">Loading...</div>
            ) : session ? (
              <UserMenu />
            ) : (
              <NavbarButton href="/login" variant="secondary">
                {t("nav.login")}
              </NavbarButton>
            )}
          </div>
        </NavBody>
      </Navbar>

      <MobileNav>
        <MobileNavHeader>
          <NavbarLogo />
          <div className="flex items-center space-x-2">
            <LanguageToggle />
            <ThemeToggle />
            <MobileNavToggle isOpen={isOpen} onClick={() => setIsOpen(!isOpen)} />
          </div>
        </MobileNavHeader>
        <MobileNavMenu isOpen={isOpen} onClose={() => setIsOpen(false)}>
          {navItems.map((item, index) => (
            <Link
              key={index}
              href={item.link}
              className="w-full rounded-lg p-2 text-sm hover:bg-gray-100 dark:hover:bg-neutral-900"
              onClick={() => setIsOpen(false)}
              prefetch={true}
            >
              {item.name}
            </Link>
          ))}
          <div className="flex w-full flex-col gap-2">
            {status === "loading" ? (
              <div className="px-4 py-2 text-sm text-gray-500">Loading...</div>
            ) : session ? (
              <div className="w-full">
                <div className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700">
                  {session.user?.name || session.user?.email}
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            ) : (
              <NavbarButton href="/login" variant="secondary" className="w-full" visible={visible}>
                {t("nav.login")}
              </NavbarButton>
            )}
          </div>
        </MobileNavMenu>
      </MobileNav>
    </>
  );
} 