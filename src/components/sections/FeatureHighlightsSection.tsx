'use client'

import { useRef } from "react"
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowDown, Search, Brain, MessageSquare, PenTool } from "lucide-react"
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

export const FeatureHighlightsSection = () => {
    const { t } = useTranslation();

    // Array of feature data
    const features = [
        {
            id: 1,
            title: t("features.prompt_builder.title"),
            description: t("features.prompt_builder.description"),
            icon: <Search className="w-8 h-8" />,
            imageName: "prompt-builder-illustration.svg",
            reverse: false
        },
        {
            id: 2,
            title: t("features.confidence_advisor.title"),
            description: t("features.confidence_advisor.description"),
            icon: <Brain className="w-8 h-8" />,
            imageName: "confidence-advisor-illustration.svg",
            reverse: true
        },
        {
            id: 3,
            title: t("features.result_analyzer.title"),
            description: t("features.result_analyzer.description"),
            icon: <MessageSquare className="w-8 h-8" />,
            imageName: "result-analyzer-illustration.svg",
            reverse: false
        },
        {
            id: 4,
            title: t("features.smart_rephraser.title"),
            description: t("features.smart_rephraser.description"),
            icon: <PenTool className="w-8 h-8" />,
            imageName: "smart-rephraser-illustration.svg",
            reverse: true
        }
    ]

    // Create refs and animations for each section
    const sectionRefs = features.map(() => useRef(null));
    
    const scrollYProgress = features.map((_, index) => {
        return useScroll({
            target: sectionRefs[index],
            offset: ["start end", "center start"]
        }).scrollYProgress;
    });

    // Create animations for each section
    const opacityContents = scrollYProgress.map(progress => 
        useTransform(progress, [0, 0.7], [0, 1])
    );
    
    const clipProgresses = scrollYProgress.map(progress => 
        useTransform(progress, [0, 0.7], ["inset(0 100% 0 0)", "inset(0 0% 0 0)"])
    );
    
    const translateContents = scrollYProgress.map(progress => 
        useTransform(progress, [0, 1], [-50, 0])
    );

    return (
        <div className="bg-white dark:bg-black">
            {/* Header Section */}
            <div className='min-h-screen w-screen flex flex-col items-center justify-center'>
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                    className="text-center"
                >
                    <h1 className='text-4xl md:text-6xl max-w-4xl text-center font-bold text-gray-900 dark:text-white mb-6'>
                        {t("features.section_title")}
                    </h1>
                    <p className='text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto'>
                        {t("features.section_subtitle")}
                    </p>
                    <div className='mt-20 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400'>
                        {t("features.scroll_hint")} <ArrowDown size={15} />
                    </div>
                </motion.div>
            </div>

            {/* Feature Sections */}
            <div className="flex flex-col md:px-0 px-10">
                {features.map((feature, index) => (
                    <div 
                        key={feature.id}
                        ref={sectionRefs[index]} 
                        className={`h-screen flex items-center justify-center md:gap-40 gap-20 ${feature.reverse ? 'flex-row-reverse' : ''}`}
                    >
                        <motion.div style={{ y: translateContents[index] }}>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-teal-500 rounded-2xl flex items-center justify-center text-white">
                                    {feature.icon}
                                </div>
                                <div className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white max-w-sm">
                                    {feature.title}
                                </div>
                            </div>
                            <motion.p 
                                style={{ y: translateContents[index] }} 
                                className="text-gray-600 dark:text-gray-300 max-w-sm mt-6 text-lg leading-relaxed"
                            >
                                {feature.description}
                            </motion.p>
                        </motion.div>
                        <motion.div 
                            style={{ 
                                opacity: opacityContents[index],
                                clipPath: clipProgresses[index],
                            }}
                            className="relative"
                        >
                            <div className="w-80 h-80 bg-gradient-to-br from-blue-100 to-teal-100 dark:from-blue-900/20 dark:to-teal-900/20 rounded-3xl flex items-center justify-center p-8">
                                <img 
                                    src={`/images/features/${feature.imageName}`}
                                    alt={feature.title}
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        </motion.div>
                    </div>
                ))}
            </div>

            {/* End Section */}
            <div className='min-h-screen w-screen flex flex-col items-center justify-center'>
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                    className="text-center"
                >
                    <h1 className='text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6'>
                        {t("features.ready_to_start")}
                    </h1>
                    <p className='text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto'>
                        {t("features.ready_description")}
                    </p>
                </motion.div>
            </div>

            {/* Storyset Attributions */}
            <div className="fixed bottom-4 right-4 text-xs text-gray-500 dark:text-gray-400 opacity-60">
                <div>
                    <a href="https://storyset.com/technology" className="hover:underline">
                        Technology illustrations by Storyset
                    </a>
                </div>
                <div>
                    <a href="https://storyset.com/online" className="hover:underline">
                        Online illustrations by Storyset
                    </a>
                </div>
            </div>
        </div>
    );
}; 