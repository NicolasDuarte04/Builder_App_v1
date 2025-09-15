import { NextRequest, NextResponse } from 'next/server';
import { generateProposal } from '@/lib/proposals/generator';
import { uploadProposal } from '@/lib/proposals/storage';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { ComparedPlan } from '@/types/compare';
import type { Brief } from '@/types/brief';
import { telemetry, getUserContext } from '@/lib/telemetry';

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
  

  try {
    // Parse request body
    const body: ProposalRequest = await request.json();
    const { brief, items, notes, sources, locale = 'es', branding, caseId } = body;

    // User context (do not throw if it fails)
    let sessionId: string | undefined;
    let userId: string | undefined;
    try {
      const ctx = await getUserContext();
      sessionId = ctx?.sessionId;
      userId = ctx?.userId;
    } catch {}

    // Compute sourceKinds if available
    const sourceKinds = Array.isArray(items)
      ? Array.from(new Set(items.map(i => i?.source?.kind).filter(Boolean)))
      : [];

    // Start event with enriched payload
    telemetry.track('PROPOSAL_GENERATION_STARTED', {
      timestamp: new Date().toISOString(),
      itemCount: Array.isArray(items) ? items.length : 0,
      locale,
      sourceKinds,
      hasBranding: !!branding,
      hasCaseId: !!caseId,
      sessionId,
      userId,
    });

    if (!brief || !items || items.length === 0) {
      return NextResponse.json(
        { stage: 'validation', message: 'Brief and items are required' },
        { status: 400 }
      );
    }

    // Generate PDF
    telemetry.track('PROPOSAL_GENERATION_PDF_START', {
      itemCount: items.length,
      locale,
      hasBranding: !!branding,
      hasCaseId: !!caseId,
      sessionId,
      userId,
    });

    let pdfResult;
    try {
      pdfResult = await generateProposal({
        brief,
        comparedItems: items,
        notes,
        sources,
        branding,
        locale,
      });
    } catch (error) {
      telemetry.track('PROPOSAL_GENERATION_FAILED', {
        stage: 'generation',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        durationMs: Math.max(0, Math.round(Date.now() - startTime)),
        sessionId,
        userId,
      });
      
      return NextResponse.json(
        { 
          stage: 'generation', 
          message: error instanceof Error ? error.message : 'PDF generation failed' 
        },
        { status: 500 }
      );
    }

    // Upload to storage
    telemetry.track('PROPOSAL_GENERATION_UPLOAD_START', {
      size: pdfResult.size,
      pages: pdfResult.pages,
      sessionId,
      userId,
    });

    let uploadResult;
    try {
      uploadResult = await uploadProposal(pdfResult.buffer);
    } catch (error) {
      telemetry.track('PROPOSAL_GENERATION_FAILED', {
        stage: 'upload',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        durationMs: Math.max(0, Math.round(Date.now() - startTime)),
        sessionId,
        userId,
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
      telemetry.track('PROPOSAL_GENERATION_DB_START', { caseId, sessionId, userId });
      
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
          telemetry.track('PROPOSAL_GENERATION_FAILED', {
            stage: 'db',
            message: error?.message || 'DB insert failed',
            caseId,
            timestamp: new Date().toISOString(),
            durationMs: Math.max(0, Math.round(Date.now() - startTime)),
            sessionId,
            userId,
          });
          // Continue anyway - the PDF is uploaded
        } else if (data) {
          proposalId = data.id;
        }
      } catch (error) {
        telemetry.track('PROPOSAL_GENERATION_FAILED', {
          stage: 'db',
          message: error instanceof Error ? error.message : 'Unknown error',
          caseId,
          timestamp: new Date().toISOString(),
          durationMs: Math.max(0, Math.round(Date.now() - startTime)),
          sessionId,
          userId,
        });
        // Continue anyway - the PDF is uploaded
      }
    }

    // Success
    const durationMs = Math.max(0, Math.round(Date.now() - startTime));
    
    telemetry.track('PROPOSAL_GENERATION_COMPLETED', {
      timestamp: new Date().toISOString(),
      durationMs,
      pages: pdfResult.pages,
      bytes: pdfResult.size,
      urlKind: uploadResult.urlKind,
      hasProposalId: !!proposalId,
      sessionId,
      userId,
    });

    return NextResponse.json({
      url: uploadResult.url,
      id: proposalId,
      pages: pdfResult.pages,
      bytes: pdfResult.size,
    });

  } catch (error) {
    const durationMs = Math.max(0, Math.round(Date.now() - startTime));
    
    telemetry.track('PROPOSAL_GENERATION_FAILED', {
      stage: 'unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      durationMs,
      sessionId: undefined,
      userId: undefined,
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
