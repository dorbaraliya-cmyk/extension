import zlib from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(zlib.gzip);

function dhId() { return (Date.now() + Math.floor(Math.random() * 9999)).toString(); }

const ALL_COLS = [
  { label: 'ORDINAL', displayName: 'Ordinal', hA: 'LEFT', bA: 'RIGHT' },
  { label: 'GROUP', displayName: 'Group', hA: 'LEFT', bA: 'LEFT' },
  { label: 'ITEM_NAME', displayName: 'Item Name', hA: 'LEFT', bA: 'LEFT' },
  { label: 'DESCRIPTION', displayName: 'Description', hA: 'LEFT', bA: 'LEFT' },
  { label: 'SKU', displayName: 'SKU', hA: 'LEFT', bA: 'LEFT' },
  { label: 'TAG', displayName: 'Primary Tag', hA: 'LEFT', bA: 'LEFT' },
  { label: 'BASE_PRICE', displayName: 'List Price/Unit', hA: 'LEFT', bA: 'RIGHT' },
  { label: 'DURATION', displayName: 'Duration', hA: 'LEFT', bA: 'RIGHT' },
  { label: 'QUANTITY', displayName: 'Quantity', hA: 'LEFT', bA: 'RIGHT' },
  { label: 'IS_RENEWABLE', displayName: 'Is Renewable', hA: 'LEFT', bA: 'LEFT' },
  { label: 'START_DATE', displayName: 'Start Date', hA: 'LEFT', bA: 'LEFT' },
  { label: 'END_DATE', displayName: 'End Date', hA: 'LEFT', bA: 'LEFT' },
  { label: 'NUMBER', displayName: 'Number', hA: 'LEFT', bA: 'RIGHT' },
  { label: 'MULTIPLY_ALL_FACTORS', displayName: 'Total Quantity', hA: 'LEFT', bA: 'RIGHT' },
  { label: 'LIST_PRICE', displayName: 'List Price', hA: 'LEFT', bA: 'RIGHT' },
  { label: 'POSITIVE_LIST_PRICE', displayName: 'Positive List Price', hA: 'LEFT', bA: 'RIGHT' },
  { label: 'NEGATIVE_LIST_PRICE', displayName: 'Negative List Price', hA: 'LEFT', bA: 'RIGHT' },
  { label: 'PROMOTION_DISCOUNT', displayName: 'Promotions', hA: 'LEFT', bA: 'RIGHT' },
  { label: 'PROMOTION_DISCOUNT_PRCT', displayName: 'Promotions %', hA: 'LEFT', bA: 'RIGHT' },
  { label: 'SPECIAL_DISCOUNT', displayName: 'Special Discount', hA: 'LEFT', bA: 'RIGHT' },
  { label: 'SPECIAL_DISCOUNT_PRCT', displayName: 'Special Disc %', hA: 'LEFT', bA: 'RIGHT' },
  { label: 'USER_DISCOUNT', displayName: 'Sales Discount', hA: 'LEFT', bA: 'RIGHT' },
  { label: 'USER_DISCOUNT_PRCT', displayName: 'Sales Disc %', hA: 'LEFT', bA: 'RIGHT' },
  { label: 'DISCOUNT_PRCT', displayName: 'Discount %', hA: 'LEFT', bA: 'RIGHT' },
  { label: 'DISCOUNT_$', displayName: 'Discount $', hA: 'LEFT', bA: 'RIGHT' },
  { label: 'NET_PRICE', displayName: 'Net Price', hA: 'LEFT', bA: 'RIGHT' },
  { label: 'NET_PRICE_PER_UNIT', displayName: 'Net Price/Unit', hA: 'LEFT', bA: 'RIGHT' },
  { label: 'MSRP', displayName: 'MSRP', hA: 'LEFT', bA: 'RIGHT' },
  { label: 'MSRP_DISCOUNT', displayName: 'MSRP Discount', hA: 'LEFT', bA: 'RIGHT' },
].map(c => ({
  active: false, cellWidth: 0, displayName: c.displayName, displayFirstName: null,
  displaySecondName: null, label: c.label, ordinal: 0, sortable: true,
  groupColumnType: 'EMPTY', groupColumnFreeText: '', groupColumnFormula: '',
  displayFirstData: null, displaySecondData: null, presentationRule: 'false',
  cellDataWidth: 0, cellHeight: 0, maxCellHeight: 0,
  headerAlign: c.hA, bodyAlign: c.bA,
  totalsRowLabel: 'N/A', showInTotalsRow: false, enableSummarizeInTotalsRow: false,
}));

function makeTextPart(title: string, html: string) {
  const id = dhId(); const cid = dhId();
  return {
    guid: id, selectedGuid: cid,
    template: 'docComposerTextSection.html',
    expanded: true, shown: true, title, type: 'TEXT', includePageNumber: false,
    content: [{ guid: cid, title, desc: html, url: '', condition: null,
      pageBreakAfter: false, footerHR: false, lockedForChanges: false }],
  };
}

function makeTablePart(
  title: string,
  activeLabels: string[],
  nameOverrides: Record<string, string> = {},
  showDiscount = false,
  showTotalNetPrice = true,
) {
  const id = dhId(); const partId = dhId();
  const cols = ALL_COLS.map(c => ({
    ...c,
    active: activeLabels.includes(c.label),
    displayName: nameOverrides[c.label] || c.displayName,
  }));
  return {
    guid: id, selectedGuid: '', template: 'docComposerTableSection.html',
    expanded: true, shown: true, title, type: 'TABLE', tableType: 'PRODUCTS_TABLE',
    includePageNumber: false,
    tableParts: [{
      guid: partId, title: 'Pricing Table', condition: 'true',
      usePresentationRule: false, subject: '',
      showTotalListPrice: false, totalListPriceName: 'Total List Price',
      showDiscount, discountName: 'Discount', discountType: 'DISCOUNT_PRCT',
      showTotalNegativePrice: false, totalNegativePriceName: 'Total Negative Price',
      showTotalNetPrice, totalNetPriceName: 'Total Net Price',
      showTablePerType: false, content: cols,
    }],
  };
}

function makeSignaturePart() {
  const id = dhId();
  return {
    guid: id, selectedGuid: id,
    template: 'docComposerSignatureSection.html',
    expanded: true, shown: true, title: 'Signature', type: 'SIGNATURE',
    signatories: ['BUYER', 'SELLER'], includePageNumber: false, content: [],
  };
}

async function dhPost(baseUrl: string, path: string, cookieHeader: string, body: Buffer) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Encoding': 'gzip',
      'Cookie': cookieHeader,
      'Accept': 'application/json',
      'Origin': baseUrl,
      'Referer': `${baseUrl}/`,
    },
    body: body as unknown as BodyInit,
  });
  return res;
}

async function dhPostMultipart(baseUrl: string, path: string, cookieHeader: string, fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Cookie': cookieHeader, 'Accept': 'application/json', 'Origin': baseUrl, 'Referer': `${baseUrl}/` },
    body: fd,
  });
  return res;
}

export async function createDealHubDocument(params: {
  baseUrl: string;
  sessionCookies: string;
  playbookGUID: string;
  versionGUID: string;
  docName: string;
  analysis: any;
}) {
  const { baseUrl, sessionCookies, playbookGUID, versionGUID, docName, analysis } = params;
  const cookieHeader = sessionCookies.trim();

  // Create document
  const docPayload = {
    guid: null, name: docName, displayName: null, playbookGUID,
    documentTypeGUID: null, externalFileGuid: null,
    comment: '', rule: '', assignType: 'ALWAYS', type: 'DOCUMENT',
    tagRelations: [], deletedDocumentTags: [],
    customFileNameTemplate: '%PROPOSAL_ID%', enableCustomFileName: null,
    changeLogRecords: [{
      date: Date.now(), username: 'doc-builder', userlogin: 'builder@app.io',
      impersonatorUserName: null, impersonatorDealhubUser: false, dealhubUser: true,
      action: 'New', object: 'Output Document', objectName: docName,
      subObject: '', subObjectName: '', attribute: '', attributeName: '', fromValue: '', toValue: '',
    }],
    versionGUID,
  };
  const createRes = await dhPostMultipart(baseUrl, '/outputdoc/createOrUpdate', cookieHeader, {
    outputDocument: JSON.stringify(docPayload),
  });
  if (!createRes.ok) throw new Error(`Create failed: ${createRes.status} ${await createRes.text()}`);
  const docGUID = (await createRes.text()).replace(/"/g, '').trim();

  // Fetch skeleton
  const getRes = await fetch(`${baseUrl}/outputData/edit?guid=${docGUID}&versionGUID=${versionGUID}`, {
    headers: { 'Cookie': cookieHeader, 'Accept': 'application/json' },
  });
  if (!getRes.ok) throw new Error(`Get failed: ${getRes.status}`);
  const state = await getRes.json();
  const pages = typeof state.outputData === 'string' ? JSON.parse(state.outputData) : state.outputData;

  // Footer
  const hf = pages.sections.find((s: any) => s.title === 'Header_and_footer');
  const footer = hf?.parts.find((p: any) => p.guid === 'footer');
  if (footer?.content?.[0] && analysis.footer?.html) {
    footer.content[0].desc = analysis.footer.html;
  }

  // Body sections
  const body = pages.sections.find((s: any) => s.title === 'Body');
  body.parts = (analysis.bodySections || []).map((sec: any) => {
    if (sec.type === 'TEXT') return makeTextPart(sec.title, sec.html || '');
    if (sec.type === 'TABLE') return makeTablePart(
      sec.title,
      sec.activeColumns || ['ITEM_NAME', 'QUANTITY', 'NET_PRICE'],
      sec.columnNames || {},
      sec.showDiscount ?? false,
      sec.showTotalNetPrice ?? true,
    );
    if (sec.type === 'SIGNATURE') return makeSignaturePart();
    return makeTextPart(sec.title || 'Section', sec.html || '');
  });

  // Save
  const savePayload = {
    versionGUID, guid: state.outputDocGUID,
    pageSize: analysis.pageSize || 'LETTER',
    pageOrientation: analysis.orientation || 'PORTRAIT',
    pages, defaultTablePart: null,
    isRTL: false, showOnce: false, wrapTablesWithLines: true,
    marginTop: 60, marginBottom: 60, marginLeft: 60, marginRight: 60,
    coverPagePresentationRule: 'true',
    changeLogRecords: [{
      date: Date.now(), username: 'doc-builder', userlogin: 'builder@app.io',
      impersonatorUserName: null, impersonatorDealhubUser: false, dealhubUser: true,
      action: 'Modification', object: 'Output Document', objectName: docName,
      subObject: '', subObjectName: '', attribute: '', attributeName: '', fromValue: '', toValue: '',
    }],
  };

  const buf = await gzipAsync(Buffer.from(JSON.stringify(savePayload), 'utf8'));
  const saveRes = await dhPost(baseUrl, '/outputData/save', cookieHeader, buf);
  if (!saveRes.ok) throw new Error(`Save failed: ${saveRes.status} ${await saveRes.text()}`);

  return {
    docGUID,
    url: `${baseUrl}/#/docComposer?versionGUID=${versionGUID}&docName=${encodeURIComponent(docName)}&docGUID=${docGUID}`,
  };
}
