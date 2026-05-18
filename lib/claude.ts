import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TOKENS = `
Available DealHub parameter tokens (use these for dynamic fields):
- %OPPORTUNITY_ACCOUNT% — Client/company name
- %OPPORTUNITY_NAME% — Quote/opportunity number
- %USER_FULLNAME% — Prepared by (rep name)
- %OWNER_FULLNAME% — Sales manager name
- %DATE% — Today's date
- %GQ.Start_Date% — Contract start date
- %GQ.End_Date% — Contract end date
- %GQ.Duration% — Contract term/duration
- %GQ.Opp_Type% — Contract type
- %General.ExpirationDate% — Quote expiration date
- %Document.Billing_Name% — Billing contact name
- %Document.Billing_Email% — Billing email
`;

export async function analyzeDocument(fileBase64: string, mediaType: string, docName: string) {
  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 8000,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'document',
          source: { type: 'base64', media_type: mediaType as any, data: fileBase64 },
        },
        {
          type: 'text',
          text: `Analyze this document and return a JSON structure to recreate it as a DealHub output document template named "${docName}".

${TOKENS}

Return ONLY valid JSON (no markdown, no explanation) with this exact shape:

{
  "pageSize": "LETTER",
  "orientation": "PORTRAIT",
  "footer": { "html": "<p style='font-size:9px;color:#888;text-align:center;'>...</p>" },
  "bodySections": [
    {
      "type": "TEXT",
      "title": "Section title",
      "html": "<full HTML string reproducing this section faithfully, 800px wide tables, #4a4a4a dark gray or brand-color headers, replace dynamic values with tokens>"
    },
    {
      "type": "TABLE",
      "title": "Pricing table title",
      "activeColumns": ["ITEM_NAME", "QUANTITY", "NET_PRICE"],
      "columnNames": { "NET_PRICE": "Total" },
      "showDiscount": false,
      "showTotalNetPrice": true
    },
    {
      "type": "SIGNATURE"
    }
  ]
}

Rules:
- Reproduce ALL sections from the document in order
- For pricing/product tables use type TABLE (not HTML tables in TEXT)
- For signature blocks use type SIGNATURE
- For everything else use TEXT with faithful HTML reproduction
- Tables in TEXT sections: width 800px, border-collapse collapse, 1px solid borders
- Replace any specific client name/date/rep name with appropriate tokens from the list above
- Static content (terms, package descriptions, bullet lists) stays as-is in HTML
- Keep brand colors from the original document`,
        }
      ]
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  // Strip any markdown code fences if present
  const clean = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(clean);
}
