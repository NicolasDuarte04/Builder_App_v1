"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

// Types for dynamic pdfjs imports
type PdfJsModule = typeof import("pdfjs-dist");
type GetDocumentParams = Parameters<PdfJsModule["getDocument"]>[0];

export type PdfViewerHandle = { scrollToPage: (page: number) => void };

type Props = {
	url?: string;
	height?: number; // container height
	pageWidth?: number; // canvas width in px
	className?: string;
};

const PdfViewerPane = forwardRef<PdfViewerHandle, Props>(function PdfViewerPane(
	{ url, height = 560, pageWidth = 520, className },
	ref
) {
	const hostRef = useRef<HTMLDivElement>(null);
	const [numPages, setNumPages] = useState<number>(0);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	useImperativeHandle(ref, () => ({
		scrollToPage(page: number) {
			const node = hostRef.current?.querySelector(`[data-pdf-page="${page}"]`);
			(node as HTMLElement | null)?.scrollIntoView({ behavior: "smooth", block: "center" });
		},
	}));

	useEffect(() => {
		let cancelled = false;

		async function resolveWorker(): Promise<{ url: string; type: 'module' | 'classic' } | null> {
			// Prefer legacy ESM worker for browser
			try {
				const url = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString();
				return { url, type: 'module' };
			} catch {}
			// Fallback to classic legacy worker
			try {
				const url = new URL('pdfjs-dist/legacy/build/pdf.worker.js', import.meta.url).toString();
				return { url, type: 'classic' };
			} catch {}
			return null;
		}

		async function renderPdf() {
			if (!url || !hostRef.current) return;
			setLoading(true);
			setError(null);

			try {
				// Import browser-friendly legacy ESM entry only on client
				const pdfjsModule: any = await import('pdfjs-dist/legacy/build/pdf.mjs');
				const pdfjs: PdfJsModule = (pdfjsModule?.default ?? pdfjsModule) as PdfJsModule;
				const worker = await resolveWorker();
				if (!worker) throw new Error('Unable to resolve pdf.js worker');
				const pdfjsLib: any = (pdfjs as any);
				if (typeof window === 'undefined') return; // Hard SSR guard
				try {
					if (pdfjsLib.GlobalWorkerOptions) {
						if ('workerPort' in pdfjsLib.GlobalWorkerOptions && worker.type === 'module') {
							pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(worker.url, { type: 'module' } as any);
						} else {
							pdfjsLib.GlobalWorkerOptions.workerSrc = worker.url;
						}
					}
				} catch {}

				const container = hostRef.current!;
				container.innerHTML = "";

				const loadingTask = (pdfjsLib as any).getDocument({ url } as GetDocumentParams);
				const pdf = await loadingTask.promise;
				if (cancelled) return;
				setNumPages(pdf.numPages);

				for (let i = 1; i <= pdf.numPages; i++) {
					const page = await pdf.getPage(i);
					if (cancelled) return;

					const viewport = page.getViewport({ scale: 1 });
					const scale = pageWidth / viewport.width;
					const scaledViewport = page.getViewport({ scale });

					const wrap = document.createElement("div");
					wrap.dataset.pdfPage = String(i);
					wrap.className = "mb-2 border-b border-gray-100 dark:border-gray-800 pb-2";
					container.appendChild(wrap);

					const header = document.createElement("div");
					header.className = "text-[11px] text-gray-500 mb-1";
					header.textContent = `PDF • Page ${i}`;
					wrap.appendChild(header);

					const canvas = document.createElement("canvas");
					const ctx = canvas.getContext("2d")!;
					canvas.width = Math.floor(scaledViewport.width);
					canvas.height = Math.floor(scaledViewport.height);
					canvas.style.width = `${Math.floor(scaledViewport.width)}px`;
					canvas.style.height = `${Math.floor(scaledViewport.height)}px`;
					wrap.appendChild(canvas);

					await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
				}
			} catch (e: any) {
				if (!cancelled) setError(e?.message ?? "Failed to render PDF");
			} finally {
				if (!cancelled) setLoading(false);
			}
		}

		renderPdf();
		return () => {
			cancelled = true;
		};
	}, [url, pageWidth]);

	return (
		<div className={className}>
			<div
				ref={hostRef}
				className="overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-neutral-950"
				style={{ height }}
				aria-label="PDF viewer"
			/>
			{loading && <div className="mt-2 text-xs text-gray-500">Loading PDF…</div>}
			{error && <div className="mt-2 text-xs text-red-600">{error}</div>}
			{!url && <div className="p-3 text-xs text-gray-500">No PDF available.</div>}
			{numPages === 0 && url && !loading && !error && (
				<div className="p-3 text-xs text-gray-500">No pages found.</div>
			)}
		</div>
	);
});

export default PdfViewerPane;
