'use client';

import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { bulkImportRowSchema, type BulkImportRow } from '@/lib/validations/candidates';
import { bulkImportCandidates } from '@/actions/bulk-import';

interface RowResult {
  row: Record<string, string>;
  parsed: BulkImportRow | null;
  error: string | null;
}

interface BulkImportModalProps {
  jobId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'upload' | 'preview' | 'summary';

export function BulkImportModal({ jobId, onClose, onSuccess }: BulkImportModalProps) {
  const [step, setStep] = useState<Step>('upload');
  const [rows, setRows] = useState<RowResult[]>([]);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<{ imported: number; skipped: string[] } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParseError(null);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setParseError('Failed to parse CSV. Check the file format.');
          return;
        }

        const parsed: RowResult[] = results.data.map((row) => {
          const result = bulkImportRowSchema.safeParse({
            first_name: row.first_name,
            last_name: row.last_name,
            email: row.email,
            phone: row.phone || undefined,
            source: row.source || undefined,
            tags: row.tags || undefined,
            current_job_title: row.current_job_title || undefined,
          });

          return {
            row,
            parsed: result.success ? result.data : null,
            error: result.success ? null : result.error.issues[0].message,
          };
        });

        setRows(parsed);
        setStep('preview');
      },
    });
  };

  const validRows = rows.filter((r) => r.parsed !== null).map((r) => r.parsed as BulkImportRow);

  const handleImport = async () => {
    setImporting(true);
    const result = await bulkImportCandidates(jobId, validRows);
    setImporting(false);

    if (result.error) {
      setParseError(result.error);
      return;
    }

    setSummary({ imported: result.imported, skipped: result.skipped });
    setStep('summary');
  };

  const templateUrl =
    'data:text/csv;charset=utf-8,first_name,last_name,email,phone,source,tags,current_job_title\nJane,Doe,jane@example.com,+1234567890,linkedin,"design,ux",Product Designer';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#d4e0de]">
          <h2 className="text-base font-semibold text-[#141d1c]">Bulk import candidates</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8fa8a6] hover:text-[#141d1c] text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="px-6 py-4">
          {step === 'upload' && (
            <div className="space-y-4">
              <p className="text-sm text-[#8fa8a6]">
                Upload a CSV file with candidate data. Required columns:{' '}
                <span className="font-mono text-[#3e4947]">first_name, last_name, email</span>.
              </p>
              <a
                href={templateUrl}
                download="candidates-template.csv"
                className="inline-block text-xs text-[#3e6b66] underline"
              >
                Download CSV template
              </a>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border border-dashed border-[#d4e0de] rounded-lg px-3 py-6 text-sm text-[#8fa8a6] hover:bg-[#f4f9f8] transition-colors text-center"
              >
                Click to upload CSV file
              </button>
              {parseError && (
                <p className="text-sm text-red-600">{parseError}</p>
              )}
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <p className="text-sm text-[#8fa8a6]">
                {validRows.length} valid row(s) out of {rows.length} total.{' '}
                {rows.length - validRows.length > 0 && (
                  <span className="text-red-600">{rows.length - validRows.length} row(s) have errors and will be skipped.</span>
                )}
              </p>
              <div className="overflow-x-auto border border-[#d4e0de] rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-[#f4f9f8]">
                    <tr>
                      <th className="text-left px-3 py-2 text-[#8fa8a6] font-medium">Name</th>
                      <th className="text-left px-3 py-2 text-[#8fa8a6] font-medium">Email</th>
                      <th className="text-left px-3 py-2 text-[#8fa8a6] font-medium">Source</th>
                      <th className="text-left px-3 py-2 text-[#8fa8a6] font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-t border-[#d4e0de]">
                        <td className="px-3 py-2 text-[#141d1c]">
                          {r.row.first_name} {r.row.last_name}
                        </td>
                        <td className="px-3 py-2 text-[#141d1c]">{r.row.email}</td>
                        <td className="px-3 py-2 text-[#8fa8a6]">{r.row.source || '—'}</td>
                        <td className="px-3 py-2">
                          {r.error ? (
                            <span className="text-red-600">{r.error}</span>
                          ) : (
                            <span className="text-green-600">Valid</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parseError && (
                <p className="text-sm text-red-600">{parseError}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 text-sm border border-[#d4e0de] text-[#3e4947] rounded-lg hover:bg-[#f4f9f8] transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={validRows.length === 0 || importing}
                  onClick={handleImport}
                  className="px-4 py-2 text-sm bg-[#141d1c] text-white rounded-lg hover:bg-[#3e4947] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {importing ? 'Importing...' : `Import ${validRows.length} candidate(s)`}
                </button>
              </div>
            </div>
          )}

          {step === 'summary' && summary && (
            <div className="space-y-4 text-center py-4">
              <p className="text-2xl font-semibold text-[#141d1c]">{summary.imported} imported</p>
              {summary.skipped.length > 0 && (
                <div className="text-left">
                  <p className="text-sm text-[#8fa8a6] mb-2">{summary.skipped.length} skipped:</p>
                  <ul className="text-xs text-red-600 space-y-1">
                    {summary.skipped.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                type="button"
                onClick={onSuccess}
                className="px-4 py-2 text-sm bg-[#141d1c] text-white rounded-lg hover:bg-[#3e4947] transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
