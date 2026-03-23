'use client';
import { useState } from 'react';
import ClaimsListView from './ClaimsListView';
import ARQueueClient from '@/components/ar-queue/ARQueueClient';

interface ARClaim {
  id: string;
  patientName: string;
  payer: string;
  cdtCode: string;
  procedureDescription: string;
  claimAmount: number;
  dateOfService: string;
  dateSubmitted: string;
  status: string;
  notes: string;
  callLogs: never[];
}

interface ClaimsTabsProps {
  isDemoUser: boolean;
  initialArClaims: ARClaim[];
}

export default function ClaimsTabs({ isDemoUser, initialArClaims }: ClaimsTabsProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'ar-queue'>('all');

  return (
    <div>
      {/* Tab bar */}
      <div className="px-6 pt-4 pb-0 border-b border-gray-200 bg-white">
        <div className="flex gap-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-[#5B3FD4] text-[#5B3FD4]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            All Claims
          </button>
          <button
            onClick={() => setActiveTab('ar-queue')}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'ar-queue'
                ? 'border-[#5B3FD4] text-[#5B3FD4]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            AR Queue
          </button>
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'all' ? (
        <ClaimsListView />
      ) : (
        <ARQueueClient isDemoUser={isDemoUser} initialClaims={initialArClaims as Parameters<typeof ARQueueClient>[0]['initialClaims']} />
      )}
    </div>
  );
}
