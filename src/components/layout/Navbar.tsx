"use client";

import React, { useState, useEffect } from "react";
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

const getNavItems = (t: (key: string) => string) => [
  { name: t("nav.home"), link: "/" },
  { name: t("nav.about"), link: "/about" },
  { name: t("nav.contact"), link: "/contact" },
];

export function MainNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const { t } = useTranslation();
  const navItems = getNavItems(t);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setVisible(scrollPosition > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <Navbar>
        <NavBody>
          <NavbarLogo />
          <NavItems items={navItems} />
          <div className="relative z-20 flex items-center space-x-2">
            <LanguageToggle />
            <ThemeToggle />
            <NavbarButton href="/login" variant="secondary">
              {t("nav.login")}
            </NavbarButton>
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
            <a
              key={index}
              href={item.link}
              className="w-full rounded-lg p-2 text-sm hover:bg-gray-100 dark:hover:bg-neutral-900"
              onClick={() => setIsOpen(false)}
            >
              {item.name}
            </a>
          ))}
          <div className="flex w-full flex-col gap-2">
            <NavbarButton href="/login" variant="secondary" className="w-full" visible={visible}>
              {t("nav.login")}
            </NavbarButton>
          </div>
        </MobileNavMenu>
      </MobileNav>
    </>
  );
} 