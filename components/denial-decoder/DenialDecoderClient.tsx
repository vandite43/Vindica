'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, BookOpen, AlertTriangle, Clock, Layers } from 'lucide-react';

interface DenialCode {
  code: string;
  description: string;
  type: string;
  action: string;
  actionDetail: string;
  appealable: 'yes' | 'sometimes' | 'no' | 'rarely';
  appealNote?: string;
}

const DENIAL_CODES: DenialCode[] = [
  {
    code: 'CO-4',
    description: 'Procedure code inconsistent with modifier or missing modifier',
    type: 'Admin',
    action: 'Correct & Resubmit',
    actionDetail: 'Verify place of service and procedure code combination. Correct and resubmit same day.',
    appealable: 'no',
  },
  {
    code: 'CO-11',
    description: 'Diagnosis inconsistent with procedure',
    type: 'Clinical',
    action: 'Correct & Resubmit',
    actionDetail: 'Add or correct ICD-10 diagnosis code to support the procedure billed.',
    appealable: 'no',
  },
  {
    code: 'CO-16',
    description: 'Claim missing information or has billing error',
    type: 'Admin',
    action: 'Correct & Resubmit',
    actionDetail: 'Most common front-end denial. Check patient name, DOB, subscriber ID, NPI, and authorization number. Fix and resubmit same day.',
    appealable: 'no',
    appealNote: '~78% resolution rate',
  },
  {
    code: 'CO-18',
    description: 'Duplicate claim',
    type: 'Admin',
    action: 'Check Status First',
    actionDetail: 'Verify original claim status in clearinghouse before resubmitting. If original was denied, resubmit with corrected claim notation.',
    appealable: 'sometimes',
  },
  {
    code: 'CO-22',
    description: 'Coordination of Benefits issue',
    type: 'COB',
    action: 'Fix COB then Resubmit',
    actionDetail: 'Verify COB determination. Apply birthday rule for dependents. Confirm primary payer adjudicated first. Attach primary EOB to secondary claim.',
    appealable: 'sometimes',
  },
  {
    code: 'CO-29',
    description: 'Timely filing expired',
    type: 'Fatal',
    action: 'Rarely Appealable',
    actionDetail: 'Permanent revenue loss. Only exceptions: documented system error, payer-caused delay, retroactive eligibility, natural disaster. Audit your timely filing tracking immediately.',
    appealable: 'rarely',
  },
  {
    code: 'CO-45',
    description: 'Charges exceed contracted fee',
    type: 'Contract',
    action: 'No Appeal',
    actionDetail: 'In-network: accept contracted rate and post write-off. Out-of-network: may bill patient the balance. Request fee schedule from payer to verify correct contracted amount.',
    appealable: 'no',
  },
  {
    code: 'CO-50',
    description: 'Not medically necessary',
    type: 'Clinical',
    action: 'Appeal',
    actionDetail: 'Gather comprehensive clinical documentation beyond original submission. Write detailed doctor narrative with specific measurements. Include labeled photos, ADA standard of care references, specialist reports.',
    appealable: 'yes',
    appealNote: '~70% Overturn',
  },
  {
    code: 'CO-96',
    description: 'Non-covered charge',
    type: 'Benefit',
    action: 'Verify then Decide',
    actionDetail: 'Verify this is a true plan exclusion vs a documentation issue. If excluded, bill patient. If you believe it IS covered, appeal with clinical justification.',
    appealable: 'sometimes',
    appealNote: '~35% Overturn',
  },
  {
    code: 'CO-97',
    description: 'Service included in payment for another procedure (bundling)',
    type: 'Bundling',
    action: 'Appeal',
    actionDetail: 'IMPORTANT: this often means insufficient documentation, not a true bundle. Gather documentation showing the procedures are distinct. Appeal with clinical narrative.',
    appealable: 'yes',
    appealNote: '~55% Overturn',
  },
  {
    code: 'CO-119',
    description: 'Benefit maximum reached',
    type: 'Benefit Max',
    action: 'Bill Patient',
    actionDetail: 'Annual maximum reached. Bill patient the balance. Inform patients of annual max limits during financial counseling before treatment.',
    appealable: 'no',
  },
  {
    code: 'CO-151',
    description: 'Frequency limitation exceeded',
    type: 'Frequency',
    action: 'Appeal if Error',
    actionDetail: 'Verify benefit year dates — calendar year vs rolling 12 months vs benefit year. Check if patient received this service at another office within the frequency window.',
    appealable: 'sometimes',
  },
  {
    code: 'CO-167',
    description: 'Diagnosis not covered',
    type: 'Clinical',
    action: 'Review & Recode',
    actionDetail: 'Verify diagnosis code accuracy. Recode if appropriate. If code is correct, appeal with clinical documentation.',
    appealable: 'sometimes',
  },
  {
    code: 'OA-23',
    description: 'Pre-authorization required',
    type: 'Auth',
    action: 'Retro-Auth or Appeal',
    actionDetail: 'Obtain retro-authorization if payer allows. Appeal on urgency basis with clinical documentation. Request specific plan language requiring auth for this procedure.',
    appealable: 'yes',
    appealNote: '~65% Overturn',
  },
];

const TYPE_COLORS: Record<string, string> = {
  Admin:         'bg-blue-100 text-blue-700',
  Clinical:      'bg-purple-100 text-purple-700',
  COB:           'bg-yellow-100 text-yellow-700',
  Fatal:         'bg-red-100 text-red-700',
  Contract:      'bg-gray-100 text-gray-600',
  Bundling:      'bg-orange-100 text-orange-700',
  Benefit:       'bg-gray-100 text-gray-600',
  'Benefit Max': 'bg-gray-100 text-gray-600',
  Frequency:     'bg-yellow-100 text-yellow-700',
  Auth:          'bg-purple-100 text-purple-700',
};

const APPEAL_COLORS: Record<string, string> = {
  yes:       'bg-green-100 text-green-700',
  sometimes: 'bg-yellow-100 text-yellow-700',
  no:        'bg-red-100 text-red-700',
  rarely:    'bg-red-100 text-red-700',
};

const APPEAL_LABELS: Record<string, string> = {
  yes:       'Appealable',
  sometimes: 'Sometimes Appealable',
  no:        'Not Appealable',
  rarely:    'Rarely Appealable',
};

const TIMELY_FILING = [
  { payer: 'Delta Dental',  deadline: '12–18 months' },
  { payer: 'Cigna',         deadline: '90 days (par) / 180 days (non-par)' },
  { payer: 'Aetna',         deadline: '90 days' },
  { payer: 'MetLife',       deadline: '12 months' },
  { payer: 'UHC',           deadline: '90–180 days' },
  { payer: 'Medicaid',      deadline: '90 days–12 months (by state)' },
  { payer: 'Medicare',      deadline: '12 months' },
];

export default function DenialDecoderClient() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('search') ?? '');

  const q = query.trim().toLowerCase();
  const results = q === ''
    ? DENIAL_CODES
    : DENIAL_CODES.filter(d =>
        d.code.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q) ||
        d.actionDetail.toLowerCase().includes(q) ||
        d.action.toLowerCase().includes(q)
      );

  return (
    <div className="p-6 space-y-4">

      {/* Search bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by code (CO-16) or keyword (frequency, duplicate, bundling…)"
            className="w-full pl-10 pr-10 py-2.5 rounded-lg text-sm text-gray-900 border border-gray-200 outline-none focus:border-[#5B3FD4] focus:ring-2 focus:ring-[#5B3FD4]/10 transition-colors placeholder-gray-400"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {q
            ? `${results.length} result${results.length !== 1 ? 's' : ''} for "${query}"`
            : `${DENIAL_CODES.length} CARC codes — type a code or keyword to filter`}
        </p>
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
          <BookOpen className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-500">No matching denial codes</p>
          <p className="text-sm mt-1 text-gray-400">
            Try a CARC code like "CO-50" or a keyword like "medical necessity"
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map(code => (
            <div key={code.code} className="bg-white rounded-xl border border-gray-200 p-5">
              {/* Code + badges */}
              <div className="flex flex-wrap items-start gap-2 mb-2">
                <span className="font-mono text-2xl font-bold text-gray-900 leading-none">
                  {code.code}
                </span>
                <div className="flex flex-wrap gap-2 mt-0.5">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${TYPE_COLORS[code.type] ?? 'bg-gray-100 text-gray-600'}`}>
                    {code.type}
                  </span>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${APPEAL_COLORS[code.appealable]}`}>
                    {APPEAL_LABELS[code.appealable]}
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-700 mb-3">{code.description}</p>

              {/* Action box */}
              <div className="rounded-lg p-4 bg-[#E8E4FF] border border-[#5B3FD4]/20">
                <p className="text-sm font-semibold text-[#5B3FD4] mb-1">
                  Recommended Action: {code.action}
                </p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {code.actionDetail}
                </p>
              </div>

              {/* Appeal note */}
              {code.appealNote && (
                <p className="text-sm font-medium mt-2 text-[#3BBFB0]">
                  ↑ {code.appealNote}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Critical Distinctions section */}
      <div className="pt-4 pb-1">
        <h2 className="text-base font-semibold text-gray-900 mb-0.5">
          Critical Distinctions Every Specialist Must Know
        </h2>
        <p className="text-sm text-gray-500">
          The most commonly misunderstood concepts in dental insurance billing.
        </p>
      </div>

      <div className="space-y-3">
        {/* Card 1 — Clearinghouse vs Payer */}
        <div className="bg-white rounded-xl border border-gray-200 p-5" style={{ borderLeft: '4px solid #3B82F6' }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 text-blue-500" />
            <h3 className="font-semibold text-gray-900 text-sm">Clearinghouse Rejection vs. Payer Denial</h3>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            <span className="font-medium text-blue-600">Clearinghouse rejections</span> happen <em>before</em> the claim reaches the payer — no ERA is generated, and the error is correctable within hours.{' '}
            <span className="font-medium text-gray-900">Payer denials</span> happen <em>after</em> adjudication and require a formal appeal process. Never treat them the same way — a rejection corrected and resubmitted is not an appeal.
          </p>
        </div>

        {/* Card 2 — Timely Filing */}
        <div className="bg-white rounded-xl border border-gray-200 p-5" style={{ borderLeft: '4px solid #EAB308' }}>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 flex-shrink-0 text-yellow-600" />
            <h3 className="font-semibold text-gray-900 text-sm">Timely Filing Deadlines by Payer</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left pb-2 font-medium text-gray-500">Payer</th>
                  <th className="text-left pb-2 font-medium text-gray-500">Deadline from Date of Service</th>
                </tr>
              </thead>
              <tbody>
                {TIMELY_FILING.map((row, i) => (
                  <tr key={row.payer} className={i < TIMELY_FILING.length - 1 ? 'border-b border-gray-50' : ''}>
                    <td className="py-2 font-medium text-gray-800">{row.payer}</td>
                    <td className="py-2 text-gray-600">{row.deadline}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Deadlines vary by contract and state. Always verify with the specific payer contract.
          </p>
        </div>

        {/* Card 3 — Procedure Inclusive Warning */}
        <div className="bg-white rounded-xl border border-gray-200 p-5" style={{ borderLeft: '4px solid #F97316' }}>
          <div className="flex items-center gap-2 mb-2">
            <Layers className="h-4 w-4 flex-shrink-0 text-orange-500" />
            <h3 className="font-semibold text-gray-900 text-sm">"Procedure Inclusive" Warning</h3>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            When an EOB says <span className="font-medium text-orange-600">"procedure is inclusive of another procedure,"</span> this typically means documentation was{' '}
            <span className="font-semibold text-gray-900">insufficient</span>, NOT that the procedure is genuinely bundled. This is one of the most misunderstood denials in dental billing.{' '}
            Always attempt an appeal with stronger, more specific clinical documentation before writing off the revenue. A CO-97 denial is often recoverable.
          </p>
        </div>
      </div>
    </div>
  );
}
