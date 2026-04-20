import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { protect } from '@/lib/auth/protect';
import { listClaims, createClaim } from '@/lib/db/claims';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const practice = await prisma.practice.findFirst({ where: { OR: [{ userId: session.user.id }, { members: { some: { id: session.user.id } } }] } });
    if (!practice) return NextResponse.json({ error: 'Practice not found' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const status    = searchParams.get('status')    ?? undefined;
    const riskLevel = searchParams.get('riskLevel') ?? undefined;
    const payerId   = searchParams.get('payerId')   ?? undefined;
    const limit     = Math.min(parseInt(searchParams.get('limit')  ?? '50', 10) || 50, 100);
    const offset    = Math.max(parseInt(searchParams.get('offset') ?? '0',  10) || 0,  0);

    const result = await listClaims(practice.id, { status, riskLevel, payerId }, { limit, offset });
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await protect(req, ['SUPER_ADMIN', 'ADMIN', 'OFFICE_MANAGER', 'BILLER']);
    if (guard) return guard;

    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const practice = await prisma.practice.findFirst({ where: { OR: [{ userId: session.user.id }, { members: { some: { id: session.user.id } } }] } });
    if (!practice) return NextResponse.json({ error: 'Practice not found' }, { status: 404 });

    const body = await req.json();

    // Validate required fields
    if (!body.patientName || !body.patientDob || !body.patientInsuranceId ||
        !body.payerId || !body.payerName || !body.serviceDate || !body.totalAmount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate dates
    const patientDob  = new Date(body.patientDob);
    const serviceDate = new Date(body.serviceDate);
    const claimDate   = new Date(body.claimDate || new Date());

    if (isNaN(patientDob.getTime()) || isNaN(serviceDate.getTime()) || isNaN(claimDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date value' }, { status: 400 });
    }
    if (patientDob > new Date()) {
      return NextResponse.json({ error: 'Patient date of birth cannot be in the future' }, { status: 400 });
    }

    // Validate CDT codes
    if (!Array.isArray(body.cdtCodes) || body.cdtCodes.length === 0) {
      return NextResponse.json({ error: 'At least one CDT code is required' }, { status: 400 });
    }
    const CDT_FORMAT = /^D\d{4}$/;
    if (!body.cdtCodes.every((c: unknown) => typeof c === 'string' && CDT_FORMAT.test(c))) {
      return NextResponse.json({ error: 'CDT codes must be in format D0000' }, { status: 400 });
    }

    const claim = await createClaim(practice.id, {
      patientName:        body.patientName,
      patientDob,
      patientInsuranceId: body.patientInsuranceId,
      payerId:            body.payerId,
      payerName:          body.payerName,
      planType:           body.planType,
      claimDate,
      serviceDate,
      cdtCodes:           body.cdtCodes,
      diagnosisCodes:     body.diagnosisCodes || [],
      totalAmount:        parseFloat(body.totalAmount),
    });

    return NextResponse.json(claim, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
