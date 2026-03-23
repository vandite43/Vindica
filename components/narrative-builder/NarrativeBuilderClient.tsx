'use client';

import { useState, useRef, useCallback } from 'react';
import { AlertTriangle, CheckCircle2, Check, Copy, CheckCheck } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Procedure =
  | 'crown'
  | 'srp'
  | 'surgical-extraction'
  | 'core-buildup'
  | 'perio-maintenance'
  | 'implant'
  | 'appeal';

type Payer =
  | 'delta'
  | 'cigna'
  | 'aetna'
  | 'metlife'
  | 'uhc'
  | 'guardian'
  | 'medicaid'
  | 'generic';

// ─── Templates ────────────────────────────────────────────────────────────────

const TEMPLATES: Record<Procedure, string> = {
  crown:
`Tooth #___ presents with fractured [mesio-lingual / distal] cusp extending subgingivally with radiographic evidence of decay undermining the remaining cusps. Less than 50% of supragingival tooth structure remains. The existing restoration is failing with recurrent decay at the margins. Direct restoration is contraindicated — full coverage crown is necessary to prevent fracture of the remaining tooth structure and restore the tooth to proper occlusal function.`,

  srp:
`Patient presents with generalized moderate chronic periodontitis. Periodontal examination reveals probing depths of ___-___mm in the [upper right / upper left / lower right / lower left] quadrant with bleeding on probing and [suppuration / furcation involvement]. Radiographic evaluation demonstrates [horizontal / vertical] bone loss. The patient has not responded adequately to conventional prophylaxis. Scaling and root planing is indicated to remove calculus deposits and bacterial biofilm from root surfaces to arrest disease progression and prevent tooth loss.`,

  'surgical-extraction':
`Surgical extraction of tooth #___ was performed due to [fractured root below crestal bone / significant bone loss requiring ostectomy / impacted position requiring sectioning]. Procedure required elevation of a full thickness mucoperiosteal flap, [bone removal to expose the root / tooth sectioning to facilitate removal], and wound closure with interrupted sutures. Clinical and radiographic examination confirmed that simple forceps extraction was not possible due to [root morphology / bone density / proximity to adjacent structures].`,

  'core-buildup':
`Tooth #___ required a foundation restoration prior to crown preparation. Following removal of the existing failing restoration and caries excavation, insufficient tooth structure remained to support a crown without a foundation buildup. The buildup was performed specifically for crown retention purposes, replacing missing coronal structure and establishing a stable preparation form. Without the core buildup, adequate crown retention and resistance form could not be achieved.`,

  'perio-maintenance':
`Patient has an established history of active periodontal therapy including scaling and root planing completed on [DATE]. Patient presents for periodontal maintenance to maintain the results of prior active therapy and prevent recurrence of periodontal disease. Periodontal maintenance (D4910) is distinct from a prophylaxis (D1110) and is the appropriate continuing care procedure for this patient's documented periodontal condition.`,

  implant:
`Tooth #___ is to receive an endosseous implant fixture to replace a missing tooth with radiographic evidence of adequate bone volume and density. The patient presents with [___mm] of available bone height and width at the implant site. The opposing dentition is natural/restored, and the implant is necessary to restore proper masticatory function and prevent continued bone resorption. Pre-surgical planning including [CBCT / periapical radiograph] confirms the proposed implant site is anatomically appropriate for implant placement.`,

  appeal:
`Re: Appeal of Claim Denial
Patient: ___ | Claim #: ___ | DOS: ___ | Procedure: ___

Pursuant to 29 CFR § 2560.503-1(h), we hereby request a full and fair review of the above-referenced claim denial. Under ERISA Section 503, we are entitled to receive, free of charge, all documents and records relevant to this claim determination.

CLINICAL JUSTIFICATION:
The treatment rendered was warranted and meets the standard of care necessary to restore the patient's bite to function with a long-term prognosis for success. [Insert specific clinical findings with measurements, tooth numbers, and radiographic findings.]

DOCUMENTATION ENCLOSED:
- Pre-operative radiograph dated ___
- Complete periodontal charting (if applicable)
- Intraoral photographs with annotations
- Clinical chart notes dated ___
- [Additional supporting documentation]

We respectfully request reconsideration of this denial based on the enclosed clinical documentation. If the plan fails to follow compliant claims procedures, the claimant is deemed to have exhausted administrative remedies per 29 CFR § 2560.503-1(l).`,
};

// ─── Banned Words ─────────────────────────────────────────────────────────────

const BANNED_WORDS: { word: string; replacement: string }[] = [
  { word: 'erosion',           replacement: 'loss of tooth structure' },
  { word: 'abrasion',          replacement: 'mechanical tooth structure loss' },
  { word: 'attrition',         replacement: 'fracture of tooth structure' },
  { word: 'wear',              replacement: 'structural compromise' },
  { word: 'bruxism',           replacement: 'parafunctional forces causing fracture' },
  { word: 'cosmetic',          replacement: 'functionally necessary' },
  { word: 'esthetic',          replacement: 'restoring proper occlusal function' },
  { word: 'aesthetics',        replacement: 'restoring proper occlusal function' },
  { word: 'patient desires',   replacement: 'clinically indicated' },
  { word: 'patient requested', replacement: 'clinically indicated' },
  { word: 'patient wants',     replacement: 'clinically indicated' },
  { word: 'poor prognosis',    replacement: 'guarded prognosis with treatment' },
  { word: 'prophylactic',      replacement: 'preventive to avoid extraction' },
  { word: 'elective',          replacement: 'clinically necessary' },
  { word: 'appearance',        replacement: 'oral health function' },
  { word: 'smile enhancement', replacement: 'restore proper oral function' },
  { word: 'normal wear',       replacement: 'structural compromise' },
  { word: 'generalized wear',  replacement: 'structural compromise' },
  { word: 'occlusal wear',     replacement: 'structural compromise' },
];

// ─── Strength Meter ───────────────────────────────────────────────────────────

const CLINICAL_FINDING_WORDS = [
  'fracture', 'decay', 'bone loss', 'periodontitis', 'caries', 'furcation',
  'calculus', 'suppuration', 'bleeding', 'probing', 'ostectomy', 'subgingivally',
  'undermining', 'recurrent',
];
const JUSTIFICATION_WORDS = ['indicated', 'necessary', 'required', 'contraindicated', 'warranted'];

const STRENGTH_SIGNALS: { label: string; check: (text: string, banned: string[]) => boolean }[] = [
  { label: 'Tooth number present (#__)',           check: t => /\#\d+/.test(t) },
  { label: 'Measurement in mm',                    check: t => /\d+\s*mm/i.test(t) },
  { label: 'Clinical finding documented',          check: t => CLINICAL_FINDING_WORDS.some(w => t.toLowerCase().includes(w)) },
  { label: 'Justification statement present',      check: t => JUSTIFICATION_WORDS.some(w => t.toLowerCase().includes(w)) },
  { label: 'No flagged language detected',         check: (t, banned) => banned.length === 0 },
  { label: 'Sufficient narrative length (>100 chars)', check: t => t.length > 100 },
];

// ─── Approved Phrases ─────────────────────────────────────────────────────────

const PHRASES: Record<Procedure, string[]> = {
  crown: [
    'fractured cusp extending subgingivally',
    'less than 50% of supragingival tooth structure remains',
    'radiographic evidence of recurrent decay undermining remaining cusps',
    'direct restoration is contraindicated due to insufficient remaining tooth structure',
    'full coverage restoration necessary to prevent further fracture and restore occlusal function',
    'existing restoration is failing with recurrent decay at the margins',
    'tooth is non-restorable with a direct restoration',
  ],
  srp: [
    'generalized moderate chronic periodontitis',
    'probing depths of ___mm with bleeding on probing',
    'radiographic evidence of horizontal bone loss',
    'furcation involvement noted at tooth #___',
    'inadequate response to conventional prophylaxis',
    'active periodontal therapy indicated to arrest disease progression',
    'suppuration present at multiple sites',
  ],
  'surgical-extraction': [
    'full thickness mucoperiosteal flap was elevated',
    'ostectomy required to remove bone obstructing the root surface',
    'tooth was sectioned to facilitate atraumatic removal',
    'wound closed with interrupted sutures',
    'simple forceps extraction was not possible due to root morphology',
    'proximity to inferior alveolar nerve required surgical approach',
  ],
  'core-buildup': [
    'insufficient tooth structure remains to support crown retention without foundation buildup',
    'buildup performed specifically for crown retention purposes',
    'adequate resistance and retention form could not be achieved without supplemental core',
    'existing restoration removed revealing insufficient dentin for crown preparation',
  ],
  'perio-maintenance': [
    'patient has documented history of active periodontal disease',
    'periodontal maintenance is distinct from prophylaxis and is clinically indicated',
    'prior scaling and root planing completed — maintenance required to prevent recurrence',
    'probing depths remain elevated requiring continued periodontal monitoring',
  ],
  implant: [
    'radiographic evidence of adequate bone volume and density at implant site',
    'implant necessary to restore proper masticatory function and prevent bone resorption',
    'CBCT confirms proposed implant site is anatomically appropriate',
    'opposing dentition requires restoration of occlusal contact',
    'edentulous span creates functional deficit requiring restoration',
  ],
  appeal: [
    'treatment was warranted and meets the standard of care necessary to restore the patient\'s bite to function with a long-term prognosis for success',
    'Pursuant to 29 CFR § 2560.503-1(h), we request a full and fair review of this claim denial',
    'Under ERISA Section 503, we are entitled to receive, free of charge, all documents and records relevant to this claim',
    'the clinical documentation enclosed exceeds the standard required to demonstrate medical necessity for this procedure',
    'we respectfully request reconsideration based on the enclosed clinical findings and supporting radiographic evidence',
  ],
};

// ─── Payer Notes ──────────────────────────────────────────────────────────────

const PAYER_NOTES: Partial<Record<Payer, Partial<Record<Procedure | '_any', string>>>> = {
  delta: {
    crown: 'Delta aggressively bundles core buildups into crown fees. If billing D2950 separately, narrative must explicitly state the buildup was required for retention, not just to replace decay.',
  },
  cigna: {
    crown: "Cigna narrative language triggers differ from Delta. Customize language per payer — a narrative accepted by Delta may be denied by Cigna.",
    srp:   'Cigna strictly enforces periodontal documentation requirements. Probing depths of 4mm alone are insufficient. Must show radiographic bone loss AND documented failure to respond to prophylaxis.',
  },
  aetna: {
    'surgical-extraction': "Aetna's guidelines state that periodontally involved teeth with excessive bone loss are considered routine removal. Explicitly document flap elevation, bone removal, and sectioning in both chart notes and narrative.",
  },
  metlife: {
    _any: 'MetLife only accepts appeals in writing. Ensure your narrative is complete and thorough on first submission — appeals cannot be filed by phone or electronically.',
  },
};

const getPayerNote = (payer: Payer, procedure: Procedure): string => {
  const payerData = PAYER_NOTES[payer];
  if (payerData) {
    if (payerData[procedure]) return payerData[procedure] as string;
    if ('_any' in payerData) return payerData._any as string;
  }
  return 'No specific payer warnings for this combination. Follow standard documentation requirements.';
};

// ─── Labels ───────────────────────────────────────────────────────────────────

const PROCEDURE_LABELS: Record<Procedure, string> = {
  'crown':              'Crown (D2710–D2799)',
  'srp':                'SRP (D4341/D4342)',
  'surgical-extraction':'Surgical Extraction (D7210)',
  'core-buildup':       'Core Buildup (D2950)',
  'perio-maintenance':  'Periodontal Maintenance (D4910)',
  'implant':            'Implant (D6010)',
  'appeal':             'Appeal Letter',
};

const PAYER_LABELS: Record<Payer, string> = {
  delta:    'Delta Dental',
  cigna:    'Cigna',
  aetna:    'Aetna',
  metlife:  'MetLife',
  uhc:      'UnitedHealthcare',
  guardian: 'Guardian',
  medicaid: 'Medicaid',
  generic:  'Generic',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function NarrativeBuilderClient() {
  const [procedure, setProcedure] = useState<Procedure>('crown');
  const [payer, setPayer]         = useState<Payer>('generic');
  const [narrative, setNarrative] = useState<string>(TEMPLATES.crown);
  const [checked, setChecked]     = useState(false);
  const [copied, setCopied]       = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // When procedure changes, reset template + checkbox
  const handleProcedureChange = (p: Procedure) => {
    setProcedure(p);
    setNarrative(TEMPLATES[p]);
    setChecked(false);
    setCopied(false);
  };

  // Detect banned words
  const foundBanned = BANNED_WORDS.filter(({ word }) =>
    new RegExp(`\\b${word.replace(/\s+/g, '\\s+')}\\b`, 'i').test(narrative)
  );

  // Strength signals
  const signalResults = STRENGTH_SIGNALS.map(s => s.check(narrative, foundBanned.map(b => b.word)));
  const score = signalResults.filter(Boolean).length;
  const strength: 'Weak' | 'Moderate' | 'Strong' =
    score <= 2 ? 'Weak' : score <= 4 ? 'Moderate' : 'Strong';

  // Insert phrase at cursor
  const insertAtCursor = useCallback((phrase: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const next  = narrative.slice(0, start) + phrase + narrative.slice(end);
    setNarrative(next);
    setTimeout(() => {
      el.selectionStart = el.selectionEnd = start + phrase.length;
      el.focus();
    }, 0);
  }, [narrative]);

  // Copy
  const handleCopy = async () => {
    await navigator.clipboard.writeText(narrative);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const phrases = PHRASES[procedure];
  const payerNote = getPayerNote(payer, procedure);

  const font = "'Trebuchet MS', 'Segoe UI', sans-serif";

  const strengthColor = {
    Weak:     { badge: 'bg-red-100 text-red-600',    bar: '#EF4444' },
    Moderate: { badge: 'bg-amber-100 text-amber-600', bar: '#F59E0B' },
    Strong:   { badge: 'bg-green-100 text-green-700', bar: '#22C55E' },
  }[strength];

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-4">

          {/* Dropdowns */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider" style={{ fontFamily: font }}>
                Procedure
              </label>
              <select
                value={procedure}
                onChange={e => handleProcedureChange(e.target.value as Procedure)}
                className="w-full rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white border border-gray-200 outline-none focus:border-[#5B3FD4] focus:ring-2 focus:ring-[#5B3FD4]/10 transition-colors"
                style={{ fontFamily: font }}
              >
                {(Object.keys(PROCEDURE_LABELS) as Procedure[]).map(p => (
                  <option key={p} value={p}>{PROCEDURE_LABELS[p]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider" style={{ fontFamily: font }}>
                Payer
              </label>
              <select
                value={payer}
                onChange={e => setPayer(e.target.value as Payer)}
                className="w-full rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white border border-gray-200 outline-none focus:border-[#5B3FD4] focus:ring-2 focus:ring-[#5B3FD4]/10 transition-colors"
                style={{ fontFamily: font }}
              >
                {(Object.keys(PAYER_LABELS) as Payer[]).map(p => (
                  <option key={p} value={p}>{PAYER_LABELS[p]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Textarea */}
          <div>
            <textarea
              ref={textareaRef}
              value={narrative}
              onChange={e => { setNarrative(e.target.value); setChecked(false); setCopied(false); }}
              rows={14}
              className="w-full rounded-xl p-4 text-sm leading-relaxed resize-y outline-none focus:border-[#5B3FD4] focus:ring-2 focus:ring-[#5B3FD4]/10 transition-colors"
              style={{
                fontFamily: font,
                backgroundColor: '#ffffff',
                border: '1px solid #E5E7EB',
                color: '#111827',
                minHeight: '300px',
              }}
              placeholder="Select a procedure above to load a template, or begin typing your narrative..."
            />
            <p className="text-xs text-right mt-1.5 text-gray-400" style={{ fontFamily: font }}>
              {narrative.length} characters
            </p>
          </div>

          {/* Strength Meter */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: font }}>Narrative Strength</span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${strengthColor.badge}`} style={{ fontFamily: font }}>
                {strength}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 rounded-full bg-gray-100">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${(score / 6) * 100}%`, backgroundColor: strengthColor.bar }}
              />
            </div>

            {/* Signal checklist */}
            <div className="space-y-1.5">
              {STRENGTH_SIGNALS.map((sig, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div
                    className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: signalResults[i] ? 'rgba(34,197,94,0.15)' : 'transparent',
                      border: signalResults[i] ? '1.5px solid #16A34A' : '1.5px solid #D1D5DB',
                    }}
                  >
                    {signalResults[i] && <Check className="h-2.5 w-2.5 text-green-600" strokeWidth={3} />}
                  </div>
                  <span
                    className="text-xs"
                    style={{ fontFamily: font, color: signalResults[i] ? '#374151' : '#9CA3AF' }}
                  >
                    {sig.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Compliance Checkbox */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <button
              onClick={() => setChecked(prev => !prev)}
              className="flex items-start gap-3 w-full text-left"
            >
              <div
                className="flex-shrink-0 mt-0.5 w-5 h-5 rounded flex items-center justify-center transition-colors"
                style={{
                  backgroundColor: checked ? '#5B3FD4' : 'transparent',
                  border: checked ? '2px solid #5B3FD4' : '2px solid #D1D5DB',
                }}
              >
                {checked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
              </div>
              <span className="text-sm leading-relaxed text-gray-600" style={{ fontFamily: font }}>
                I confirm this narrative accurately reflects the patient's clinical chart notes and has been reviewed by the treating provider.
              </span>
            </button>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            disabled={!checked}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-200"
            style={{
              fontFamily: font,
              ...(checked
                ? { backgroundColor: '#5B3FD4', color: '#ffffff', cursor: 'pointer' }
                : { backgroundColor: '#F3F4F6', color: '#9CA3AF', cursor: 'not-allowed' })
            }}
          >
            {copied
              ? <><CheckCheck className="h-4 w-4" /> Copied to Clipboard</>
              : <><Copy className="h-4 w-4" /> Copy Narrative to Clipboard</>
            }
          </button>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-4">

          {/* Banned Language Detector */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
              <span className="font-semibold text-sm text-gray-900" style={{ fontFamily: font }}>Banned Language Detector</span>
              {foundBanned.length > 0 ? (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600" style={{ fontFamily: font }}>
                  {foundBanned.length} flagged
                </span>
              ) : (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700" style={{ fontFamily: font }}>
                  All clear
                </span>
              )}
            </div>

            <div className="p-4">
              {foundBanned.length === 0 ? (
                <div className="flex items-center gap-2.5 py-1">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-green-700" style={{ fontFamily: font }}>No flagged language detected</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {foundBanned.map(({ word, replacement }) => (
                    <div key={word} className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-600 border border-red-200" style={{ fontFamily: font }}>
                        {word}
                      </span>
                      <span className="text-gray-400 text-xs">→</span>
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700 border border-green-200" style={{ fontFamily: font }}>
                        {replacement}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Approved Phrase Library */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
              <span className="font-semibold text-sm text-gray-900" style={{ fontFamily: font }}>Approved Phrase Library</span>
              <span className="ml-2 text-xs text-gray-400" style={{ fontFamily: font }}>
                {PROCEDURE_LABELS[procedure]} — click to insert at cursor
              </span>
            </div>
            <div className="p-4 space-y-2">
              {phrases.map((phrase, i) => (
                <button
                  key={i}
                  onClick={() => insertAtCursor(phrase)}
                  className="w-full text-left text-sm px-3 py-2.5 rounded-lg border border-gray-200 text-gray-700 bg-white hover:bg-[#E8E4FF] hover:border-[#5B3FD4]/30 hover:text-[#5B3FD4] transition-colors leading-snug"
                  style={{ fontFamily: font }}
                >
                  "{phrase}"
                </button>
              ))}
            </div>
          </div>

          {/* Payer Notes */}
          <div className="rounded-xl p-4 bg-amber-50 border border-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
              <span className="font-semibold text-sm text-amber-700" style={{ fontFamily: font }}>Payer Notes</span>
              <span className="text-xs text-gray-400 ml-1" style={{ fontFamily: font }}>
                {PAYER_LABELS[payer]} + {PROCEDURE_LABELS[procedure]}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-amber-900" style={{ fontFamily: font }}>
              {payerNote}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
