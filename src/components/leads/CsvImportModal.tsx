import React, { useState } from 'react';
import { X, Upload, Check, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { createLead, getSuppressionList } from '../../data/repo.ts';
import { checkIsSuppressed } from '../../lib/logic.ts';
import { ClinicSpecialty } from '../../types/index.ts';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'results'>('upload');
  const [rawText, setRawText] = useState(`BusinessName,Niche,Country,City,OwnerName,Email,Phone,industry
Bray Creative Studio,Design & Branding,Ireland,Bray,Kevin Barry,kevin@braycreative.ie,+353 1 286 1122,Agency
Valletta Legal Partners,Legal Services,Malta,Valletta,Paul Borg,admin@vallettalaw.com,+356 2122 3344,Legal
Grafton Digital Agency,Digital Marketing,Ireland,Dublin,Sarah O'Neill,sarah@graftondigital.ie,+353 1 677 8899,Marketing
Mdina Architectural Group,Architecture,Malta,Mdina,Katia Vella,katia@mdinaarch.com,+356 2145 9900,Architecture
Liffey Financial Advisory,Financial Consulting,Ireland,Dublin,Ciaran Walsh,info@liffeyfinancial.ie,+353 1 671 4400,Finance
Clifden Technology Solutions,IT & Cloud,Ireland,Galway,Brian Joyce,brian@clifdentech.ie,+353 95 21000,Technology`);

  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importReport, setImportReport] = useState<{
    imported: number;
    skippedSuppressed: string[];
    skippedDuplicates: string[];
    validationErrors: string[];
  }>({ imported: 0, skippedSuppressed: [], skippedDuplicates: [], validationErrors: [] });

  const [importing, setImporting] = useState(false);

  if (!isOpen) return null;

  const handleParse = () => {
    const lines = rawText.trim().split('\n');
    if (lines.length < 2) return;

    const headers = lines[0].split(',').map((h) => h.trim());
    const rows = lines.slice(1).map((line, idx) => {
      const values = line.split(',').map((v) => v.trim());
      const rowObj: any = { _rowNum: idx + 2 };
      headers.forEach((h, i) => {
        rowObj[h] = values[i] || '';
      });
      return rowObj;
    });

    setParsedRows(rows);
    setStep('mapping');
  };

  const handleRunImport = async () => {
    setImporting(true);
    const suppressionList = await getSuppressionList();

    let importedCount = 0;
    const skippedSup: string[] = [];
    const skippedDup: string[] = [];
    const valErrors: string[] = [];

    const standardKeys = new Set([
      'BusinessName', 'businessName',
      'Specialty', 'specialty',
      'Niche', 'niche',
      'Country', 'country',
      'City', 'city',
      'OwnerName', 'ownerName',
      'OwnerRole', 'ownerRole',
      'Email', 'email',
      'Phone', 'phone',
      'Website', 'website',
      '_rowNum',
    ]);

    for (const r of parsedRows) {
      const bName = r.BusinessName || r.businessName || '';
      const email = r.Email || r.email || '';
      const phone = r.Phone || r.phone || '';
      const country = r.Country || r.country || 'Ireland';
      const city = r.City || r.city || 'Dublin';
      const owner = r.OwnerName || r.ownerName || 'Business Owner';
      const nicheVal = r.Niche || r.niche || r.Specialty || r.specialty || 'Professional Services';

      if (!bName) {
        valErrors.push(`Row ${r._rowNum}: Missing business name.`);
        continue;
      }

      // Check suppression list
      const supEmail = checkIsSuppressed(email, suppressionList);
      const supPhone = checkIsSuppressed(phone, suppressionList);
      if (supEmail.suppressed || supPhone.suppressed) {
        skippedSup.push(`${bName} (${email || phone}) - Matched active suppression`);
        continue;
      }

      // Extract custom fields
      const customFields: Record<string, any> = {};
      Object.keys(r).forEach((k) => {
        if (!standardKeys.has(k) && r[k] !== undefined && r[k] !== '') {
          const cleanKey = k.replace(/^custom_/i, '').replace(/^CustomField_/i, '');
          customFields[cleanKey] = r[k];
        }
      });

      // Attempt create
      const res = await createLead({
        businessName: bName,
        specialty: nicheVal,
        niche: nicheVal,
        country,
        city,
        ownerName: owner,
        channels: [
          ...(email ? [{ id: `ch_${Date.now()}_e`, type: 'Email' as const, value: email, status: 'Not contacted' as const }] : []),
          ...(phone ? [{ id: `ch_${Date.now()}_p`, type: 'Phone' as const, value: phone, status: 'Not contacted' as const }] : []),
        ],
        stage: 'New Lead',
        source: 'Other',
        customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
      });

      if (res.success) {
        importedCount++;
      } else if (res.error?.includes('Duplicate')) {
        skippedDup.push(`${bName} - ${res.error}`);
      } else {
        valErrors.push(`Row ${r._rowNum} (${bName}): ${res.error}`);
      }
    }

    setImportReport({
      imported: importedCount,
      skippedSuppressed: skippedSup,
      skippedDuplicates: skippedDup,
      validationErrors: valErrors,
    });
    setImporting(false);
    setStep('results');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="csv-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl border border-black/10 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#F1EFEF] text-[#111111] flex items-center justify-center">
              <FileSpreadsheet size={16} />
            </div>
            <h3 id="csv-modal-title" className="text-lg font-bold text-[#111111]">
              Import Practice Leads via CSV
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#A8A5A5] hover:text-[#111111] p-1 rounded-full"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* STEP 1: Paste / Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            <p className="text-xs text-[#6B6B6B]">
              Paste CSV text or edit the sample below. Rows are automatically audited for duplicate practices and checked against the permanent Suppression List before insertion.
            </p>

            <textarea
              rows={8}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full text-xs font-mono p-3 rounded-xl border border-black/10 focus:border-[#D92D50] focus:outline-none bg-[#FBFBFB]"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-[#6B6B6B]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleParse}
                className="px-5 py-2 text-xs font-bold bg-[#111111] text-white rounded-full hover:bg-black"
              >
                Parse & Map Columns →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Mapping & Preview */}
        {(step === 'mapping' || step === 'preview') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#111111]">
                First {Math.min(parsedRows.length, 10)} Rows Preview ({parsedRows.length} total)
              </span>
              <span className="text-[11px] text-[#A8A5A5]">Ready for validation</span>
            </div>

            <div className="border border-black/10 rounded-2xl overflow-x-auto max-h-60 custom-scrollbar text-xs">
              <table className="w-full text-left">
                <thead className="bg-[#F1EFEF] text-[11px] font-bold text-[#6B6B6B] border-b border-black/5">
                  <tr>
                    <th className="p-2">#</th>
                    <th className="p-2">Business Name</th>
                    <th className="p-2">Specialty</th>
                    <th className="p-2">Country/City</th>
                    <th className="p-2">Owner</th>
                    <th className="p-2">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {parsedRows.slice(0, 10).map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="p-2 text-[#A8A5A5]">{r._rowNum}</td>
                      <td className="p-2 font-semibold text-[#111111]">{r.BusinessName}</td>
                      <td className="p-2">{r.Specialty}</td>
                      <td className="p-2">{r.City}, {r.Country}</td>
                      <td className="p-2">{r.OwnerName}</td>
                      <td className="p-2 font-mono text-[11px]">{r.Email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-[#F4F2F2] rounded-xl text-xs text-[#6B6B6B] flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-600 shrink-0" />
              <span>
                Rows with email addresses or phone numbers matching the Suppression List will be automatically skipped.
              </span>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="text-xs text-[#6B6B6B] hover:text-[#111111]"
              >
                ← Back to edit CSV
              </button>
              <button
                type="button"
                disabled={importing}
                onClick={handleRunImport}
                className="px-5 py-2 text-xs font-bold bg-[#D92D50] hover:bg-[#C42447] text-white rounded-full transition-colors disabled:opacity-50"
              >
                {importing ? 'Processing Audit...' : `Execute Import (${parsedRows.length} Leads)`}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Results Report */}
        {step === 'results' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <Check size={16} />
              <span>
                Successfully imported {importReport.imported} practice leads!
              </span>
            </div>

            {importReport.skippedSuppressed.length > 0 && (
              <div className="p-3 rounded-2xl bg-[#FCE9ED] border border-[#D92D50]/20 text-xs space-y-1">
                <div className="font-bold text-[#D92D50]">
                  Skipped (Suppressed Contacts): {importReport.skippedSuppressed.length}
                </div>
                {importReport.skippedSuppressed.map((s, idx) => (
                  <div key={idx} className="text-[#6B6B6B] text-[11px]">• {s}</div>
                ))}
              </div>
            )}

            {importReport.skippedDuplicates.length > 0 && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs space-y-1">
                <div className="font-bold text-amber-800">
                  Skipped (Duplicate Practice Matches): {importReport.skippedDuplicates.length}
                </div>
                {importReport.skippedDuplicates.map((s, idx) => (
                  <div key={idx} className="text-[#6B6B6B] text-[11px]">• {s}</div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  onImportComplete();
                  onClose();
                }}
                className="px-5 py-2 text-xs font-bold bg-[#111111] hover:bg-black text-white rounded-full"
              >
                Done & View Leads
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
