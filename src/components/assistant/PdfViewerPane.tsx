"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

// Types for dynamic pdfjs imports
type PdfJsModule = typeof import("pdfjs-dist");
type GetDocumentParams = Parameters<PdfJsModule["getDocument"]>[0];

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
	const hostRef = useRef<HTMLDivElement>(null);
	const [numPages, setNumPages] = useState<number>(0);
	const [loading, setLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
        scrollToPage(page: number, highlight?: boolean) {
            const node = hostRef.current?.querySelector(`[data-pdf-page="${page}"]`);
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

	useEffect(() => {
		let cancelled = false;

        async function resolveWorker(): Promise<{ url: string; type: 'module' | 'classic' } | null> {
            // Ship classic worker from /public for maximum compatibility
            return { url: '/pdf.worker.js', type: 'classic' };
        }

		async function renderPdf() {
			if (!url || !hostRef.current) return;
			setLoading(true);
			setError(null);

            try {
                if (typeof window === 'undefined') return;
                // Import browser ESM build directly (pinned version in package.json)
                const mod: any = await import('pdfjs-dist/build/pdf.js');
                const pdfjs = mod?.default ?? mod;
                if (!pdfjs || !pdfjs.getDocument) throw new Error('Unable to load pdf.js browser build');
				const worker = await resolveWorker();
				if (!worker) throw new Error('Unable to resolve pdf.js worker');
                const pdfjsLib: any = pdfjs;
				try {
					if (pdfjsLib.GlobalWorkerOptions) {
                        if (worker.type === 'module') {
                            pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(worker.url, { type: 'module' } as any);
                        } else {
                            pdfjsLib.GlobalWorkerOptions.workerSrc = worker.url;
                        }
					}
				} catch {}

                console.info('[pdf-viewer] pdfjs+worker selected', { workerType: worker.type, workerUrl: worker.url });
                const container = hostRef.current!;
                container.innerHTML = "";

                // Sticky header inside viewer
                const stickyHeader = document.createElement('div');
                stickyHeader.className = 'sticky top-0 z-10 bg-white dark:bg-neutral-950 text-xs text-gray-600 px-2 py-1 border-b border-gray-100 dark:border-gray-800';
                stickyHeader.dataset.viewerHeader = 'true';
                stickyHeader.textContent = `${labels?.pdf ?? 'PDF'} • ${labels?.page ?? 'Page'} 1`;
                container.appendChild(stickyHeader);

				const loadingTask = (pdfjsLib as any).getDocument({ url } as GetDocumentParams);
				const pdf = await loadingTask.promise;
				if (cancelled) return;
				setNumPages(pdf.numPages);

                const pageWraps: HTMLElement[] = [];
                for (let i = 1; i <= pdf.numPages; i++) {
					const page = await pdf.getPage(i);
					if (cancelled) return;

                    const viewport = page.getViewport({ scale: 1 });
                    const containerWidth = Math.max(520, container.clientWidth || 520);
                    const scale = Math.max(0.3, Math.min(3, (containerWidth - 16) / viewport.width));
					const scaledViewport = page.getViewport({ scale });

					const wrap = document.createElement("div");
                    wrap.dataset.pdfPage = String(i);
                    wrap.id = `pdf-page-${i}`;
                    wrap.className = "mb-2 border-b border-gray-100 dark:border-gray-800 pb-2 transition-shadow";
					container.appendChild(wrap);
                    pageWraps.push(wrap);

					const canvas = document.createElement("canvas");
					const ctx = canvas.getContext("2d")!;
					canvas.width = Math.floor(scaledViewport.width);
					canvas.height = Math.floor(scaledViewport.height);
					canvas.style.width = `${Math.floor(scaledViewport.width)}px`;
					canvas.style.height = `${Math.floor(scaledViewport.height)}px`;
					wrap.appendChild(canvas);

					await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
				}

                // Observe visible page to update header and notify parent
                try {
                    const rootEl = container;
                    const io = new IntersectionObserver((entries) => {
                        let top: { page: number; ratio: number } | null = null;
                        for (const e of entries) {
                            if (!e.isIntersecting) continue;
                            const page = parseInt((e.target as HTMLElement).dataset.pdfPage || '0', 10);
                            const ratio = e.intersectionRatio;
                            if (!top || ratio > top.ratio) top = { page, ratio };
                        }
                        if (top && Number.isFinite(top.page)) {
                            stickyHeader.textContent = `${labels?.pdf ?? 'PDF'} • ${labels?.page ?? 'Page'} ${top.page}`;
                            onVisiblePageChange?.(top.page);
                        }
                    }, { root: rootEl, threshold: [0.6] });
                    pageWraps.forEach(w => io.observe(w));
                } catch {}
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
    }, [url]);

	return (
		<div className={className}>
            <div
                ref={hostRef}
                className="overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-neutral-950"
                style={typeof height === 'number' ? { height } : undefined}
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
