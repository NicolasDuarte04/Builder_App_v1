/**
 * Telemetry Module - Event Tracking and Analytics
 * 
 * CANONICAL EVENT FLOW FOR PROPOSAL GENERATION:
 * =============================================
 * 
 * 1. CLIENT: User clicks "Create Proposal" button
 *    - Emits: PROPOSAL_GENERATION_STARTED (with itemCount, hasBrief, requestId)
 *    - Starts client-side timer for total duration tracking
 * 
 * 2. CLIENT: Makes API call to /api/proposals/generate
 * 
 * 3. SERVER: Receives request and begins PDF generation
 *    - Emits: PROPOSAL_GENERATION_PDF_START (phase tracking)
 *    - Does NOT emit STARTED (would cause double-counting)
 * 
 * 4. SERVER: Completes PDF, begins upload to storage
 *    - Emits: PROPOSAL_GENERATION_UPLOAD_START (phase tracking)
 * 
 * 5. SERVER: Returns response with URL, pages, bytes
 * 
 * 6. CLIENT: Receives successful response
 *    - Emits: PROPOSAL_GENERATION_COMPLETED (with durationMs from start)
 *    - Does NOT rely on server to emit COMPLETED
 * 
 * RATIONALE:
 * - Single source of truth: Client owns STARTED/COMPLETED lifecycle
 * - Accurate timing: Client can measure true end-to-end duration
 * - No race conditions: Sequential flow with clear ownership
 * - No double-counting: Each event emitted exactly once
 * - Server tracks internal phases with PDF_START/UPLOAD_START
 * 
 * MIGRATION NOTE:
 * If server code attempts to emit STARTED/COMPLETED, it will be:
 * - Logged as deprecation warning in development
 * - Silently dropped in production to prevent double-counting
 */

import { getOrCreateSessionId } from './chat/session-prefs-client';
import { now, since } from './time';
import { createHash } from 'crypto';

// Ensure integer milliseconds
const toIntMs = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
};

// Normalize legacy duration keys and coerce to integer ms; dev-only warnings
const normalizeDurationPayload = (event: string, props: Record<string, any>) => {
  const isDev = process.env.NODE_ENV !== 'production';
  try {
    const payload = { ...props };
    if (payload && typeof payload === 'object') {
      if (typeof payload.ms === 'number' && payload.durationMs == null) {
        if (isDev) console.warn(`[TelemetryGuard] '${event}': Found legacy key 'ms'. Converting to 'durationMs'.`);
        payload.durationMs = toIntMs(payload.ms);
        delete payload.ms;
      }
      if (typeof payload.duration === 'number' && payload.durationMs == null) {
        if (isDev) console.warn(`[TelemetryGuard] '${event}': Found legacy key 'duration'. Converting to 'durationMs'.`);
        payload.durationMs = toIntMs(payload.duration);
        delete payload.duration;
      }
      if (payload.durationMs != null) {
        payload.durationMs = toIntMs(payload.durationMs);
      }
      if (payload.latencyMs != null) {
        payload.latencyMs = toIntMs(payload.latencyMs);
      }
    }
    return payload;
  } catch {
    return props;
  }
};

// File metadata type for telemetry
export interface TelemetryFileMetadata {
  ext: string;
  sizeBytes: number;
  fileHashShort: string;
}

// Helper to generate safe file metadata for telemetry
export const getSafeFileMetadata = (file: File): TelemetryFileMetadata => {
  // Get extension
  const ext = file.name.split('.').pop()?.toLowerCase() || 'unknown';
  
  // Generate short hash of filename
  const hash = createHash('sha256')
    .update(file.name)
    .digest('hex')
    .slice(0, 8);

  return {
    ext,
    sizeBytes: file.size,
    fileHashShort: hash
  };
};

// Helper to get consistent user context for telemetry
export const getUserContext = async () => {
  try {
    // Guard for SSR - if not in browser, return SSR fallback
    if (typeof window === 'undefined') {
      return { sessionId: 'ssr-session', userId: 'anonymous' };
    }
    
    const sessionId = getOrCreateSessionId();
    // In browser, get userId from window.__USER_ID__ or localStorage
    let userId = 'anonymous';
    userId = (window as any).__USER_ID__ || localStorage.getItem('userId') || 'anonymous';
    return { sessionId, userId };
  } catch {
    return { sessionId: 'unknown', userId: 'anonymous' };
  }
};

// Error telemetry types
export enum ErrorCode {
  // Network errors
  NETWORK_ERROR = 'network_error',
  TIMEOUT = 'timeout',
  
  // Authentication/Authorization
  UNAUTHORIZED = 'unauthorized',
  FORBIDDEN = 'forbidden',
  SESSION_EXPIRED = 'session_expired',
  
  // Input validation
  INVALID_INPUT = 'invalid_input',
  FILE_TOO_LARGE = 'file_too_large',
  INVALID_FILE_TYPE = 'invalid_file_type',
  
  // Processing errors
  EXTRACTION_FAILED = 'extraction_failed',
  OCR_FAILED = 'ocr_failed',
  PARSING_FAILED = 'parsing_failed',
  GENERATION_FAILED = 'generation_failed',
  
  // External service errors
  AI_SERVICE_ERROR = 'ai_service_error',
  QUOTA_EXCEEDED = 'quota_exceeded',
  RATE_LIMITED = 'rate_limited',
  
  // Server errors
  INTERNAL_ERROR = 'internal_error',
  DATABASE_ERROR = 'database_error',
  STORAGE_ERROR = 'storage_error',
  
  // Client errors
  BROWSER_NOT_SUPPORTED = 'browser_not_supported',
  OFFLINE = 'offline',
  
  // Unknown
  UNKNOWN = 'unknown'
}

export interface TelemetryError {
  error_code: ErrorCode;
  stage: string;
  retryable: boolean;
  http_status?: number;
}

// Map common error patterns to normalized codes
export const normalizeError = (error: any, stage: string): TelemetryError => {
  // HTTP status based mapping
  const status = error?.status || error?.response?.status;
  if (status) {
    if (status === 401) return { error_code: ErrorCode.UNAUTHORIZED, stage, retryable: false, http_status: status };
    if (status === 403) return { error_code: ErrorCode.FORBIDDEN, stage, retryable: false, http_status: status };
    if (status === 413) return { error_code: ErrorCode.FILE_TOO_LARGE, stage, retryable: false, http_status: status };
    if (status === 429) return { error_code: ErrorCode.RATE_LIMITED, stage, retryable: true, http_status: status };
    if (status >= 500) return { error_code: ErrorCode.INTERNAL_ERROR, stage, retryable: true, http_status: status };
  }
  
  // Error message pattern matching
  const message = error?.message || error?.error || '';
  const messageLower = message.toLowerCase();
  
  if (messageLower.includes('quota') || messageLower.includes('insufficient_quota')) {
    return { error_code: ErrorCode.QUOTA_EXCEEDED, stage, retryable: false };
  }
  
  if (messageLower.includes('ocr') || error?.error_code === 'OCR_FAILED') {
    return { error_code: ErrorCode.OCR_FAILED, stage, retryable: false };
  }
  
  if (messageLower.includes('extract') || error?.error_code === 'EXTRACTION_FAILED') {
    return { error_code: ErrorCode.EXTRACTION_FAILED, stage, retryable: false };
  }
  
  if (messageLower.includes('network') || messageLower.includes('fetch')) {
    return { error_code: ErrorCode.NETWORK_ERROR, stage, retryable: true };
  }
  
  if (messageLower.includes('timeout')) {
    return { error_code: ErrorCode.TIMEOUT, stage, retryable: true };
  }
  
  if (messageLower.includes('database') || messageLower.includes('supabase')) {
    return { error_code: ErrorCode.DATABASE_ERROR, stage, retryable: true };
  }
  
  if (messageLower.includes('storage')) {
    return { error_code: ErrorCode.STORAGE_ERROR, stage, retryable: true };
  }
  
  if (messageLower.includes('parse') || messageLower.includes('parsing')) {
    return { error_code: ErrorCode.PARSING_FAILED, stage, retryable: false };
  }
  
  if (messageLower.includes('offline') || (typeof navigator !== 'undefined' && !navigator?.onLine)) {
    return { error_code: ErrorCode.OFFLINE, stage, retryable: true };
  }
  
  // Default
  return { error_code: ErrorCode.UNKNOWN, stage, retryable: false };
};

// Simple async timer utility
export async function withTimer<T>(fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const t0 = now();
  const result = await fn();
  const ms = since(t0);
  return { result, ms };
}

// Typed events and dev-only guard to enforce ms fields and schema consistency
export type SessionContext = { sessionId?: string; userId?: string };
export type DurationFields = { durationMs?: number; latencyMs?: number };

export interface TelemetryEventMap {
  // Home events
  HOME_OPENED: SessionContext;
  HOME_CTA_UPLOAD_CLICKED: SessionContext;
  HOME_CTA_BRIEF_CLICKED: SessionContext;
  HOME_CTA_DEMO_CLICKED: SessionContext;
  HOME_CTA_TUTORIAL_CLICKED: SessionContext;
  HOME_SEGMENT_CARD_VIEWED: SessionContext & { card: 'analyze' | 'brief' };

  // Trial gate events
  INVITE_CODE_VALIDATE_ATTEMPT: { ok: boolean; source: 'landing' | 'access_page'; reason?: 'invalid' | 'expired' | 'over_quota' | 'rate_limited' } & SessionContext;
  TRIAL_ACCESS_GRANTED: { kind: 'broker_trial'; ttlDays: number } & SessionContext;
  TRIAL_ACCESS_BLOCKED: { reason: 'invalid' | 'expired' | 'over_quota' | 'rate_limited' | 'missing' | 'invalid_token'; ipHash: string } & SessionContext;

  // Proposal events
  // CLIENT-ONLY: Emitted by CreateProposalButton when user initiates generation
  PROPOSAL_GENERATION_STARTED: { itemCount: number; hasBrief: boolean } & SessionContext & { requestId?: string };
  // SERVER-ONLY: Emitted by API route during PDF generation phase
  PROPOSAL_GENERATION_PDF_START: { itemCount: number } & SessionContext & { requestId?: string };
  // SERVER-ONLY: Emitted by API route during upload phase
  PROPOSAL_GENERATION_UPLOAD_START: { size: number; pages: number } & SessionContext & { requestId?: string };
  // SERVER-ONLY: Emitted by API route when starting DB persistence for case-linked proposals
  PROPOSAL_GENERATION_DB_START: { caseId: string } & SessionContext & { requestId?: string };
  // CLIENT-ONLY: Emitted by CreateProposalButton after successful API response
  PROPOSAL_GENERATION_COMPLETED: { itemCount: number; hasBrief: boolean; pages?: number; bytes?: number; urlKind: 'http' | 'https' | 'blob' | 'data' | 'unknown' | 'signed' | 'public' | 'none' } & DurationFields & SessionContext & { requestId?: string };
  PROPOSAL_GENERATION_FAILED: { itemCount: number; hasBrief: boolean } & TelemetryError & SessionContext & { requestId?: string };
  PROPOSAL_OPENED: { url: string; id: string | null } & SessionContext & { requestId?: string };
  PROPOSAL_LINK_COPIED: { url: string; id: string | null } & SessionContext & { requestId?: string };
  TIME_TO_PROPOSAL_MS: { durationMs: number };

  ASSISTANT_CONTEXT_APPLIED: { fields: string[] } & SessionContext;
  BRIEF_INJECTED_INTO_TOOL: { tool: 'chat'; fieldCount: number } & SessionContext;
  BRIEF_CONTEXT_BANNER_SHOWN: SessionContext;
  BRIEF_CONTEXT_BANNER_EDIT_CLICKED: SessionContext;

  UI_LAYOUT_CHANGED:
    | ({ area: 'brief'; collapsed: boolean; reason: 'auto' | 'manual'; uiPhase: string; compareCount: number } & SessionContext)
    | ({ leftCollapsed: boolean; rightOpen: boolean; dualMode: boolean; reason: 'results_closed' } & SessionContext);

  PLANS_SEARCHED: { category: string | null; hasBudget: boolean; mustHaveCount: number; source: 'cta' | 'chat' } & SessionContext;
  TEMPLATES_GENERATED: { reason: 'no_catalog_results' | 'other'; templateCount: number; category?: string } & SessionContext;
  
  // Result set telemetry (consolidated)
  RESULTS_INJECTED: { requestId: string; category?: string; dataSource: 'plans_v2' | 'templates' | 'mixed'; planCount: number; templateCount: number; hasRealPlans: boolean } & SessionContext;
  RESULTS_DRAWN: { requestId: string; category?: string; dataSource: 'plans_v2' | 'templates' | 'mixed'; displayedCount: number; viewMode: 'dual' | 'single' } & SessionContext;
  NO_RESULTS_SHOWN: { requestId: string; fallbackDisabled: boolean } & SessionContext;

  FEATURE_FLAG_EXPOSURE: { flag: string; value: boolean } & SessionContext;
  BRIEF_PARSE_REQUESTED: { source: 'paste' | 'upload'; chars?: number; v2?: boolean; userAction?: 'merge' | 'replace'; uploadId?: string } & SessionContext;
  BRIEF_PARSE_STARTED: { source: 'paste' | 'upload'; chars?: number; v2?: boolean; userAction?: 'merge' | 'replace' } & SessionContext;
  BRIEF_PARSE_COMPLETED: { source: 'paste' | 'upload'; via_summary?: boolean; v2?: boolean; latencyMs: number; fieldsFilledCount: number; fieldsFilled: string[]; hasCategory: boolean; hasBudget: boolean; mustHavesCount: number; userAction?: 'merge' | 'replace' } & SessionContext;
  BRIEF_PARSE_FAILED: { source: 'paste' | 'upload'; via_summary?: boolean; v2?: boolean; status?: number; userAction?: 'merge' | 'replace' } & SessionContext;
  BRIEF_PARSED_SUCCESS: { source: 'text' | 'pdf'; fieldsFilled: string[]; uploadId?: string; userAction?: 'merge' | 'replace' } & SessionContext;
  PARSER_OUTPUT_SCHEMA_MISMATCH: ({ source: 'text' | 'pdf'; uploadId?: string } & Partial<TelemetryError> & SessionContext);
  PASTE_LONG_GUARDED: { chars: number; approxTokens: number; limitChars: number; limitTokens: number } & SessionContext;
  ANALYZER_NOTE_ADDED: { length: number; wordCount: number } & Partial<SessionContext>;

  PDFS_ATTACHED: { fileCount: number; totalBytes: number; files: TelemetryFileMetadata[] } & SessionContext;
  ANALYZER_FILE_SELECTED: { file: TelemetryFileMetadata; sizeBucket: 'small' | 'medium' | 'large'; hasPlan: boolean; isMultiPdf: boolean } & SessionContext;
  PDF_ANALYSIS_STARTED: { bytes?: number } & SessionContext;
  ANALYZER_RUN_STARTED: { hasPlan: boolean; planId?: string; hasFile: boolean; fileSize?: number } & SessionContext;
  ANALYZER_RUN_SUCCEEDED: { hasPlan: boolean; planId?: string; durationMs: number; success: boolean; hasSummary: boolean; isMultiPdf?: boolean; totalFiles?: number } & SessionContext;
  ANALYZER_RUN_FAILED: { hasPlan: boolean; planId?: string; durationMs: number; hasFile: boolean } & TelemetryError & SessionContext;
  PDF_ANALYSIS_COMPLETED: { bytes?: number; pages?: number } & DurationFields & SessionContext & { isMultiPdf?: boolean; totalFiles?: number };
  PDF_ANALYSIS_FAILED: ({ durationMs?: number } & SessionContext & Partial<TelemetryError>);
  PDF_PRIMARY_SET: { fileCount: number; file: TelemetryFileMetadata } & SessionContext;
  FILE_SIZE_REJECTED: { sizeMB: number; limitMB: number } & TelemetryError & SessionContext;

  COMPARATOR_OPENED: { itemCount: number } & SessionContext;
  COMPARATOR_ITEM_ADDED: { id: string; sourceKind: 'template' | 'catalog' | 'normalized'; price: number | null; coverageCount: number; itemCount: number } & SessionContext;
  COMPARATOR_ITEM_REMOVED: { id: string; sourceKind: 'template' | 'catalog' | 'normalized'; price: number | null; coverageCount: number; itemCount: number } & SessionContext;
  COMPARATOR_CLEARED: SessionContext;
}

const EVENT_ALLOWED_KEYS: Partial<Record<keyof TelemetryEventMap, readonly string[]>> = {
  // Home events
  HOME_OPENED: ['sessionId', 'userId'],
  HOME_CTA_UPLOAD_CLICKED: ['sessionId', 'userId'],
  HOME_CTA_BRIEF_CLICKED: ['sessionId', 'userId'],
  HOME_CTA_DEMO_CLICKED: ['sessionId', 'userId'],
  HOME_CTA_TUTORIAL_CLICKED: ['sessionId', 'userId'],
  HOME_SEGMENT_CARD_VIEWED: ['sessionId', 'userId', 'card'],

  // Trial gate events
  INVITE_CODE_VALIDATE_ATTEMPT: ['ok', 'source', 'reason', 'sessionId', 'userId'],
  TRIAL_ACCESS_GRANTED: ['kind', 'ttlDays', 'sessionId', 'userId'],
  TRIAL_ACCESS_BLOCKED: ['reason', 'ipHash', 'sessionId', 'userId'],

  // Proposal events (CLIENT-ONLY: STARTED/COMPLETED, SERVER-ONLY: PDF_START/UPLOAD_START)
  PROPOSAL_GENERATION_STARTED: ['itemCount', 'hasBrief', 'sessionId', 'userId', 'requestId'],
  PROPOSAL_GENERATION_PDF_START: ['itemCount', 'timestamp', 'locale', 'sourceKinds', 'hasBranding', 'hasCaseId', 'hasProposalId', 'sessionId', 'userId', 'requestId'],
  PROPOSAL_GENERATION_UPLOAD_START: ['size', 'pages', 'timestamp', 'locale', 'sourceKinds', 'hasBranding', 'hasCaseId', 'hasProposalId', 'sessionId', 'userId', 'requestId'],
  PROPOSAL_GENERATION_DB_START: ['caseId', 'timestamp', 'sessionId', 'userId', 'requestId'],
  PROPOSAL_GENERATION_COMPLETED: ['itemCount', 'hasBrief', 'pages', 'bytes', 'urlKind', 'durationMs', 'sessionId', 'userId', 'requestId'],
  PROPOSAL_GENERATION_FAILED: ['itemCount', 'hasBrief', 'error_code', 'stage', 'retryable', 'http_status', 'sessionId', 'userId', 'requestId'],
  PROPOSAL_OPENED: ['url', 'id', 'sessionId', 'userId', 'requestId'],
  PROPOSAL_LINK_COPIED: ['url', 'id', 'sessionId', 'userId', 'requestId'],
  TIME_TO_PROPOSAL_MS: ['durationMs'],
  ASSISTANT_CONTEXT_APPLIED: ['fields', 'sessionId', 'userId'],
  BRIEF_INJECTED_INTO_TOOL: ['tool', 'fieldCount', 'sessionId', 'userId'],
  BRIEF_CONTEXT_BANNER_SHOWN: ['sessionId', 'userId'],
  BRIEF_CONTEXT_BANNER_EDIT_CLICKED: ['sessionId', 'userId'],
  UI_LAYOUT_CHANGED: ['area', 'collapsed', 'reason', 'uiPhase', 'compareCount', 'leftCollapsed', 'rightOpen', 'dualMode', 'sessionId', 'userId'],
  PLANS_SEARCHED: ['category', 'hasBudget', 'mustHaveCount', 'source', 'sessionId', 'userId'],
  TEMPLATES_GENERATED: ['reason', 'templateCount', 'category', 'sessionId', 'userId'],
  RESULTS_INJECTED: ['requestId', 'category', 'dataSource', 'planCount', 'templateCount', 'hasRealPlans', 'sessionId', 'userId'],
  RESULTS_DRAWN: ['requestId', 'category', 'dataSource', 'displayedCount', 'viewMode', 'sessionId', 'userId'],
  NO_RESULTS_SHOWN: ['requestId', 'fallbackDisabled', 'sessionId', 'userId'],
  FEATURE_FLAG_EXPOSURE: ['flag', 'value', 'sessionId', 'userId'],
  BRIEF_PARSE_REQUESTED: ['source', 'chars', 'v2', 'userAction', 'uploadId', 'sessionId', 'userId'],
  BRIEF_PARSE_STARTED: ['source', 'chars', 'v2', 'userAction', 'sessionId', 'userId'],
  BRIEF_PARSE_COMPLETED: ['source', 'via_summary', 'v2', 'latencyMs', 'fieldsFilledCount', 'fieldsFilled', 'hasCategory', 'hasBudget', 'mustHavesCount', 'userAction', 'sessionId', 'userId'],
  BRIEF_PARSE_FAILED: ['source', 'via_summary', 'v2', 'status', 'userAction', 'sessionId', 'userId'],
  BRIEF_PARSED_SUCCESS: ['source', 'fieldsFilled', 'uploadId', 'userAction', 'sessionId', 'userId'],
  PARSER_OUTPUT_SCHEMA_MISMATCH: ['source', 'uploadId', 'error_code', 'stage', 'retryable', 'http_status', 'sessionId', 'userId'],
  PASTE_LONG_GUARDED: ['chars', 'approxTokens', 'limitChars', 'limitTokens', 'sessionId', 'userId'],
  ANALYZER_NOTE_ADDED: ['length', 'wordCount', 'sessionId', 'userId'],
  PDFS_ATTACHED: ['fileCount', 'totalBytes', 'files', 'sessionId', 'userId'],
  ANALYZER_FILE_SELECTED: ['file', 'sizeBucket', 'hasPlan', 'isMultiPdf', 'sessionId', 'userId'],
  PDF_ANALYSIS_STARTED: ['bytes', 'sessionId', 'userId'],
  ANALYZER_RUN_STARTED: ['hasPlan', 'planId', 'hasFile', 'fileSize', 'sessionId', 'userId'],
  ANALYZER_RUN_SUCCEEDED: ['hasPlan', 'planId', 'durationMs', 'success', 'hasSummary', 'isMultiPdf', 'totalFiles', 'sessionId', 'userId'],
  ANALYZER_RUN_FAILED: ['hasPlan', 'planId', 'durationMs', 'hasFile', 'error_code', 'stage', 'retryable', 'http_status', 'sessionId', 'userId'],
  PDF_ANALYSIS_COMPLETED: ['bytes', 'pages', 'durationMs', 'latencyMs', 'isMultiPdf', 'totalFiles', 'sessionId', 'userId'],
  PDF_ANALYSIS_FAILED: ['durationMs', 'error_code', 'stage', 'retryable', 'http_status', 'sessionId', 'userId'],
  PDF_PRIMARY_SET: ['fileCount', 'file', 'sessionId', 'userId'],
  FILE_SIZE_REJECTED: ['sizeMB', 'limitMB', 'error_code', 'stage', 'retryable', 'http_status', 'sessionId', 'userId'],
  COMPARATOR_OPENED: ['itemCount', 'sessionId', 'userId'],
  COMPARATOR_ITEM_ADDED: ['id', 'sourceKind', 'price', 'coverageCount', 'itemCount', 'sessionId', 'userId'],
  COMPARATOR_ITEM_REMOVED: ['id', 'sourceKind', 'price', 'coverageCount', 'itemCount', 'sessionId', 'userId'],
  COMPARATOR_CLEARED: ['sessionId', 'userId'],
};

const EVENT_REQUIRED_KEYS: Partial<Record<keyof TelemetryEventMap, readonly string[]>> = {
  PROPOSAL_GENERATION_STARTED: ['itemCount', 'hasBrief'],
  PROPOSAL_GENERATION_PDF_START: ['itemCount'],
  PROPOSAL_GENERATION_UPLOAD_START: ['size', 'pages'],
  PROPOSAL_GENERATION_DB_START: ['caseId'],
  PROPOSAL_GENERATION_COMPLETED: ['itemCount', 'hasBrief', 'urlKind', 'durationMs'],
  TIME_TO_PROPOSAL_MS: ['durationMs'],
  ANALYZER_RUN_SUCCEEDED: ['hasPlan', 'success', 'hasSummary', 'durationMs'],
  COMPARATOR_OPENED: ['itemCount', 'sessionId', 'userId'],
};

// Map legacy/lowercase event names to canonical keys in TelemetryEventMap
const EVENT_ALIASES: Record<string, keyof TelemetryEventMap> = {
  // Home events
  HOME_OPENED: 'HOME_OPENED',
  home_opened: 'HOME_OPENED',
  HOME_CTA_UPLOAD_CLICKED: 'HOME_CTA_UPLOAD_CLICKED',
  home_cta_upload_clicked: 'HOME_CTA_UPLOAD_CLICKED',
  HOME_CTA_BRIEF_CLICKED: 'HOME_CTA_BRIEF_CLICKED',
  home_cta_brief_clicked: 'HOME_CTA_BRIEF_CLICKED',
  HOME_CTA_DEMO_CLICKED: 'HOME_CTA_DEMO_CLICKED',
  home_cta_demo_clicked: 'HOME_CTA_DEMO_CLICKED',
  HOME_CTA_TUTORIAL_CLICKED: 'HOME_CTA_TUTORIAL_CLICKED',
  home_cta_tutorial_clicked: 'HOME_CTA_TUTORIAL_CLICKED',
  HOME_SEGMENT_CARD_VIEWED: 'HOME_SEGMENT_CARD_VIEWED',
  home_segment_card_viewed: 'HOME_SEGMENT_CARD_VIEWED',

  // Trial gate events
  INVITE_CODE_VALIDATE_ATTEMPT: 'INVITE_CODE_VALIDATE_ATTEMPT',
  invite_code_validate_attempt: 'INVITE_CODE_VALIDATE_ATTEMPT',
  TRIAL_ACCESS_GRANTED: 'TRIAL_ACCESS_GRANTED',
  trial_access_granted: 'TRIAL_ACCESS_GRANTED',
  TRIAL_ACCESS_BLOCKED: 'TRIAL_ACCESS_BLOCKED',
  trial_access_blocked: 'TRIAL_ACCESS_BLOCKED',

  // Proposals
  PROPOSAL_GENERATION_STARTED: 'PROPOSAL_GENERATION_STARTED',
  PROPOSAL_GENERATION_PDF_START: 'PROPOSAL_GENERATION_PDF_START',
  PROPOSAL_GENERATION_UPLOAD_START: 'PROPOSAL_GENERATION_UPLOAD_START',
  PROPOSAL_GENERATION_DB_START: 'PROPOSAL_GENERATION_DB_START',
  PROPOSAL_GENERATION_COMPLETED: 'PROPOSAL_GENERATION_COMPLETED',
  PROPOSAL_GENERATION_FAILED: 'PROPOSAL_GENERATION_FAILED',
  PROPOSAL_OPENED: 'PROPOSAL_OPENED',
  PROPOSAL_LINK_COPIED: 'PROPOSAL_LINK_COPIED',
  // lowercase aliases
  proposal_generation_started: 'PROPOSAL_GENERATION_STARTED',
  proposal_generation_pdf_start: 'PROPOSAL_GENERATION_PDF_START',
  proposal_generation_upload_start: 'PROPOSAL_GENERATION_UPLOAD_START',
  proposal_generation_db_start: 'PROPOSAL_GENERATION_DB_START',
  proposal_generation_completed: 'PROPOSAL_GENERATION_COMPLETED',
  proposal_generation_failed: 'PROPOSAL_GENERATION_FAILED',
  proposal_opened: 'PROPOSAL_OPENED',
  proposal_link_copied: 'PROPOSAL_LINK_COPIED',

  // Assistant / brief
  ASSISTANT_CONTEXT_APPLIED: 'ASSISTANT_CONTEXT_APPLIED',
  assistant_context_applied: 'ASSISTANT_CONTEXT_APPLIED',
  BRIEF_INJECTED_INTO_TOOL: 'BRIEF_INJECTED_INTO_TOOL',
  brief_injected_into_tool: 'BRIEF_INJECTED_INTO_TOOL',
  BRIEF_CONTEXT_BANNER_SHOWN: 'BRIEF_CONTEXT_BANNER_SHOWN',
  brief_context_banner_shown: 'BRIEF_CONTEXT_BANNER_SHOWN',
  BRIEF_CONTEXT_BANNER_EDIT_CLICKED: 'BRIEF_CONTEXT_BANNER_EDIT_CLICKED',
  brief_context_banner_edit_clicked: 'BRIEF_CONTEXT_BANNER_EDIT_CLICKED',
  UI_LAYOUT_CHANGED: 'UI_LAYOUT_CHANGED',
  ui_layout_changed: 'UI_LAYOUT_CHANGED',
  PLANS_SEARCHED: 'PLANS_SEARCHED',
  plans_searched: 'PLANS_SEARCHED',
  TEMPLATES_GENERATED: 'TEMPLATES_GENERATED',
  templates_generated: 'TEMPLATES_GENERATED',
  
  // Result set telemetry
  RESULTS_INJECTED: 'RESULTS_INJECTED',
  results_injected: 'RESULTS_INJECTED',
  RESULTS_DRAWN: 'RESULTS_DRAWN',
  no_results_shown: 'NO_RESULTS_SHOWN',
  NO_RESULTS_SHOWN: 'NO_RESULTS_SHOWN',
  results_drawn: 'RESULTS_DRAWN',

  // FF exposure
  FEATURE_FLAG_EXPOSURE: 'FEATURE_FLAG_EXPOSURE',
  feature_flag_exposure: 'FEATURE_FLAG_EXPOSURE',

  // Brief parsing
  BRIEF_PARSE_REQUESTED: 'BRIEF_PARSE_REQUESTED',
  brief_parse_requested: 'BRIEF_PARSE_REQUESTED',
  BRIEF_PARSE_STARTED: 'BRIEF_PARSE_STARTED',
  brief_parse_started: 'BRIEF_PARSE_STARTED',
  BRIEF_PARSE_COMPLETED: 'BRIEF_PARSE_COMPLETED',
  brief_parse_completed: 'BRIEF_PARSE_COMPLETED',
  BRIEF_PARSE_FAILED: 'BRIEF_PARSE_FAILED',
  brief_parse_failed: 'BRIEF_PARSE_FAILED',
  BRIEF_PARSED_SUCCESS: 'BRIEF_PARSED_SUCCESS',
  brief_parsed_success: 'BRIEF_PARSED_SUCCESS',
  PARSER_OUTPUT_SCHEMA_MISMATCH: 'PARSER_OUTPUT_SCHEMA_MISMATCH',
  parser_output_schema_mismatch: 'PARSER_OUTPUT_SCHEMA_MISMATCH',
  PASTE_LONG_GUARDED: 'PASTE_LONG_GUARDED',
  paste_long_guarded: 'PASTE_LONG_GUARDED',

  // Analyzer/PDF
  PDFS_ATTACHED: 'PDFS_ATTACHED',
  pdfs_attached: 'PDFS_ATTACHED',
  ANALYZER_FILE_SELECTED: 'ANALYZER_FILE_SELECTED',
  analyzer_file_selected: 'ANALYZER_FILE_SELECTED',
  PDF_ANALYSIS_STARTED: 'PDF_ANALYSIS_STARTED',
  pdf_analysis_started: 'PDF_ANALYSIS_STARTED',
  ANALYZER_RUN_STARTED: 'ANALYZER_RUN_STARTED',
  analyzer_run_started: 'ANALYZER_RUN_STARTED',
  ANALYZER_RUN_SUCCEEDED: 'ANALYZER_RUN_SUCCEEDED',
  analyzer_run_succeeded: 'ANALYZER_RUN_SUCCEEDED',
  ANALYZER_RUN_FAILED: 'ANALYZER_RUN_FAILED',
  analyzer_run_failed: 'ANALYZER_RUN_FAILED',
  PDF_ANALYSIS_COMPLETED: 'PDF_ANALYSIS_COMPLETED',
  pdf_analysis_completed: 'PDF_ANALYSIS_COMPLETED',
  PDF_ANALYSIS_FAILED: 'PDF_ANALYSIS_FAILED',
  pdf_analysis_failed: 'PDF_ANALYSIS_FAILED',
  PDF_PRIMARY_SET: 'PDF_PRIMARY_SET',
  pdf_primary_set: 'PDF_PRIMARY_SET',
  FILE_SIZE_REJECTED: 'FILE_SIZE_REJECTED',
  file_size_rejected: 'FILE_SIZE_REJECTED',

  // Comparator
  COMPARATOR_OPENED: 'COMPARATOR_OPENED',
  comparator_opened: 'COMPARATOR_OPENED',
  COMPARATOR_ITEM_ADDED: 'COMPARATOR_ITEM_ADDED',
  comparator_item_added: 'COMPARATOR_ITEM_ADDED',
  COMPARATOR_ITEM_REMOVED: 'COMPARATOR_ITEM_REMOVED',
  comparator_item_removed: 'COMPARATOR_ITEM_REMOVED',
  COMPARATOR_CLEARED: 'COMPARATOR_CLEARED',
  comparator_cleared: 'COMPARATOR_CLEARED',

  // Timers
  TIME_TO_PROPOSAL_MS: 'TIME_TO_PROPOSAL_MS',
  time_to_proposal_ms: 'TIME_TO_PROPOSAL_MS',
};

const devValidatePayload = (event: string, payload: Record<string, any>) => {
  const isDev = process.env.NODE_ENV !== 'production';
  if (!isDev) return payload;
  try {
    if (typeof payload.durationMs === 'number') {
      const coerced = toIntMs(payload.durationMs);
      if (coerced !== payload.durationMs) {
        console.warn(`[TelemetryGuard] '${event}': durationMs coerced (${payload.durationMs} → ${coerced}).`);
        payload.durationMs = coerced;
      }
    }
    if (typeof payload.latencyMs === 'number') {
      const coerced = toIntMs(payload.latencyMs);
      if (coerced !== payload.latencyMs) {
        console.warn(`[TelemetryGuard] '${event}': latencyMs coerced (${payload.latencyMs} → ${coerced}).`);
        payload.latencyMs = coerced;
      }
    }
    const canonical = EVENT_ALIASES[event] || (event as keyof TelemetryEventMap as any);
    const allowed = (EVENT_ALLOWED_KEYS as Record<string, readonly string[] | undefined>)[canonical as any];
    if (allowed) {
      const allowedSet = new Set(allowed);
      const unknown = Object.keys(payload).filter((k) => !allowedSet.has(k));
      if (unknown.length > 0) {
        console.warn(`[TelemetryGuard] '${event}': Unknown keys: ${unknown.join(', ')}`);
      }
      const required = (EVENT_REQUIRED_KEYS as Record<string, readonly string[] | undefined>)[canonical as any] || [];
      const missing = required.filter((k) => !(k in payload));
      if (missing.length > 0) {
        console.warn(`[TelemetryGuard] '${event}': Missing keys: ${missing.join(', ')}`);
      }
    }
  } catch {}
  return payload;
};

// Telemetry helper for tracking user events
export const telemetry = {
  track(event: string, properties?: Record<string, any>) {
    const eventName = String(event);
    const payload = sanitizeTelemetryPayload(normalizeDurationPayload(eventName, (properties || {})));
    devValidatePayload(eventName, payload);
    const isDev = process.env.NODE_ENV !== 'production';
    
    // Guard against server-side emission of client-only events
    const isServer = typeof window === 'undefined';
    const clientOnlyEvents = ['PROPOSAL_GENERATION_STARTED', 'PROPOSAL_GENERATION_COMPLETED', 'proposal_generation_started', 'proposal_generation_completed'];
    if (isServer && clientOnlyEvents.includes(eventName)) {
      if (isDev) {
        console.warn(`[TelemetryGuard] DEPRECATED: Server attempted to emit client-only event '${eventName}'. This event should only be emitted from the client. Server should use PDF_START/UPLOAD_START instead.`);
      }
      // In production, silently drop the event to avoid double-counting
      return;
    }
    // E2E capture surface (always capture if flag is enabled) - client-side
    if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_E2E_CAPTURE === '1') {
      try {
        const w = window as any;
        if (!Array.isArray(w.__captureTelemetry)) w.__captureTelemetry = [];
        w.__captureTelemetry.push({ event: eventName, properties: payload, timestamp: new Date().toISOString() });
      } catch {}
    }
    // E2E capture surface - server-side (opt-in for tests)
    if (typeof window === 'undefined' && process.env.ENABLE_SERVER_E2E_CAPTURE === '1') {
      try {
        const g: any = globalThis as any;
        if (!Array.isArray(g.__serverTelemetry)) g.__serverTelemetry = [];
        g.__serverTelemetry.push({ event: eventName, properties: payload, timestamp: new Date().toISOString() });
      } catch {}
    }
    // Dev-only console
    if (isDev) {
      try {
        console.log(`[Telemetry] ${eventName}`, payload);
      } catch {}
    }
  },
  
  // Lightweight metrics helpers (Step-11)
  metrics: {
    // Internal stopwatch
    _proposalStartTs: null as number | null,
    // Generic field counter
    countBriefFields(obj?: Record<string, any> | null) {
      const source = obj || {};
      const fieldNames = Object.keys(source);
      const totalFields = fieldNames.length;
      let fieldsFilled = 0;
      for (const key of fieldNames) {
        const value = (source as any)[key];
        const isEmptyString = typeof value === 'string' && value.trim().length === 0;
        const isEmptyArray = Array.isArray(value) && value.length === 0;
        const isNullish = value === null || value === undefined;
        if (!(isNullish || isEmptyString || isEmptyArray)) fieldsFilled += 1;
      }
      return { fieldsFilled, totalFields, fieldNames };
    },
    // Start timer
    markTimeToProposalStart() {
      const t = now();
      this._proposalStartTs = t;
    },
    // End timer
    endTimeToProposalIfStarted() {
      if (this._proposalStartTs == null) return null;
      const durationMs = toIntMs(since(this._proposalStartTs));
      this._proposalStartTs = null;
      try { telemetry.track(telemetry.events.TIME_TO_PROPOSAL_MS, { durationMs }); } catch {}
      return durationMs;
    },
    // Testing helper
    resetTimeToProposalForTests() {
      this._proposalStartTs = null;
    },
    // Back-compat alias used by existing code
    startTimeToProposal() {
      this.markTimeToProposalStart();
    },
  },
  
  // Predefined event names for consistency
  events: {
    // Home events
    HOME_OPENED: 'home_opened',
    HOME_CTA_UPLOAD_CLICKED: 'home_cta_upload_clicked',
    HOME_CTA_BRIEF_CLICKED: 'home_cta_brief_clicked',
    HOME_CTA_DEMO_CLICKED: 'home_cta_demo_clicked',
    HOME_CTA_TUTORIAL_CLICKED: 'home_cta_tutorial_clicked',
    HOME_SEGMENT_CARD_VIEWED: 'home_segment_card_viewed',
    HOME_DEMO_PLAYED: 'home_demo_played',
    HOME_DEMO_PAUSED: 'home_demo_paused',
    HOME_CTA_GET_STARTED_CLICKED: 'home_cta_get_started_clicked',

    // Legacy events
    INTAKE_SUBMITTED: 'intake_submitted',
    SHORTLIST_LOADED: 'shortlist_loaded',
    SHORTLIST_FETCHED: 'shortlist_fetched',
    SHORTLIST_FAILED: 'shortlist_failed',
    PLAN_ANALYZED: 'plan_analyzed',
    PLAN_SELECTED: 'plan_selected',
    PLAN_DESELECTED: 'plan_deselected',
    PROPOSAL_CREATED: 'proposal_created',
    PROPOSAL_SHARED_WHATSAPP: 'proposal_shared_whatsapp',
    CHAT_MESSAGE_SENT: 'chat_message_sent',
    ANALYZER_OPENED: 'analyzer_opened',
    ANALYZER_COMPLETED: 'analyzer_completed',
    ANALYZER_PANEL_OPENED: 'analyzer_panel_opened',
    ANALYZER_PANEL_CLOSED: 'analyzer_panel_closed',
    ANALYZER_FILE_SELECTED: 'analyzer_file_selected',
    ANALYZER_RUN_STARTED: 'analyzer_run_started',
    ANALYZER_RUN_SUCCEEDED: 'analyzer_run_succeeded',
    ANALYZER_RUN_FAILED: 'analyzer_run_failed',
    BRIEF_EDITED: 'brief_edited',
    EMPTY_STATE_CLICKED: 'empty_state_clicked',
    ANALYZER_NOTE_ADDED: 'analyzer_note_added',
    ANALYZER_FOCUS_TOGGLED: 'analyzer_focus_toggled',
    ANALYZER_START: 'analyzer_start',
    LAYOUT_MODE_CHANGED: 'layout_mode_changed',
    UI_LAYOUT_CHANGED: 'ui_layout_changed',
    ANALYZER_CANCELLED: 'analyzer_cancelled',
    ANALYSIS_ABORTED: 'analysis_aborted',
    PORTAL_OPENED: 'portal_opened',
    PORTAL_STARTED: 'portal_started',
    PORTAL_PROGRESS: 'portal_progress',
    PORTAL_COMPLETED: 'portal_completed',
    RUN_STARTED: 'run_started',
    RUN_COMPLETED: 'run_completed',
    RUN_PROGRESS: 'run_progress',
    A11Y_FOCUS_MOVED: 'a11y_focus_moved',
    RESULTS_FOCUSED_SECTION: 'results_focused_section',
    MOBILE_VIEWER_COLLAPSED: 'mobile_viewer_collapsed',
    VIEW_ORIGINAL_PDF_CLICKED: 'view_original_pdf_clicked',
    FILE_SIZE_REJECTED: 'file_size_rejected',
    PREP_PILL_SELECTED: 'prep_pill_selected',
    PREP_PILL_DESELECTED: 'prep_pill_deselected',
    PREP_START_CLICKED: 'prep_start_clicked',
    PREP_CHANGE_PDF_CLICKED: 'prep_change_pdf_clicked',
    // Step-2 analytics events
    BRIEF_PARSE_REQUESTED: 'brief_parse_requested',
    BRIEF_PARSED_FAILED: 'brief_parsed_failed',
    BRIEF_PARSED_SUCCESS: 'brief_parsed_success',
    BRIEF_PARSE_STARTED: 'brief_parse_started',
    BRIEF_PARSE_COMPLETED: 'brief_parse_completed',
    BRIEF_PARSE_FAILED: 'brief_parse_failed',
    BRIEF_FIELDS_UPDATED: 'brief_fields_updated',
    BRIEF_UPDATED: 'brief_updated',
    BRIEF_APPLIED: 'brief_applied',
    BRIEF_SUBMITTED: 'brief_submitted',
    FEATURE_FLAG_EXPOSURE: 'feature_flag_exposure',
    TIME_TO_PROPOSAL_MS: 'time_to_proposal_ms',
    BRIEF_INJECTED_INTO_TOOL: 'brief_injected_into_tool',
    COMPARATOR_OPENED: 'comparator_opened',
    COMPARATOR_ITEM_ADDED: 'comparator_item_added',
    COMPARATOR_ITEM_REMOVED: 'comparator_item_removed',
    COMPARATOR_CLEARED: 'comparator_cleared',
    COMPARATOR_DIFFS_COMPUTED: 'comparator_diffs_computed',
    COMPARATOR_REASONING_RENDERED: 'comparator_reasoning_rendered',
    BRIEF_LOAD_GUEST: 'brief_load_guest',
    UPLOAD_ATTACHED_TO_BRIEF: 'upload_attached_to_brief',
    BRIEF_PANEL_OPENED: 'brief_panel_opened',
    BRIEF_PANEL_CLOSED: 'brief_panel_closed',
    COVERAGE_SUGGESTION_CLICKED: 'coverage_suggestion_clicked',
    ASSISTANT_CONTEXT_APPLIED: 'assistant_context_applied',
    BRIEF_CONTEXT_BANNER_SHOWN: 'brief_context_banner_shown',
    BRIEF_CONTEXT_BANNER_EDIT_CLICKED: 'brief_context_banner_edit_clicked',
    TEMPLATE_USED: 'template_used',
    // Brief parser events
    PARSER_HEURISTICS_HIT: 'parser_heuristics_hit',
    PARSER_LLM_CALLED: 'parser_llm_called',
    PARSER_OUTPUT_SCHEMA_MISMATCH: 'parser_output_schema_mismatch',
    // Brief save conflict events
    BRIEF_SAVE_CONFLICT: 'brief_save_conflict',
    BRIEF_SAVE_RETRY: 'brief_save_retry',
    BRIEF_SAVE_CONFLICT_RESOLVED: 'brief_save_conflict_resolved',
    // Step-8 analytics events
    TEMPLATES_GENERATED: 'templates_generated',
    RESULTS_INJECTED: 'results_injected',
    RESULTS_DRAWN: 'results_drawn',
    NO_RESULTS_SHOWN: 'no_results_shown',
    SOURCING_ACTION_CLICKED: 'sourcing_action_clicked',
    SOURCE_NORMALIZED_SUCCESS: 'source_normalized_success',
    SOURCE_NORMALIZED_FAIL: 'source_normalized_fail',
    FIT_SCORE_COMPUTED: 'fit_score_computed',
    RESULTS_STATUS_BANNER_SHOWN: 'results_status_banner_shown',
    RESULTS_STATUS_EDIT_CLICKED: 'results_status_edit_clicked',
    // Brief search events
    BRIEF_SEARCH_CLICKED: 'brief_search_clicked',
    PLANS_SEARCHED: 'plans_searched',
    // Step-10 analytics events
    PROPOSAL_GENERATION_STARTED: 'PROPOSAL_GENERATION_STARTED',
    PROPOSAL_GENERATION_PDF_START: 'PROPOSAL_GENERATION_PDF_START',
    PROPOSAL_GENERATION_UPLOAD_START: 'PROPOSAL_GENERATION_UPLOAD_START',
    PROPOSAL_GENERATION_DB_START: 'PROPOSAL_GENERATION_DB_START',
    PROPOSAL_GENERATION_COMPLETED: 'PROPOSAL_GENERATION_COMPLETED',
    PROPOSAL_GENERATION_FAILED: 'PROPOSAL_GENERATION_FAILED',
    PROPOSAL_OPENED: 'PROPOSAL_OPENED',
    PROPOSAL_LINK_COPIED: 'PROPOSAL_LINK_COPIED',
    // PDF analysis lifecycle
    PDF_ANALYSIS_STARTED: 'pdf_analysis_started',
    PDF_ANALYSIS_COMPLETED: 'pdf_analysis_completed',
    PDF_ANALYSIS_FAILED: 'pdf_analysis_failed',
    PDFS_ATTACHED: 'pdfs_attached',
    PDF_PRIMARY_SET: 'pdf_primary_set',
    // Paste-to-brief lifecycle
    PASTE_TO_BRIEF_STARTED: 'paste_to_brief_started',
    PASTE_TO_BRIEF_COMPLETED: 'paste_to_brief_completed',
    PASTE_TO_BRIEF_FAILED: 'paste_to_brief_failed',
    // Feature flag assignment
    FF_ASSIGNMENT: 'ff_assignment',
    // Price normalization
    PRICE_NORMALIZED: 'price_normalized',
    // OCR fallback events
    PDF_OCR_STARTED: 'pdf_ocr_started',
    PDF_OCR_COMPLETED: 'pdf_ocr_completed',
    PDF_OCR_FAILED: 'pdf_ocr_failed',
    // L13 events
    PASTE_LONG_GUARDED: 'paste_long_guarded',
    CATEGORY_DISAMBIGUATED: 'category_disambiguated',
  }
};

// Remove potentially sensitive fields like messages or stacks from telemetry payloads
function sanitizeTelemetryPayload(input: Record<string, any> | undefined | null): Record<string, any> {
  if (!input || typeof input !== 'object') return {};
  try {
    // Shallow clone first
    const clone: Record<string, any> = {};
    for (const [key, value] of Object.entries(input)) {
      const lower = key.toLowerCase();
      const isMessageKey = lower === 'message' || lower.endsWith('_message') || lower === 'errormessage';
      const isStackKey = lower === 'stack' || lower.includes('stacktrace') || lower === 'stack_trace';
      const isErrorLikeKey = lower === 'error' || lower === 'cause' || lower === 'exception';
      const isFileNameLike = lower === 'filename' || lower === 'file_name' || lower.endsWith('filename') || lower.endsWith('file_name');
      if (isMessageKey || isStackKey || isErrorLikeKey || isFileNameLike) continue;

      // Recursively sanitize nested objects/arrays to remove accidental message/stack fields
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          clone[key] = value.map((v) => (typeof v === 'object' && v != null ? sanitizeTelemetryPayload(v as any) : v));
        } else {
          clone[key] = sanitizeTelemetryPayload(value as Record<string, any>);
        }
      } else {
        clone[key] = value;
      }
    }
    return clone;
  } catch {
    // Best-effort: if sanitization fails, drop payload rather than risk leaking details
    return {};
  }
}