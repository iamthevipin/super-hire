import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();

// Build a chainable query builder that tracks calls
function makeQueryChain(result: unknown) {
  const chain: Record<string, unknown> = {};
  // Make the chain itself awaitable so delete().eq().eq() resolves correctly
  chain.then = (resolve: (value: unknown) => void, _reject: unknown) => resolve(result);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(result);
  chain.order = vi.fn().mockResolvedValue(result);
  chain.delete = vi.fn().mockReturnValue(chain);
  return chain;
}

// Queue of per-call results so each from() call can return different data
const queryQueue: Array<unknown> = [];

const mockFrom = vi.fn().mockImplementation(() => {
  const result = queryQueue.length > 0 ? queryQueue.shift() : { data: null, error: null };
  return makeQueryChain(result);
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    })
  ),
}));

import { getGmailIntegration, disconnectGmail, getSentEmailsForCandidate } from '@/actions/gmail';

const MOCK_USER = { id: 'user-1', email: 'user@example.com' };
const MOCK_MEMBERSHIP = { data: { enterprise_id: 'ent-1', role: 'admin' }, error: null };

describe('getGmailIntegration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryQueue.length = 0;
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER } });
  });

  it('returns Unauthorized when no user', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const result = await getGmailIntegration();
    expect(result.error).toBe('Unauthorized');
  });

  it('returns null data when integration does not exist (PGRST116)', async () => {
    queryQueue.push({ data: null, error: { code: 'PGRST116', message: 'no rows' } });
    const result = await getGmailIntegration();
    expect(result.error).toBeUndefined();
    expect(result.data).toBeNull();
  });

  it('returns error for non-PGRST116 errors', async () => {
    queryQueue.push({ data: null, error: { code: 'OTHER', message: 'db error' } });
    const result = await getGmailIntegration();
    expect(result.error).toBe('db error');
  });

  it('returns integration data on success', async () => {
    const integration = {
      id: 'int-1',
      user_id: 'user-1',
      enterprise_id: 'ent-1',
      provider: 'gmail',
      gmail_address: 'user@gmail.com',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    queryQueue.push({ data: integration, error: null });
    const result = await getGmailIntegration();
    expect(result.data).toEqual(integration);
  });
});

describe('disconnectGmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryQueue.length = 0;
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER } });
  });

  it('returns Unauthorized when no user', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const result = await disconnectGmail();
    expect(result.error).toBe('Unauthorized');
  });

  it('returns error when delete fails', async () => {
    queryQueue.push({ error: { message: 'delete failed' } });
    const result = await disconnectGmail();
    expect(result.error).toBe('delete failed');
  });

  it('returns empty object on success', async () => {
    queryQueue.push({ error: null });
    const result = await disconnectGmail();
    expect(result.error).toBeUndefined();
  });
});

describe('getSentEmailsForCandidate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryQueue.length = 0;
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER } });
  });

  it('returns Unauthorized when no user', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const result = await getSentEmailsForCandidate('cand-1');
    expect(result.error).toBe('Unauthorized');
  });

  it('returns No enterprise when membership is missing', async () => {
    queryQueue.push({ data: null, error: null }); // membership query
    const result = await getSentEmailsForCandidate('cand-1');
    expect(result.error).toBe('No enterprise');
  });

  it('returns Forbidden for non-admin members', async () => {
    queryQueue.push({ data: { enterprise_id: 'ent-1', role: 'member' }, error: null });
    const result = await getSentEmailsForCandidate('cand-1');
    expect(result.error).toBe('Forbidden');
  });

  it('returns emails for admin members', async () => {
    const emails = [
      {
        id: 'email-1',
        enterprise_id: 'ent-1',
        candidate_id: 'cand-1',
        sender_user_id: 'user-1',
        sender_name: 'Alice',
        sender_gmail_address: 'alice@gmail.com',
        subject: 'Hello',
        body_html: '<p>Hi</p>',
        body_text: 'Hi',
        sent_at: '2026-04-01T10:00:00Z',
        created_at: '2026-04-01T10:00:00Z',
      },
    ];
    queryQueue.push(MOCK_MEMBERSHIP);        // membership
    queryQueue.push({ data: emails, error: null }); // emails
    const result = await getSentEmailsForCandidate('cand-1');
    expect(result.data).toEqual(emails);
  });

  it('returns error when DB query fails', async () => {
    queryQueue.push(MOCK_MEMBERSHIP);
    queryQueue.push({ data: null, error: { message: 'query error' } });
    const result = await getSentEmailsForCandidate('cand-1');
    expect(result.error).toBe('query error');
  });

  it('returns empty array when no emails exist', async () => {
    queryQueue.push(MOCK_MEMBERSHIP);
    queryQueue.push({ data: null, error: null });
    const result = await getSentEmailsForCandidate('cand-1');
    expect(result.data).toEqual([]);
  });
});
