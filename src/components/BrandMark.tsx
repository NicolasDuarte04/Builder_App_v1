import React from "react";
import clsx from "clsx";

/**
 * Renders the Briki brand consistently.
 * Uses a non-breaking hyphen (U+2011) in "Co-Pilot" to avoid line breaks.
 */
export function BrandMark({
  withCopilot = true,
  className = "",
  as: Tag = "span",
}: {
  withCopilot?: boolean;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}) {
  return (
    <Tag className={clsx("inline-flex items-baseline gap-1 whitespace-nowrap", className)}>
      <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-cyan-400">
        Briki
      </span>
      {withCopilot && <span>Co‑Pilot</span>}{/* NB hyphen! */}
    </Tag>
  );
}
export default BrandMark;
