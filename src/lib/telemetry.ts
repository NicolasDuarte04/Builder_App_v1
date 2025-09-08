// Telemetry helper for tracking user events
export const telemetry = {
  track: (event: string, properties?: Record<string, any>) => {
    // In production, this would send to your analytics service
    if (typeof window !== 'undefined') {
      console.log(`[Telemetry] ${event}`, properties || {});
      
      // Example integrations:
      // - Google Analytics: gtag('event', event, properties)
      // - PostHog: posthog.capture(event, properties)
      // - Mixpanel: mixpanel.track(event, properties)
      
      // For now, just log to console in development
      if (process.env.NODE_ENV === 'development') {
        const telemetryData = {
          event,
          properties,
          timestamp: new Date().toISOString(),
          userId: 'anonymous', // Would be actual user ID in production
        };
        console.table(telemetryData);
      }
    }
  },
  
  // Predefined event names for consistency
  events: {
    INTAKE_SUBMITTED: 'intake_submitted',
    SHORTLIST_LOADED: 'shortlist_loaded',
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
    ANALYZER_CANCELLED: 'analyzer_cancelled',
    PORTAL_OPENED: 'portal_opened',
    RUN_STARTED: 'run_started',
    RUN_COMPLETED: 'run_completed',
    RUN_PROGRESS: 'run_progress',
  }
};
