export interface CaseFile {
  id: string; 
  userId: string; 
  caseId: string; 
  briefId: string;
  status: 'active'|'proposal_sent'|'waiting_client'|'won'|'lost';
  timeline: Array<{ at:string; event:string; meta?:Record<string,unknown> }>;
  reminders?: Array<{ at:string; kind:'followup'|'renewal'; note?:string }>;
  createdAt: string; 
  updatedAt: string;
}
