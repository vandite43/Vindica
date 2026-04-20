import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { analyzeClaim } from '@/lib/ai/claim-analyzer';
import { getClaimById, updateClaim } from '@/lib/db/claims';
import { getGlobalAIModel } from '@/lib/system-config';
import { isRateLimited } from '@/lib/auth/rate-limit';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Rate limit: 10 AI analyses per user per minute
    // TODO: replace with Redis-backed limiter before multi-instance deployment
    if (isRateLimited(`analyze:${session.user.id}`, 10, 60_000)) {
      return NextResponse.json({ error: 'Too many requests. Please wait before analyzing again.' }, { status: 429 });
    }

    const { id } = await params;
    await req.json().catch(() => ({})); // body not used
    const model = await getGlobalAIModel();

    const claim = await getClaimById(id);
    if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    const userPractice = await prisma.practice.findFirst({
      where: { OR: [{ userId: session.user.id }, { members: { some: { id: session.user.id } } }] },
      select: { id: true },
    });
    if (!userPractice || claim.practiceId !== userPractice.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payerIntelligence = await prisma.payer.findUnique({ where: { payerId: claim.payerId } });

    const analysis = await analyzeClaim(
      {
        patientName:        claim.patientName,
        patientDob:         claim.patientDob.toISOString(),
        patientInsuranceId: claim.patientInsuranceId,
        payerId:            claim.payerId,
        payerName:          claim.payerName,
        planType:           claim.planType || undefined,
        claimDate:          claim.claimDate.toISOString(),
        serviceDate:        claim.serviceDate.toISOString(),
        cdtCodes:           claim.cdtCodes,
        toothNumbers:       claim.toothNumbers,
        diagnosisCodes:     claim.diagnosisCodes,
        totalAmount:        claim.totalAmount,
        providerNpi:        claim.providerNpi || undefined,
        preAuthNumber:      claim.preAuthNumber || undefined,
        xraysAttached:      claim.xraysAttached,
        perioCharting:      claim.perioCharting,
        preAuthObtained:    claim.preAuthObtained,
        narrativeIncluded:  claim.narrativeIncluded,
      },
      payerIntelligence
        ? {
            id:                  payerIntelligence.id,
            payerId:             payerIntelligence.payerId,
            name:                payerIntelligence.name,
            state:               payerIntelligence.state,
            denialRate:          payerIntelligence.denialRate,
            avgProcessDays:      payerIntelligence.avgProcessDays,
            commonDenialReasons: payerIntelligence.commonDenialReasons,
            requiresPreAuth:     payerIntelligence.requiresPreAuth,
            documentationQuirks: payerIntelligence.documentationQuirks,
          }
        : null,
      model
    );

    const updated = await updateClaim(id, {
      denialRiskScore:   analysis.denialRiskScore,
      riskLevel:         analysis.riskLevel,
      aiAnalysis:        analysis as object,
      flaggedIssues:     analysis.riskFactors.map((f) => f.factor),
      suggestedCdtCodes: analysis.cdtCodeAnalysis
        .filter((c) => c.alternativeCode)
        .map((c) => c.alternativeCode as string),
    });

    return NextResponse.json({ claim: updated, analysis });
  } catch (error) {
    console.error('[analyze]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
