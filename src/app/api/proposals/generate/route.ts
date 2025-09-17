import { NextRequest, NextResponse } from 'next/server';
import { generateProposal } from '@/lib/proposals/generator';
import { uploadProposal } from '@/lib/proposals/storage';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { ComparedPlan } from '@/types/compare';
import type { Brief } from '@/types/brief';
import { telemetry, getUserContext, normalizeError } from '@/lib/telemetry';
import { withPerfTimer } from '@/lib/perf';

export const runtime = 'nodejs';

interface ProposalRequest {
  brief: Partial<Brief>;
  items: ComparedPlan[];
  notes?: string;
  sources?: { title: string; url?: string; date?: string }[];
  locale?: 'es' | 'en';
  branding?: {
    brokerName?: string;
    logoUrl?: string;
  };
  caseId?: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  // EVENT FLOW:
  // 1. Client emits PROPOSAL_GENERATION_STARTED before calling this API
  // 2. Server emits PROPOSAL_GENERATION_PDF_START when starting PDF generation
  // 3. Server emits PROPOSAL_GENERATION_UPLOAD_START when starting upload
  // 4. Client emits PROPOSAL_GENERATION_COMPLETED after receiving response
  // 
  // Server MUST NOT emit STARTED/COMPLETED events to prevent double-counting

  try {
    // Parse request body
    const body: ProposalRequest = await request.json();
    const { brief, items, notes, sources, locale = 'es', branding, caseId } = body;
    const requestId = (body as any)?.requestId as string | undefined;

    // User context (do not throw if it fails)
    let sessionId: string | undefined;
    let userId: string | undefined;
    try {
      const ctx = await getUserContext();
      sessionId = ctx?.sessionId;
      userId = ctx?.userId;
    } catch {}

    // Derived fields
    const itemCount = Array.isArray(items) ? items.length : 0;
    const hasBrief = !!brief;
    const sourceKinds = Array.isArray(items)
      ? Array.from(new Set(items.map(i => i?.source?.kind).filter(Boolean)))
      : [];

    // IMPORTANT: Client emits PROPOSAL_GENERATION_STARTED before calling this API
    // Server should NOT emit STARTED/COMPLETED to avoid double-counting
    // Server emits only PDF_START and UPLOAD_START for internal phase tracking

    if (!brief || !items || items.length === 0) {
      return NextResponse.json(
        { stage: 'validation', message: 'Brief and items are required' },
        { status: 400 }
      );
    }

    // Generate PDF
    telemetry.track('PROPOSAL_GENERATION_PDF_START', {
      itemCount,
      timestamp: new Date().toISOString(),
      locale,
      sourceKinds,
      hasBranding: !!branding,
      hasCaseId: !!caseId,
      sessionId,
      userId,
      requestId,
    });
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Timeline] T1 PROPOSAL_GENERATION_PDF_START', { requestId });
    }

    let pdfResult;
    try {
      pdfResult = await withPerfTimer('proposal.export', () => generateProposal({
        brief,
        comparedItems: items,
        notes,
        sources,
        branding,
        locale,
      }), { telemetryProps: { itemCount, locale } });
    } catch (error) {
      const err = normalizeError(error, 'generation');
      telemetry.track('PROPOSAL_GENERATION_FAILED', {
        itemCount,
        hasBrief,
        ...err,
        sessionId,
        userId,
        requestId,
      });
      
      return NextResponse.json(
        { 
          stage: 'generation', 
          message: error instanceof Error ? error.message : 'PDF generation failed' 
        },
        { status: 500 }
      );
    }

    // Emit normalized export event for analytics consumers
    try {
      const ms = Math.max(0, Date.now() - startTime);
      telemetry.track('proposal.export.pdf', { ms, size: pdfResult.size, pages: pdfResult.pages });
    } catch {}

    // Upload to storage
    telemetry.track('PROPOSAL_GENERATION_UPLOAD_START', {
      size: pdfResult.size,
      pages: pdfResult.pages,
      timestamp: new Date().toISOString(),
      locale,
      sourceKinds,
      hasBranding: !!branding,
      hasCaseId: !!caseId,
      sessionId,
      userId,
      requestId,
    });
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Timeline] T2 PROPOSAL_GENERATION_UPLOAD_START', { requestId });
    }

    let uploadResult;
    try {
      uploadResult = await uploadProposal(pdfResult.buffer);
    } catch (error) {
      const err = normalizeError(error, 'upload');
      telemetry.track('PROPOSAL_GENERATION_FAILED', {
        itemCount,
        hasBrief,
        ...err,
        sessionId,
        userId,
        requestId,
      });
      
      return NextResponse.json(
        { 
          stage: 'upload', 
          message: error instanceof Error ? error.message : 'Upload failed' 
        },
        { status: 500 }
      );
    }

    // Optionally save to database
    let proposalId: string | undefined;
    
    if (caseId) {
      telemetry.track('PROPOSAL_GENERATION_DB_START', { caseId, sessionId, userId, requestId, timestamp: new Date().toISOString() });
      
      try {
        const supabase = createServerSupabaseClient();
        
        const { data, error } = await supabase
          .from('proposals')
          .insert({
            case_id: caseId,
            brief,
            compared_items: items,
            notes,
            sources,
            branding,
            locale,
            pdf_path: uploadResult.path,
            pdf_url: uploadResult.url,
            pdf_size: pdfResult.size,
            pdf_pages: pdfResult.pages,
            created_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (error) {
          const err = normalizeError(error, 'db');
          telemetry.track('PROPOSAL_GENERATION_FAILED', {
            itemCount,
            hasBrief,
            ...err,
            sessionId,
            userId,
            requestId,
          });
          // Continue anyway - the PDF is uploaded
        } else if (data) {
          proposalId = data.id;
        }
      } catch (error) {
        const err = normalizeError(error, 'db');
        telemetry.track('PROPOSAL_GENERATION_FAILED', {
          itemCount,
          hasBrief,
          ...err,
          sessionId,
          userId,
          requestId,
        });
        // Continue anyway - the PDF is uploaded
      }
    }

    // Success: return payload to client
    // IMPORTANT: Client will emit PROPOSAL_GENERATION_COMPLETED after receiving this response
    // Server must NOT emit COMPLETED to avoid double-counting

    return NextResponse.json({
      url: uploadResult.url,
      urlKind: uploadResult.urlKind,
      id: proposalId,
      pages: pdfResult.pages,
      bytes: pdfResult.size,
      requestId,
    });

  } catch (error) {
    const err = normalizeError(error, 'unknown');
    telemetry.track('PROPOSAL_GENERATION_FAILED', {
      itemCount: 0,
      hasBrief: false,
      ...err,
      sessionId: undefined,
      userId: undefined,
      requestId: undefined,
    });

    return NextResponse.json(
      { 
        stage: 'unknown', 
        message: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
