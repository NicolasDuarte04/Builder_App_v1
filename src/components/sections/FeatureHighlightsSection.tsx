'use client'

import { Search, Brain, FileText } from "lucide-react"
import { useTranslation } from "@/hooks/useTranslation";

export const FeatureHighlightsSection = () => {
    const { t } = useTranslation();

    const coreFeatures = [
        {
            icon: <Search className="w-6 h-6 text-white" />,
            title: t("features.core.compare_plans_title"),
            description: t("features.core.compare_plans_description")
        },
        {
            icon: <Brain className="w-6 h-6 text-white" />,
            title: t("features.core.ai_explains_title"),
            description: t("features.core.ai_explains_description")
        },
        {
            icon: <FileText className="w-6 h-6 text-white" />,
            title: t("features.core.analyze_pdfs_title"),
            description: t("features.core.analyze_pdfs_description")
        }
    ];

    return (
        <section className="py-20 lg:py-24 bg-gray-50 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
                    {coreFeatures.map((feature, index) => (
                        <div key={index} className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-md">
                                {feature.icon}
                            </div>
                            <h3 className="text-lg md:text-xl font-semibold text-gray-800 dark:text-white mb-2">
                                {feature.title}
                            </h3>
                            <p className="text-base text-gray-600 dark:text-gray-300 leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}; 