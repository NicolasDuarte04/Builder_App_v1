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
import { Button } from "@/components/ui/button";
import { IconSparkles, IconPlayerPlay } from "@tabler/icons-react";

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
        className="block group-hover/product:shadow-2xl relative h-full w-full"
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
    <div className="relative z-10 min-h-[90vh] w-full flex items-center justify-center">
      <div className="max-w-[1200px] w-full px-4 py-16 md:py-20">
        <div className="text-center max-w-4xl mx-auto">
          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold text-black dark:text-white leading-[1.1] tracking-[-0.02em] mb-8 md:mb-10"
            dangerouslySetInnerHTML={{ __html: t("hero.title") }}
          />

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-300 font-normal leading-relaxed tracking-[-0.01em] max-w-3xl mx-auto mb-12 md:mb-14"
          >
            {t("hero.subtitle")}
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center items-center"
          >
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-600 hover:to-cyan-500 text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl dark:shadow-[0_0_20px_rgba(59,130,246,0.2)] dark:hover:shadow-[0_0_25px_rgba(59,130,246,0.3)] transition-all duration-300 transform hover:scale-[1.02] min-w-[200px]"
              onClick={() => window.location.href = '/assistant'}
            >
              {t("hero.cta_secondary")}
              <IconSparkles className="ml-2 w-5 h-5" strokeWidth={2} />
            </Button>
          </motion.div>
        </div>
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
      className="relative h-[250vh] py-8 md:py-12 overflow-hidden antialiased bg-white dark:bg-black [perspective:1000px] [transform-style:preserve-3d] scroll-smooth"
    >
      <div className="sticky top-0 pt-8 md:pt-12 pb-64">
        <div className="absolute inset-0 pointer-events-none bg-white/90 dark:bg-black/90" />
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