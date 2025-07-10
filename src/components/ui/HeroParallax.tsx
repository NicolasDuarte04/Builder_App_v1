"use client";

import React, { useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  MotionValue,
  useMotionValueEvent,
} from "framer-motion";
import Image from "next/image";
import { useLanguage } from "@/components/LanguageProvider";
import { useTranslation } from "@/hooks/useTranslation";

interface Product {
  title: string;
  link: string;
  thumbnail: string;
}

interface ProductCardProps {
  product: Product;
  translate: MotionValue<number>;
}

interface HeroParallaxProps {
  products: Product[];
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, translate }) => {
  return (
    <motion.div
      style={{
        x: translate,
      }}
      whileHover={{
        y: -20,
      }}
      key={product.title}
      className="group/product h-96 w-[30rem] relative shrink-0"
    >
      <a
        href={product.link}
        className="block group-hover/product:shadow-2xl"
      >
        <Image
          src={product.thumbnail}
          alt={product.title}
          fill
          className="object-cover object-left-top"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </a>
      <div className="absolute inset-0 h-full w-full opacity-0 group-hover/product:opacity-80 bg-black pointer-events-none"></div>
      <h2 className="absolute bottom-4 left-4 opacity-0 group-hover/product:opacity-100 text-white">
        {product.title}
      </h2>
    </motion.div>
  );
};

export const Header: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div className="relative z-10 max-w-7xl mx-auto py-20 md:py-40 px-4 w-full">
      <div className="text-center">
        <h1 className="text-4xl md:text-7xl font-bold text-black dark:text-white drop-shadow-sm">
          {t("hero.title")}
        </h1>
        <p className="max-w-2xl mx-auto mt-8 text-lg md:text-xl text-gray-800 dark:text-gray-200 font-medium">
          {t("hero.subtitle")}
        </p>
      </div>
    </div>
  );
};

export const HeroParallax: React.FC<HeroParallaxProps> = ({ products }) => {
  const firstRow = products.slice(0, 4);
  const secondRow = products.slice(4, 7);
  const thirdRow = products.slice(7, 10);
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const springConfig = { stiffness: 70, damping: 35, bounce: 0 };

  const translateX = useSpring(
    useTransform(scrollY, [0, 2000], [0, -300]),
    springConfig
  );
  const translateXReverse = useSpring(
    useTransform(scrollY, [0, 2000], [0, 300]),
    springConfig
  );
  const rotateX = useSpring(
    useTransform(scrollY, [0, 1000], [15, 0]),
    springConfig
  );
  const opacity = useSpring(
    useTransform(scrollY, [0, 1000], [0.2, 1]),
    springConfig
  );
  const rotateZ = useSpring(
    useTransform(scrollY, [0, 1000], [20, 0]),
    springConfig
  );
  const translateY = useSpring(
    useTransform(scrollY, [0, 1000], [-150, 150]),
    springConfig
  );

  return (
    <div
      ref={ref}
      className="relative h-[400vh] pt-24 pb-40 overflow-hidden antialiased bg-white dark:bg-black [perspective:1000px] [transform-style:preserve-3d] scroll-smooth snap-y snap-mandatory"
    >
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white via-white/90 to-white dark:from-black dark:via-black/90 dark:to-black" />
      <Header />
      <motion.div
        style={{
          rotateX,
          rotateZ,
          translateY,
          opacity,
        }}
        className="relative z-0 snap-center"
      >
        <motion.div className="flex flex-row-reverse space-x-reverse space-x-20 mb-20 snap-x snap-mandatory">
          {firstRow.map((product) => (
            <ProductCard
              product={product}
              translate={translateX}
              key={product.title}
            />
          ))}
        </motion.div>
        <motion.div className="flex flex-row mb-20 space-x-20 snap-x snap-mandatory">
          {secondRow.map((product) => (
            <ProductCard
              product={product}
              translate={translateXReverse}
              key={product.title}
            />
          ))}
        </motion.div>
        <motion.div className="flex flex-row-reverse space-x-reverse space-x-20 snap-x snap-mandatory">
          {thirdRow.map((product) => (
            <ProductCard
              product={product}
              translate={translateX}
              key={product.title}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}; 