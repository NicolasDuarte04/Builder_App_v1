"use client";

import React, { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  MotionValue,
} from "framer-motion";
import Image from "next/image";
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
      className="group/product h-80 w-[28rem] relative shrink-0"
    >
      <a
        href={product.link}
        className="block group-hover/product:shadow-2xl"
      >
        <Image
          src={product.thumbnail}
          alt={product.title}
          fill
          className="object-cover object-left-top rounded-xl"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </a>
      <div className="absolute inset-0 h-full w-full opacity-0 group-hover/product:opacity-80 bg-black pointer-events-none rounded-xl"></div>
      <h2 className="absolute bottom-4 left-4 opacity-0 group-hover/product:opacity-100 text-white">
        {product.title}
      </h2>
    </motion.div>
  );
};

export const Header: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div className="relative z-10 max-w-7xl mx-auto py-24 md:py-32 px-4 w-full">
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

  const springConfig = { 
    stiffness: 50,  // Reduced for smoother motion
    damping: 30,    // Reduced for more natural feel
    bounce: 0.2,    // Slight bounce for organic feel
    mass: 0.8       // Added mass for smoother momentum
  };

  const translateX = useSpring(
    useTransform(scrollY, [0, 1500], [0, -300]),
    springConfig
  );
  const translateXReverse = useSpring(
    useTransform(scrollY, [0, 1500], [0, 300]),
    springConfig
  );
  const rotateX = useSpring(
    useTransform(scrollY, [0, 1500], [12, 0]),
    springConfig
  );
  const opacity = useSpring(
    useTransform(scrollY, [0, 1500], [0.3, 1]),
    springConfig
  );
  const rotateZ = useSpring(
    useTransform(scrollY, [0, 1500], [15, 0]),
    springConfig
  );
  const translateY = useSpring(
    useTransform(scrollY, [0, 1500], [-50, 150]),
    springConfig
  );

  return (
    <div
      ref={ref}
      className="relative h-[250vh] py-24 overflow-hidden antialiased bg-white dark:bg-black [perspective:1000px] [transform-style:preserve-3d] scroll-smooth"
    >
      <div className="sticky top-0 pt-16 pb-64">
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white via-white/90 to-white/50 dark:from-black dark:via-black/90 dark:to-black/50" />
        <Header />
        <motion.div
          style={{
            rotateX,
            rotateZ,
            translateY,
            opacity,
          }}
          className="relative z-0"
        >
          <motion.div className="flex flex-row-reverse space-x-reverse space-x-16 mb-24">
            {firstRow.map((product) => (
              <ProductCard
                product={product}
                translate={translateX}
                key={product.title}
              />
            ))}
          </motion.div>
          <motion.div className="flex flex-row mb-24 space-x-16">
            {secondRow.map((product) => (
              <ProductCard
                product={product}
                translate={translateXReverse}
                key={product.title}
              />
            ))}
          </motion.div>
          <motion.div className="flex flex-row-reverse space-x-reverse space-x-16">
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
    </div>
  );
}; 