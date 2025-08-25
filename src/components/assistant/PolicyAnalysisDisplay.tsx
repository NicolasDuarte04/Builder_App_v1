/*
See audit notes in `AIAssistantInterface.tsx` for data source and types context.
UI-only enhancements below: optional page chips, glossary tooltips, risk flags, subtle list polish, and a disabled Export button placeholder.
*/

import React from 'react';
import { PolicyAnalysisDisplayClient } from './PolicyAnalysisDisplayClient';
import type { PolicyAnalysis } from './PolicyAnalysisDisplayClient';

interface PolicyAnalysisDisplayProps {
  analysis: PolicyAnalysis;
  pdfUrl?: string;
  fileName?: string;
  rawAnalysisData?: any;
  hideSave?: boolean;
  hidePdfViewer?: boolean;
}

export function PolicyAnalysisDisplay(props: PolicyAnalysisDisplayProps) {
  // This is now a server component that just passes props to the client component
  return <PolicyAnalysisDisplayClient {...props} />;
} 