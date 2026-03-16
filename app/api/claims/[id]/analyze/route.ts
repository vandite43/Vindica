import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { analyzeClaim } from '@/lib/ai/claim-analyzer';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const model: string | undefined = body.model;
    const claim = await prisma.claim.findUnique({
      where: { id },
      include: { practice: { select: { userId: true } } },
    });

    if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    if (claim.practice.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const payerIntelligence = await prisma.payer.findUnique({ where: { payerId: claim.payerId } });

    const analysis = await analyzeClaim(
      {
        patientName: claim.patientName,
        patientDob: claim.patientDob.toISOString(),
        patientInsuranceId: claim.patientInsuranceId,
        payerId: claim.payerId,
        payerName: claim.payerName,
        planType: claim.planType || undefined,
        claimDate: claim.claimDate.toISOString(),
        serviceDate: claim.serviceDate.toISOString(),
        cdtCodes: claim.cdtCodes,
        diagnosisCodes: claim.diagnosisCodes,
        totalAmount: claim.totalAmount,
      },
      payerIntelligence
        ? {
            id: payerIntelligence.id,
            payerId: payerIntelligence.payerId,
            name: payerIntelligence.name,
            state: payerIntelligence.state,
            denialRate: payerIntelligence.denialRate,
            avgProcessDays: payerIntelligence.avgProcessDays,
            commonDenialReasons: payerIntelligence.commonDenialReasons,
            requiresPreAuth: payerIntelligence.requiresPreAuth,
            documentationQuirks: payerIntelligence.documentationQuirks,
          }
        : null,
      model
    );

    const updated = await prisma.claim.update({
      where: { id },
      data: {
        denialRiskScore: analysis.denialRiskScore,
        riskLevel: analysis.riskLevel,
        aiAnalysis: analysis as object,
        flaggedIssues: analysis.riskFactors.map((f) => f.factor),
        suggestedCdtCodes: analysis.cdtCodeAnalysis
          .filter((c) => c.alternativeCode)
          .map((c) => c.alternativeCode as string),
      },
    });

    return NextResponse.json({ claim: updated, analysis });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
