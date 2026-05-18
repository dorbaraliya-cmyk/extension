import { NextRequest, NextResponse } from 'next/server';
import { DealHubWebClient } from '@/lib/web-dealhub-client';

export async function POST(req: NextRequest) {
  try {
    const { baseUrl, sessionCookies } = await req.json() as { baseUrl: string; sessionCookies: string };
    if (!baseUrl || !sessionCookies) {
      return NextResponse.json({ error: 'baseUrl and sessionCookies required.' }, { status: 400 });
    }
    const client = new DealHubWebClient(baseUrl, sessionCookies);
    const raw = await client.get<Array<{ guid: string; name: string; status: string }>>(
      '/versions/admin?isArchived=false&versionsScreen=true',
    );
    const versions = raw.map((v) => ({ guid: v.guid, name: v.name, status: v.status }));
    return NextResponse.json({ versions });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
