'use client';

import { useState } from 'react';
import {
  User, ShieldCheck, Code2, Paperclip,
  Check, CheckCircle2, RotateCcw, ClipboardCheck,
} from 'lucide-react';

interface ScrubberItem {
  id: string;
  title: string;
  why: string;
}

interface ScrubberSection {
  id: string;
  title: string;
  icon: React.ElementType;
  items: ScrubberItem[];
}

const SECTIONS: ScrubberSection[] = [
  {
    id: 'demographics',
    title: 'Patient Demographics',
    icon: User,
    items: [
      {
        id: 'legal_name',
        title: 'Legal name matches insurance records exactly',
        why: 'Name mismatches are the #1 cause of eligibility denials. Even a nickname or middle initial discrepancy triggers rejection.',
      },
      {
        id: 'dob',
        title: 'Date of birth is correct',
        why: 'DOB is the primary patient identifier for most payers. One digit off = claim rejected as unverifiable.',
      },
      {
        id: 'subscriber',
        title: 'Subscriber name and relationship are accurate',
        why: 'Incorrect relationship codes (e.g., self vs. dependent) cause coordination errors and coverage denials.',
      },
      {
        id: 'insurance_id',
        title: 'Insurance ID and Group number are current',
        why: 'Outdated IDs from expired cards cause instant rejection at the clearinghouse.',
      },
      {
        id: 'cob',
        title: 'COB determination is correct',
        why: 'Filing to the wrong primary payer delays payment by weeks. Confirm COB before every claim.',
      },
    ],
  },
  {
    id: 'provider',
    title: 'Provider & Credentialing',
    icon: ShieldCheck,
    items: [
      {
        id: 'type1_npi',
        title: 'Treating provider NPI in Box 54 (Type 1 — Individual)',
        why: "Box 54 must contain the individual dentist's NPI, not the practice NPI. Wrong type = claim rejected.",
      },
      {
        id: 'type2_npi',
        title: 'Billing entity NPI in Box 49 (Type 2 — Organization)',
        why: 'Box 49 requires the organization/group NPI. Swapping Type 1 and Type 2 is a common, costly error.',
      },
      {
        id: 'credentialed',
        title: 'Rendering provider is credentialed with this payer',
        why: 'Claims from non-participating or not-yet-credentialed providers are denied as out-of-network.',
      },
      {
        id: 'payer_id',
        title: 'Correct Clearinghouse Payer ID is verified',
        why: 'Wrong payer ID routes the claim to the wrong carrier. Recovery requires re-submission from scratch.',
      },
    ],
  },
  {
    id: 'coding',
    title: 'Coding Accuracy',
    icon: Code2,
    items: [
      {
        id: 'cdt_codes',
        title: 'CDT codes match procedures using current-year codes',
        why: 'Outdated CDT codes are rejected outright. ADA releases updates annually — verify your fee schedule is current-year.',
      },
      {
        id: 'tooth_surfaces',
        title: 'Tooth numbers and surfaces are correct',
        why: 'Wrong tooth number or surface count (e.g., 2-surface vs. 3-surface) triggers downcoding or denial.',
      },
      {
        id: 'no_duplicates',
        title: 'No duplicate billing, unbundling, or upcoding',
        why: 'Duplicate claims trigger automatic denial. Unbundling and upcoding both risk audit flags.',
      },
      {
        id: 'frequency',
        title: 'Frequency limits verified for this patient and payer',
        why: 'Submitting D1110 within 6 months of the last cleaning is the most common frequency denial. Check history first.',
      },
      {
        id: 'preauth',
        title: 'Pre-authorization number referenced if required',
        why: 'Crowns, implants, and surgical procedures often require pre-auth. A missing auth number = instant denial.',
      },
      {
        id: 'eob_attached',
        title: 'Primary EOB attached for secondary (COB) claims',
        why: "Secondary payers cannot process without the primary's Explanation of Benefits. This is a hard requirement.",
      },
    ],
  },
  {
    id: 'attachments',
    title: 'Attachments',
    icon: Paperclip,
    items: [
      {
        id: 'radiographs',
        title: 'Radiographs attached (periapical/bitewing/panoramic)',
        why: 'X-rays are required for most restorative, perio, surgical, and implant claims. No X-ray = no payment.',
      },
      {
        id: 'perio_chart',
        title: 'Periodontal charting attached for D4341, D4342, D4910',
        why: 'Payers require a 6-point perio chart with probing depths ≥4mm to support SRP and maintenance codes.',
      },
      {
        id: 'narrative',
        title: 'Clinical narrative for crowns, SRP, surgical procedures',
        why: 'Without a narrative explaining medical necessity, payers default to denial for high-value procedures.',
      },
      {
        id: 'lab_receipt',
        title: 'Lab receipt attached for high noble crown (D2750)',
        why: 'D2750 requires proof of alloy content. Missing lab receipt triggers denial or downcode to base metal.',
      },
      {
        id: 'photos',
        title: 'Intraoral photos with annotations attached if applicable',
        why: 'Photos strengthen medical necessity arguments for crowns, fractures, and cosmetic-adjacent procedures.',
      },
    ],
  },
];

const TOTAL = SECTIONS.reduce((sum, s) => sum + s.items.length, 0);

interface ScrubberClientProps {
  initialChecked?: string[];
  prefilled?: boolean;
  claimLabel?: string;
}

export default function ScrubberClient({ initialChecked = [], prefilled = false, claimLabel }: ScrubberClientProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set(initialChecked));

  const toggle = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const reset = () => setChecked(new Set());

  const count = checked.size;
  const pct = Math.round((count / TOTAL) * 100);
  const allDone = count === TOTAL;

  const isSectionDone = (section: ScrubberSection) =>
    section.items.every(item => checked.has(item.id));

  return (
    <div className="p-6 space-y-4">

      {/* Pre-fill notice */}
      {prefilled && (
        <div className="px-4 py-3 rounded-xl text-sm bg-[#E8E4FF] border border-[#5B3FD4]/25 text-[#5B3FD4]">
          Some items were pre-filled from saved claim data
          {claimLabel ? ` for ${claimLabel}` : ''}. Verify all items before submitting.
        </div>
      )}

      {/* Progress bar card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-[#5B3FD4]" />
            <span className="text-2xl font-bold text-gray-900">{pct}%</span>
            <span className="text-sm text-gray-500">{count} of {TOTAL} items verified</span>
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 border border-gray-200 hover:text-gray-900 hover:border-gray-300 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>
        <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(to right, #5B3FD4, #3BBFB0)',
            }}
          />
        </div>
      </div>

      {/* Claim Ready banner */}
      {allDone && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-xl bg-green-50 border border-green-200">
          <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-green-600" />
          <div>
            <p className="font-semibold text-green-800">Claim Ready to Submit</p>
            <p className="text-sm text-green-600">All {TOTAL} pre-submission checks passed. Proceed with confidence.</p>
          </div>
        </div>
      )}

      {/* Sections */}
      <div className="space-y-4">
        {SECTIONS.map(section => {
          const done = isSectionDone(section);
          const SectionIcon = section.icon;
          const sectionCheckedCount = section.items.filter(i => checked.has(i.id)).length;

          return (
            <div key={section.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Section header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-3">
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-[#3BBFB0]" />
                  ) : (
                    <SectionIcon className="h-5 w-5 text-[#5B3FD4]" />
                  )}
                  <span className={`font-semibold text-sm ${done ? 'text-[#3BBFB0]' : 'text-gray-900'}`}>
                    {section.title}
                  </span>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  done
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {sectionCheckedCount}/{section.items.length}
                </span>
              </div>

              {/* Items */}
              <div className="divide-y divide-gray-100">
                {section.items.map(item => {
                  const isChecked = checked.has(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggle(item.id)}
                      className={`w-full flex items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50 ${
                        isChecked ? 'bg-[#F0EEFF]' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <div
                        className="mt-0.5 flex-shrink-0 h-5 w-5 rounded flex items-center justify-center transition-colors"
                        style={{
                          backgroundColor: isChecked ? '#5B3FD4' : 'transparent',
                          border: isChecked ? '2px solid #5B3FD4' : '2px solid #D1D5DB',
                        }}
                      >
                        {isChecked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium leading-snug ${isChecked ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                          {item.title}
                        </p>
                        <p className="text-xs mt-1 leading-relaxed text-gray-500">
                          {item.why}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
