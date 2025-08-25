"use client";
import { useEffect } from "react";

export default function ChunkRecovery() {
  useEffect(() => {
    const handler = (e: any) => {
      const isChunkError =
        e?.reason?.name === "ChunkLoadError" ||
        (typeof e?.reason?.message === "string" && e.reason.message.includes("ChunkLoadError"));
      if (isChunkError) {
        // Prevent infinite loops: use a one-shot flag
        const k = "__briki_chunk_reloaded__";
        if (!sessionStorage.getItem(k)) {
          sessionStorage.setItem(k, "1");
          location.reload();
        }
      }
    };
    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }, []);
  return null;
}
