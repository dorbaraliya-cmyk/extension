import { NextRequest, NextResponse } from 'next/server';
import { analyzeDocument } from '@/lib/claude';
import { createDealHubDocument } from '@/lib/dealhub';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const send = async (data: object) => {
    await writer.write(encoder.encode(JSON.stringify(data) + '\n'));
  };

  (async () => {
    try {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      const docName = formData.get('docName') as string;
      const baseUrl = formData.get('baseUrl') as string;
      const versionGUID = formData.get('versionGUID') as string;
      const playbookGUID = formData.get('playbookGUID') as string;
      const sessionCookies = formData.get('sessionCookies') as string;

      if (!file || !docName || !baseUrl || !versionGUID || !playbookGUID || !sessionCookies) {
        await send({ error: 'Missing required fields' });
        await writer.close();
        return;
      }

      // Step 1: Analyze with Claude
      await send({ step: 'analyzing', message: 'Analyzing document with Claude...' });
      const bytes = await file.arrayBuffer();
      const base64 = Buffer.from(bytes).toString('base64');
      const mediaType = file.type || 'application/pdf';
      const analysis = await analyzeDocument(base64, mediaType, docName);
      await send({ step: 'building', message: `Found ${analysis.bodySections?.length || 0} sections. Building document...` });

      // Step 2: Create in DealHub
      await send({ step: 'saving', message: 'Saving to DealHub...' });
      const result = await createDealHubDocument({
        baseUrl, sessionCookies, playbookGUID, versionGUID, docName, analysis,
      });
      await send({ step: 'done', message: 'Document created successfully!', ...result });
    } catch (err: any) {
      await send({ error: err.message || 'Unknown error' });
    } finally {
      await writer.close();
    }
  })();

  return new NextResponse(stream.readable, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
    },
  });
}
