// app/api/integrations/smartleads/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SmartleadClient } from '@/lib/smartlead';

export async function POST(req: NextRequest) {
  try {
    const { apiKey, clientId } = await req.json();
    if (!apiKey)
      return NextResponse.json({ message: 'apiKey is required' }, { status: 400 });

    const sl = new SmartleadClient(apiKey);

    // ❶  No client chosen yet  →  return list of clients
    if (!clientId) {
      const clients = await sl.listClients();
      return NextResponse.json({ mode: 'clients', clients });
    }

    // ❷  Client chosen        →  return that client’s campaigns
    const campaigns = await sl.listCampaigns(clientId);
    return NextResponse.json({ mode: 'campaigns', campaigns });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 400 });
  }
}
