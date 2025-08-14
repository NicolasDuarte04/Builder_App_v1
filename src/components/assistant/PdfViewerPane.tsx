"use client";

import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { pdfjs } from "react-pdf";

// Configure PDF.js worker from a CDN (avoids SSR issues)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

const Document = dynamic(() => import("react-pdf").then((m) => m.Document), { ssr: false });
const Page = dynamic(() => import("react-pdf").then((m) => m.Page), { ssr: false });

export type PdfViewerHandle = { scrollToPage: (page: number) => void };

type Props = { url?: string };

const PdfViewerPane = forwardRef<PdfViewerHandle, Props>(({ url }, ref) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const [numPages, setNumPages] = useState<number>(0);

	useImperativeHandle(ref, () => ({
		scrollToPage: (page: number) => {
			const node = containerRef.current?.querySelector(`[data-pdf-page="${page}"]`);
			(node as HTMLElement | null)?.scrollIntoView({ behavior: "smooth", block: "center" });
		},
	}));

	if (!url) {
		return (
			<div className="h-[70vh] rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-sm text-gray-500">
				No PDF available for verification.
			</div>
		);
	}

	return (
		<div
			ref={containerRef}
			className="h-[70vh] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
		>
			<Document file={url} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
				{Array.from({ length: numPages }, (_, i) => (
					<div key={i} data-pdf-page={i + 1} className="p-2 border-b border-gray-100 dark:border-gray-800">
						<div className="mb-1 text-[11px] text-gray-500">PDF • Page {i + 1}</div>
						<Page pageNumber={i + 1} width={500} renderTextLayer renderAnnotationLayer />
					</div>
				))}
			</Document>
		</div>
	);
});

PdfViewerPane.displayName = "PdfViewerPane";
export default PdfViewerPane;
