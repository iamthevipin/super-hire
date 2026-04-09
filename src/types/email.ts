export interface SentEmail {
  id: string;
  enterprise_id: string;
  candidate_id: string;
  sender_user_id: string | null;
  sender_name: string;
  sender_gmail_address: string;
  subject: string;
  body_html: string;
  body_text: string;
  sent_at: string;
  created_at: string;
}

// Client-safe shape — never includes OAuth tokens
export interface GmailIntegration {
  id: string;
  user_id: string;
  enterprise_id: string;
  provider: 'gmail';
  gmail_address: string;
  created_at: string;
  updated_at: string;
}

// Full DB row shape — server-side only; never send tokens to the client
export interface GmailIntegrationRow extends GmailIntegration {
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
}
