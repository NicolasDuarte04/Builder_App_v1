"use client";

import { useEffect } from "react";

const RELOAD_FLAG = "__briki_chunk_reloaded__";

export default function ChunkRecovery() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const reloadOnce = () => {
      if (sessionStorage.getItem(RELOAD_FLAG)) return;
      sessionStorage.setItem(RELOAD_FLAG, "1");

      const url = new URL(window.location.href);
      url.searchParams.set("_v", String(Date.now()));
      window.location.replace(url.toString());
    };

    const onWindowError = (e: ErrorEvent) => {
      const msg = String(e?.message || "").toLowerCase();
      if (msg.includes("loading chunk") || msg.includes("chunkloaderror")) {
        reloadOnce();
      }
    };

    const onUnhandledRejection = (e: PromiseRejectionEvent) => {
      try {
        const reason = (e?.reason && String(e.reason)) || "";
        const low = reason.toLowerCase();
        if (low.includes("chunkloaderror") || low.includes("loading chunk")) {
          reloadOnce();
        }
      } catch {
        // no-op
      }
    };

    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}


