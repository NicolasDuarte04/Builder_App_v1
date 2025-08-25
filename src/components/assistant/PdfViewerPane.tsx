"use client";

import React, { forwardRef, useImperativeHandle } from "react";
import PdfInner from "./PdfInner";

export type PdfViewerHandle = { scrollToPage: (page: number, highlight?: boolean) => void };

type Props = {
    url?: string;
    height?: number; // optional container height; if omitted, rely on CSS classes
    className?: string;
    onVisiblePageChange?: (page: number) => void;
    labels?: { pdf: string; page: string };
};

const PdfViewerPane = forwardRef<PdfViewerHandle, Props>(function PdfViewerPane(
    { url, height, className, onVisiblePageChange, labels },
	ref
) {
    useImperativeHandle(ref, () => ({
        scrollToPage(page: number, highlight?: boolean) {
            const node = document.querySelector(`[data-pdf-page="${page}"]`);
            const el = node as HTMLElement | null;
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
            if (highlight && el) {
                el.classList.add('ring-2','ring-blue-400');
                setTimeout(() => {
                    el.classList.remove('ring-2','ring-blue-400');
                }, 900);
            }
        },
    }));

	return (
		<div className={className}>
            <div
                className="overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-neutral-950"
                style={typeof height === 'number' ? { height } : undefined}
                aria-label="PDF viewer"
            >
                {url ? (
                    <PdfInner url={url} />
                ) : (
                    <div className="p-3 text-xs text-gray-500">No PDF available.</div>
                )}
            </div>
		</div>
	);
});

export default PdfViewerPane;
