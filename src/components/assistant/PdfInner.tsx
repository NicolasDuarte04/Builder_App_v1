"use client";
import { useEffect, useRef } from "react";

// Use the legacy build to avoid node-canvas, and set workerSrc to our public worker.
import * as pdfjs from "pdfjs-dist/legacy/build/pdf";
import "pdfjs-dist/legacy/build/pdf.worker.min"; // type side-effects ok, but we'll set workerSrc too.

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.js";

export default function PdfInner({ url }: { url: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!url || !containerRef.current) return;
      
      try {
        const loadingTask = pdfjs.getDocument({ url });
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        
        const container = containerRef.current;
        container.innerHTML = "";

        // Sticky header inside viewer
        const stickyHeader = document.createElement('div');
        stickyHeader.className = 'sticky top-0 z-10 bg-white dark:bg-neutral-950 text-xs text-gray-600 px-2 py-1 border-b border-gray-100 dark:border-gray-800';
        stickyHeader.dataset.viewerHeader = 'true';
        stickyHeader.textContent = `PDF • Page 1`;
        container.appendChild(stickyHeader);

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

        // Observe visible page to update header
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
              stickyHeader.textContent = `PDF • Page ${top.page}`;
            }
          }, { root: rootEl, threshold: [0.6] });
          pageWraps.forEach(w => io.observe(w));
        } catch {}
        
      } catch (error) {
        if (!cancelled) {
          console.error('PDF rendering error:', error);
          if (containerRef.current) {
            containerRef.current.innerHTML = `<div class="p-4 text-red-600">Failed to load PDF: ${error.message}</div>`;
          }
        }
      }
    })();
    
    return () => { cancelled = true; };
  }, [url]);

  return <div ref={containerRef} className="h-full w-full overflow-auto" />;
}
