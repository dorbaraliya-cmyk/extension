'use client';

import { useState, useEffect, useCallback } from 'react';

const ACCENT = '#4ade80';
const ACCENT_DIM = 'rgba(74,222,128,0.15)';
const BG = '#0d1a27';
const BG_CARD = '#162332';
const BG_CARD2 = '#1a2b3e';
const BORDER = '#1e3346';
const TEXT = '#ffffff';
const TEXT_MUTED = '#7a9bb5';

interface KeyTerm { term: string; def: string; }
interface Screenshot { src: string; caption: string; }
interface Module {
  id: string;
  title: string;
  subtitle: string;
  time: number;
  talkingPoints: string[];
  demoSteps: string[];
  keyTerms: KeyTerm[];
  screenshots?: Screenshot[];
}

const MODULES: Module[] = [
  {
    id: 'intro', title: 'Welcome & Overview', subtitle: 'What is DealHub and why it matters', time: 5,
    talkingPoints: [
      'DealHub is a CPQ platform that lives inside your CRM — reps never leave Salesforce to build a quote',
      'Three pillars: CPQ (quoting engine), DealRoom (buyer collaboration workspace), CLM (contract management)',
      'The problem we solve: manual quoting in spreadsheets causes pricing errors, approval delays, and inconsistent buyer experiences',
      'Today we\'ll walk through the full admin backend — by the end you\'ll know how every module connects',
      'We configure everything directly in your system — by the end of the overview session your environment will be ready to go',
    ],
    demoSteps: [
      'Open DealHub admin panel — show the main navigation (Playbook, Products, Output Documents, Approvals, Settings)',
      'Quick demo of the sales experience: open an Opportunity in Salesforce → click "Create Quote" → the Playbook launches',
      'Show the end-to-end: Playbook → products auto-populate → send to DealRoom → buyer signs → DocuSign fires',
    ],
    keyTerms: [
      { term: 'CPQ', def: 'Configure, Price, Quote — the engine that guides reps through building an accurate quote' },
      { term: 'DealRoom', def: 'A buyer-facing digital workspace where quotes are shared, negotiated, and signed' },
      { term: 'Playbook', def: 'The guided selling form — the heart of DealHub. Every quote starts here' },
      { term: 'Version', def: 'A configuration snapshot. You work in Draft, then publish to Live' },
    ],
    screenshots: [
      { src: '/slides/filtering-result.png', caption: 'DealHub in Sales Mode — reps select products, set quantities, and see live pricing in the Product Summary' },
    ],
  },
  {
    id: 'users', title: 'User Management', subtitle: 'Users, roles, profiles, and permissions', time: 10,
    talkingPoints: [
      'Users are synced from your CRM — when a rep is added in Salesforce, they appear in DealHub automatically',
      'Two primary roles: Admin (full config access) and Sales (quote creation only)',
      'Admin Profiles let you create permission tiers — e.g., a "Deal Desk" profile that can override pricing but can\'t edit the Playbook',
      'Positions define the reporting hierarchy — critical for approval routing (manager approval flows up the chain)',
      'Impersonation: admins can log in as any user to test their exact experience or troubleshoot issues',
      'Partner users get a scoped view — they only see their deals, their products, their pricing',
    ],
    demoSteps: [
      'Go to Settings → Users. Show the user list — point out the CRM sync icon',
      'Click into one user: show Role, Position, and Admin Profile fields',
      'Navigate to Admin Profiles — show what permissions each toggle controls',
      'Demo Impersonation: click "Impersonate" on a sales user to see their exact view',
      'Show User Groups — useful for bulk permission assignment (e.g., West Coast AEs)',
    ],
    keyTerms: [
      { term: 'Admin Profile', def: 'A named permission set assigned to users — controls what they can edit, override, or view' },
      { term: 'Position', def: 'The user\'s place in the org hierarchy. Determines who their manager is for approval routing' },
      { term: 'Impersonation', def: 'Admin ability to temporarily act as another user — essential for troubleshooting' },
      { term: 'User Group', def: 'A collection of users that can share permissions, pricing, or document templates' },
    ],
    screenshots: [
      { src: '/slides/users.png', caption: 'User Management — user list synced from CRM, showing Roles, Positions, and Admin Profiles' },
    ],
  },
  {
    id: 'versions', title: 'Version Management', subtitle: 'Draft vs Live — working safely in DealHub', time: 5,
    talkingPoints: [
      'Every change in DealHub happens in a Draft version — your Live environment is never touched until you publish',
      'You can have multiple Draft versions in progress simultaneously — useful for testing different configs',
      'When you\'re ready, you publish Draft → Live. Active quotes on the old version continue unaffected',
      'Best practice: always create a new Draft before any config work. Never edit Live directly',
      'Version history is preserved — you can roll back if a publish causes issues',
    ],
    demoSteps: [
      'Show the Version Management screen — point out current Live version and any Draft versions',
      'Create a new Draft version from the current Live',
      'Show how the version selector works at the top of the admin panel',
      'Explain: any changes made now are in Draft and won\'t affect quotes being built in production',
    ],
    keyTerms: [
      { term: 'Draft', def: 'A working copy of your configuration — safe to edit, not visible to sales reps' },
      { term: 'Live', def: 'The active published version — what sales reps see when they open DealHub' },
      { term: 'Publish', def: 'The action of promoting a Draft to Live, making changes visible to the sales team' },
    ],
    screenshots: [
      { src: '/slides/playbook.png', caption: 'Playbook in Sales Mode — all configuration (questions, products, pricing, rules) is built in a Draft version and published to Live' },
    ],
  },
  {
    id: 'playbook', title: 'Playbook', subtitle: 'The guided selling engine — configure the quoting form', time: 20,
    talkingPoints: [
      'The Playbook is the form reps fill out to build a quote — every question drives what products, pricing, and documents appear',
      'Structure: Playbook → Question Groups → Questions. Think of QGs as sections, questions as fields',
      'Question types: Text, Number, Dropdown, Date, Checkbox, Multi-select, Manual Item, Repeatable',
      'Presentation Rules control when a Question Group shows — e.g., only show "Enterprise Terms" QG if deal value > $100K',
      'Conditional Answers: a dropdown answer can trigger a follow-up question — builds dynamic, logic-driven flows',
      'Mandatory questions prevent reps from submitting incomplete quotes',
      'Answer Mappings let you map a Playbook answer to a CRM field — bi-directional sync',
    ],
    demoSteps: [
      'Open the Playbook editor — show the QG list on the left, question editor on the right',
      'Create a new Question Group called "Deal Info" — show the Display Name, Internal Name fields',
      'Add a Dropdown question: "Opportunity Type" with answers: New Business, Renewal, Expansion',
      'Add a Presentation Rule to another QG — show it only when Opportunity Type = Enterprise',
      'Show a Conditional Answer: if Opportunity Type = Renewal, show a "Contract Start Date" question',
      'Mark a question as Mandatory — show the validation error when reps try to skip it',
    ],
    keyTerms: [
      { term: 'Question Group (QG)', def: 'A section of the Playbook form. Can be shown/hidden based on rules' },
      { term: 'Presentation Rule', def: 'A condition that controls when a QG is visible — built with IF/AND/OR logic' },
      { term: 'Conditional Answer', def: 'An answer that triggers additional questions or changes downstream behavior' },
      { term: 'Answer Mapping', def: 'Links a Playbook question to a CRM field — keeps Salesforce in sync' },
      { term: '[PB.QuestionName]', def: 'Syntax to reference a Playbook answer anywhere in DealHub (pricing, docs, approvals)' },
    ],
    screenshots: [
      { src: '/slides/playbook.png', caption: 'Playbook in Sales Mode — General Questions QG with Opportunity Type, Start Date, Duration, and Product Family' },
    ],
  },
  {
    id: 'products', title: 'Products', subtitle: 'Catalog, pricing, assignment rules, and bundles', time: 20,
    talkingPoints: [
      'Products in DealHub are your SKUs — they live in Product Families and get assigned to quotes based on Playbook answers',
      'Three attribute types: Product Attributes (internal metadata), Proposal Attributes (displayed on quotes), Product Factors (used in pricing formulas)',
      'Assignment Rules determine which products auto-populate when a rep answers a Playbook question — e.g., if Product Family = Platform, add SKU-001',
      'Basic Pricing: set a fixed list price per SKU. Advanced Pricing: write a formula — if [PB.OppType] = "New Business" then 100 else 50',
      'Bundles: group products so selecting one adds others automatically — great for packages',
      'Bulk import from Excel: upload a CSV/XLSX to add hundreds of products in one go',
    ],
    demoSteps: [
      'Navigate to Products — show the product list and Family grouping',
      'Open one product: walk through the Attributes tab, Pricing tab, Assignment Rules tab',
      'Create a new product: fill in Name, SKU, Family, and set a list price',
      'Add an Assignment Rule: "assign this product when [PB.ProductFamily] includes Platform"',
      'Show Advanced Pricing: write a simple IF formula using [PB.OppType]',
      'Show a Bundle: click into a bundle product and show which child SKUs are included',
    ],
    keyTerms: [
      { term: 'Product Attribute', def: 'Internal metadata on a product (e.g., Category, Region) — not shown on quotes' },
      { term: 'Proposal Attribute', def: 'A field shown on the quote line (e.g., Description, Discount %) — visible to buyers' },
      { term: 'Product Factor', def: 'A numeric attribute used in pricing formulas — e.g., Quantity, Seat Count' },
      { term: 'Assignment Rule', def: 'Logic that auto-adds a product to the quote when a Playbook condition is met' },
      { term: 'Bundle', def: 'A parent product that auto-adds child products when selected' },
      { term: '[Item.FieldName]', def: 'Syntax to reference a product\'s attribute value in formulas or output documents' },
    ],
    screenshots: [
      { src: '/slides/products-list.png', caption: 'Product catalog — SKUs with Primary Tag (family), Price, Max Discount, and manual add flag' },
      { src: '/slides/products-add.png', caption: 'Add New Product dialog — SKU, Name, Attributes (e.g. Related Software), and manual add setting' },
    ],
  },
  {
    id: 'filtering', title: 'Hands-On: Product Filtering', subtitle: 'Live exercise — build a filtered product selection flow', time: 15,
    talkingPoints: [
      'Product Filtering lets reps search and select products from a filtered catalog — instead of all products appearing at once',
      'Two modes: Manual Item (rep types/searches for a product) and Filtered Catalog (products are filtered by attributes)',
      'Use case: a Hardware QG should only show hardware SKUs filtered by the Software product the rep already selected',
      'The filter connects a Product Attribute on one product to a Playbook answer — keeps selections coherent',
      'Important: you don\'t always need Guided Selling. Some orgs use DealHub purely for product filtering with no Playbook questions at all',
    ],
    demoSteps: [
      'Create a new QG called "Hardware" — set Presentation Rule: show when [PB.ProductFamily] includes "Hardware"',
      'Enable Product Filtering on this QG',
      'Set the filter source: filter Hardware products by the attribute that matches the Software selection',
      'Add a Question called "Item" — set Answer Type to "Manual Item"',
      'Add a Question called "Quantity" — set Answer Type to "Number"',
      'Go to Products → find a Hardware product → add Assignment Rule: [Item.SKU] = [PB.Item]',
      'Add Advanced Pricing to Hardware 2: IF [CRM.OpportunityType] = "New Business" THEN 100 ELSE 50',
      'Publish Draft and test in Sales mode — verify filtering works end-to-end',
    ],
    keyTerms: [
      { term: 'Manual Item', def: 'An answer type where the rep searches for and selects a product directly' },
      { term: 'Product Filter', def: 'A rule that narrows the product catalog shown to a rep based on a previous selection' },
      { term: '[CRM.FieldName]', def: 'Syntax to pull a field value directly from the CRM Opportunity into DealHub' },
    ],
    screenshots: [
      { src: '/slides/filtering-assignment.png', caption: 'Product Assignment Rule — [Item.sku] = [Hardware.manual_item] links the manual item question to the product catalog' },
      { src: '/slides/filtering-result.png', caption: 'End result in Sales Mode — Hardware QG with filtered product selection and full Product Summary with pricing' },
    ],
  },
  {
    id: 'pricing', title: 'List Price Factors & Discounts', subtitle: 'Dynamic pricing: volume tiers, geo, currency, discount tables', time: 15,
    talkingPoints: [
      'List Price Factors (LPFs) let you adjust the base price dynamically — no formulas needed for common patterns like volume tiers',
      'Volume LPF: 1-10 seats = $100/seat, 11-50 = $85/seat, 51+ = $70/seat — configured in a simple table, not code',
      'Geo Factors: charge different prices by region — UK customers pay in GBP at a different rate than US',
      'Special Factors: apply a multiplier based on any Playbook answer — e.g., Enterprise tier gets a 1.2x factor',
      'Discount Tables: define max discount tiers per role — AE can give up to 10%, manager up to 20%',
      'Currency: maintain rate tables in DealHub (or sync from CRM). All calculations happen in the deal currency',
    ],
    demoSteps: [
      'Open List Price Factors — show the Factors list',
      'Create a Volume Factor: add a table with quantity ranges and per-unit prices',
      'Attach the LPF to a product — show how the price changes as quantity increases in the quote',
      'Show a Discount Table — explain the columns: Role, Max %, Approval Required',
      'Show Currency settings — demonstrate how switching currency on a quote converts prices',
    ],
    keyTerms: [
      { term: 'List Price Factor (LPF)', def: 'A pricing rule that adjusts a product\'s base price based on a condition (volume, geography, tier)' },
      { term: 'Volume Factor', def: 'An LPF that uses quantity ranges to set tiered per-unit pricing' },
      { term: 'Geo Factor', def: 'An LPF that applies region-specific pricing adjustments' },
      { term: 'Discount Table', def: 'A matrix that defines max discount % per user role, with approval thresholds' },
      { term: 'CALCULATE_DISCOUNT_TABLE()', def: 'Function that applies your discount table rules to a line item automatically' },
    ],
    screenshots: [
      { src: '/slides/pricing.png', caption: 'Price Factors screen — Discount Tables, Geo Factors, Special Factors, Rounding, and Currency tabs' },
    ],
  },
  {
    id: 'approvals', title: 'Approval Workflows', subtitle: 'Automate discount control and deal governance', time: 15,
    talkingPoints: [
      'Two types: General Workflow (triggers on discount % thresholds) and Rule-Based (triggers on any condition)',
      'General Workflow example: any discount > 15% requires manager approval, > 25% requires VP Sales',
      'Rule-Based example: trigger approval when warranty is waived, payment terms are non-standard, or contract > 90 days out',
      'Parallel vs Sequential: multiple approvers can receive the request simultaneously, or in a defined order',
      'Validations: block the rep from submitting at all if a hard rule is violated — no approval, just a hard stop',
      'Approval Dashboard: managers see all pending requests in one view, can approve/reject with comments',
    ],
    demoSteps: [
      'Go to Approvals → General Workflow — show the discount threshold table',
      'Create a new threshold: if discount > 20% → route to VP Sales (by Position)',
      'Go to Rule-Based Workflows — show an existing rule, e.g., warranty waived',
      'Create a new rule: IF [Software.warranty] = "No" THEN require Manager approval',
      'Open the Approval Dashboard — show a pending request, approve it with a comment',
      'Show what the sales rep sees after submitting for approval — the pending status badge',
    ],
    keyTerms: [
      { term: 'General Workflow', def: 'Approval triggered by discount percentage — the most common approval type' },
      { term: 'Rule-Based Workflow', def: 'Approval triggered by any logical condition — payment terms, deal size, contract length, etc.' },
      { term: 'Validation', def: 'A hard block that prevents quote submission when a rule is violated' },
      { term: 'Approval Dashboard', def: 'A centralised view for managers to see, approve, or reject all pending quotes' },
      { term: 'Sequential Approval', def: 'Approvers are notified in order — the next approver only sees the request after the previous one approves' },
    ],
    screenshots: [
      { src: '/slides/approvals-rule.png', caption: 'Rule-Based Workflow config — trigger condition [Software.warranty] = "No", routed to Manager' },
      { src: '/slides/approvals-result.png', caption: 'Sales Mode — Product Summary with Approval Workflow section showing pending "Warranty" approval step' },
    ],
  },
  {
    id: 'docs', title: 'Output Documents', subtitle: 'Build professional proposals, order forms, and contracts', time: 15,
    talkingPoints: [
      'Output Documents are the PDFs sent to buyers — Proposal, Order Form, SOW, MSA — all built inside DealHub',
      'Building blocks: Text Sections, Pricing Tables, Signature Blocks, Headers/Footers, Cover Pages',
      'Dynamic parameters pull live values into the doc: [CRM.AccountName], [PB.ContractTerm], [Item.ListPrice]',
      'Conditional Sections: a block of text that only appears if a condition is true — e.g., show MSA terms only for deals > $25K',
      'Shared Elements: a pricing table built once and reused across multiple documents — change it once, updates everywhere',
      'Word Sub-documents: embed a .docx file (e.g., legal boilerplate) directly into the generated PDF',
    ],
    demoSteps: [
      'Open Output Documents — show the document list and types',
      'Open an existing Proposal — walk through the structure: Cover, Header, Body, Signature',
      'Show a Pricing Table — click into it to show [Item.ProductName], [Item.ListPrice], [Item.Quantity] fields',
      'Show a Conditional Section: text that appears only when [PB.OppType] = "New Business"',
      'Show a Shared Pricing Table — explain how it syncs across documents',
      'Preview the document — click "Preview" to see a rendered PDF with dummy data',
    ],
    keyTerms: [
      { term: 'Pricing Table', def: 'A dynamic table in a document that renders all quote line items with their prices' },
      { term: '[Item.FieldName]', def: 'Parameter that pulls a product attribute value into the document for each line item' },
      { term: 'Conditional Element', def: 'A document block that shows/hides based on a Playbook or CRM condition' },
      { term: 'Shared Element', def: 'A reusable document component (e.g., legal terms, pricing table) maintained in one place' },
      { term: 'Word Sub-document', def: 'An embedded .docx file that gets merged into the generated PDF output' },
    ],
    screenshots: [
      { src: '/slides/docs.png', caption: 'Output Document editor — conditional text section with rule [QG1.opp_type] = "New Business"' },
    ],
  },
  {
    id: 'dealroom', title: 'DealRoom', subtitle: 'The buyer experience — collaboration, signing, and deal intelligence', time: 10,
    talkingPoints: [
      'DealRoom is the buyer-facing workspace — a microsite the rep sends to the buyer instead of a PDF attachment',
      'Everything in one place: the proposal, videos, case studies, mutual action plan, e-signature',
      'Widgets: Documents, Video (Loom/YouTube), Calendar (Calendly), File Upload, Mutual Action Plan, Custom HTML',
      'Signing: configure who signs (buyer only, or multiple signers), in what order, and what triggers DocuSign',
      'DealStream: analytics showing who viewed the DealRoom, which pages they spent time on, and when',
    ],
    demoSteps: [
      'Open a DealRoom from the Deals section — show the buyer-facing view',
      'Show the widget palette — drag a Video widget and embed a Loom link',
      'Open DealRoom Settings — show signing rules, auto-join configuration',
      'Click DealStream — show the view analytics: pages visited, time on page, number of views',
      'Show a Mutual Action Plan widget — demonstrate adding milestones with due dates and owners',
    ],
    keyTerms: [
      { term: 'DealRoom', def: 'A personalised buyer workspace — replaces the email attachment with a live, trackable microsite' },
      { term: 'Widget', def: 'A modular content block inside the DealRoom — video, documents, calendar, HTML, etc.' },
      { term: 'DealStream', def: 'Engagement analytics — shows exactly how the buyer interacted with the DealRoom' },
      { term: 'Mutual Action Plan', def: 'A shared project plan inside the DealRoom — aligns buyer and seller on next steps' },
    ],
    screenshots: [
      { src: '/slides/docs.png', caption: 'Output Documents editor — proposals and contracts are built here and sent to buyers via the DealRoom workspace' },
    ],
  },
  {
    id: 'next', title: 'Next Steps', subtitle: 'Implementation journey and resources', time: 5,
    talkingPoints: [
      'Phase 1 (Weeks 1-2): Salesforce integration, user setup, system settings, first Draft version',
      'Phase 2 (Weeks 3-5): Playbook build, product catalog import, basic pricing',
      'Phase 3 (Weeks 6-8): approval workflows, output documents, DealRoom templates',
      'Phase 4 (Week 9-10): UAT in sandbox, rep training, go-live',
      'Resources: DealHub Academy (academy.dealhub.io) — complete the Essential Admin learning path before kickoff',
      'Support: support.dealhub.io — knowledge base and ticket submission',
    ],
    demoSteps: [
      'Show DealHub Academy — navigate to the Essential Admin learning path',
      'Show the Support portal — demonstrate how to submit a ticket',
      'Share the implementation timeline document',
    ],
    keyTerms: [
      { term: 'Essential Admin Learning Path', def: 'The recommended Academy sequence for new admins before go-live' },
      { term: 'UAT', def: 'User Acceptance Testing — the admin validates the full config in sandbox before going live' },
      { term: 'Go-Live', def: 'The moment your DealHub configuration is published to production and reps start quoting' },
    ],
    screenshots: [
      { src: '/slides/approvals-result.png', caption: 'A fully configured DealHub in Sales Mode — products, pricing, and approvals all live — what your system will look like at go-live' },
    ],
  },
];

const TOTAL_TIME = MODULES.reduce((s, m) => s + m.time, 0);
type Tab = 'points' | 'demo' | 'terms' | 'screenshots';

export default function OverviewPage() {
  const [activeModule, setActiveModule] = useState(0);
  const [tab, setTab] = useState<Tab>('points');
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [elapsed, setElapsed] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const module = MODULES[activeModule];
  const progress = (completedModules.size / MODULES.length) * 100;
  const elapsedMins = Math.floor(elapsed / 60);
  const elapsedSecs = elapsed % 60;

  useEffect(() => {
    if (!timerRunning) return;
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [timerRunning]);

  const navigate = useCallback((dir: 1 | -1) => {
    setActiveModule(i => {
      const next = Math.max(0, Math.min(MODULES.length - 1, i + dir));
      if (next !== i) setTab('points');
      return next;
    });
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') navigate(1);
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') navigate(-1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  const markDone = () => {
    setCompletedModules(prev => { const n = new Set(prev); n.add(activeModule); return n; });
    if (activeModule < MODULES.length - 1) navigate(1);
  };

  const toggleTerm = (term: string) => {
    setExpandedTerms(prev => { const n = new Set(prev); n.has(term) ? n.delete(term) : n.add(term); return n; });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const facilitatorTabs = [
    { id: 'points' as Tab, label: 'Talking Points' },
    { id: 'demo' as Tab, label: 'Demo Steps' },
    { id: 'terms' as Tab, label: `Key Terms (${module.keyTerms.length})` },
    ...(module.screenshots?.length ? [{ id: 'screenshots' as Tab, label: `Screenshots (${module.screenshots.length})` }] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: BG, fontFamily: 'system-ui,-apple-system,sans-serif', color: TEXT }}>

      {/* ── Header ── */}
      <header className="px-5 py-3 flex items-center justify-between sticky top-0 z-20 border-b" style={{ backgroundColor: BG_CARD, borderColor: BORDER }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold" style={{ backgroundColor: ACCENT, color: BG }}>d</div>
          <span className="font-semibold text-sm">dealhub <span style={{ color: ACCENT }}>ai</span></span>
          <span className="text-xs hidden sm:inline" style={{ color: TEXT_MUTED }}>— Overview Session</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-2">
            <div className="w-28 h-1 rounded-full overflow-hidden" style={{ backgroundColor: BORDER }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: ACCENT }} />
            </div>
            <span className="text-xs" style={{ color: TEXT_MUTED }}>{completedModules.size}/{MODULES.length}</span>
          </div>

          <button onClick={() => setTimerRunning(r => !r)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all"
            style={{ border: `1px solid ${timerRunning ? ACCENT : BORDER}`, color: timerRunning ? ACCENT : TEXT_MUTED, backgroundColor: timerRunning ? ACCENT_DIM : 'transparent' }}>
            <span className={timerRunning ? 'animate-pulse' : ''}>{timerRunning ? '●' : '○'}</span>
            {String(elapsedMins).padStart(2,'0')}:{String(elapsedSecs).padStart(2,'0')}
          </button>

          <button onClick={copyLink}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ border: `1px solid ${copied ? ACCENT : BORDER}`, color: copied ? ACCENT : TEXT_MUTED, backgroundColor: copied ? ACCENT_DIM : 'transparent' }}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {copied ? 'Copied!' : 'Share'}
          </button>

        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ── */}
        <aside className="w-56 flex-shrink-0 overflow-y-auto border-r py-3" style={{ backgroundColor: BG_CARD, borderColor: BORDER }}>
          {MODULES.map((m, i) => {
            const done = completedModules.has(i);
            const active = i === activeModule;
            return (
              <button key={m.id} onClick={() => { setActiveModule(i); setTab('points'); }}
                className="w-full text-left px-4 py-2.5 flex items-start gap-3 transition-all"
                style={{ backgroundColor: active ? ACCENT_DIM : 'transparent', borderLeft: `3px solid ${active ? ACCENT : 'transparent'}` }}>
                <div className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: done ? ACCENT : active ? ACCENT : BORDER, color: (done || active) ? BG : TEXT_MUTED }}>
                  {done ? '✓' : i + 1}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate" style={{ color: active ? ACCENT : TEXT }}>{m.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: TEXT_MUTED }}>{m.time} min</p>
                </div>
              </button>
            );
          })}
        </aside>

        {/* ── Main ── */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-7">

            {/* Module header */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>
                  {activeModule + 1} of {MODULES.length}
                </span>
                <span style={{ color: BORDER }}>·</span>
                <span className="text-xs" style={{ color: TEXT_MUTED }}>{module.time} min</span>
                {completedModules.has(activeModule) && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: ACCENT_DIM, color: ACCENT }}>Done ✓</span>
                )}
              </div>
              <h1 className="text-2xl font-bold">{module.title}</h1>
              <p className="mt-0.5 text-sm" style={{ color: TEXT_MUTED }}>{module.subtitle}</p>
            </div>

            <>
              {/* content */}
                <div className="flex gap-1 mb-5 p-1 rounded-xl w-fit" style={{ backgroundColor: BG_CARD2 }}>
                  {facilitatorTabs.map(({ id, label }) => (
                    <button key={id} onClick={() => setTab(id)}
                      className="px-4 py-1.5 text-sm font-medium rounded-lg transition-all"
                      style={{ backgroundColor: tab === id ? BG_CARD : 'transparent', color: tab === id ? ACCENT : TEXT_MUTED, borderBottom: tab === id ? `2px solid ${ACCENT}` : '2px solid transparent' }}>
                      {label}
                    </button>
                  ))}
                </div>

                {tab === 'points' && (
                  <div className="space-y-3">
                    {module.talkingPoints.map((point, i) => (
                      <div key={i} className="flex gap-3 p-4 rounded-xl border" style={{ backgroundColor: BG_CARD, borderColor: BORDER }}>
                        <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5" style={{ backgroundColor: ACCENT, color: BG }}>{i + 1}</div>
                        <p className="text-sm leading-relaxed">{point}</p>
                      </div>
                    ))}
                  </div>
                )}

                {tab === 'demo' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 rounded-lg mb-2" style={{ backgroundColor: ACCENT_DIM, border: `1px solid ${ACCENT}30` }}>
                      <svg className="w-4 h-4 flex-shrink-0" style={{ color: ACCENT }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs font-medium" style={{ color: ACCENT }}>Use the dealhub_cs overview environment. Make changes in a Draft version.</p>
                    </div>
                    {module.demoSteps.map((step, i) => (
                      <div key={i} className="flex gap-3 p-4 rounded-xl border" style={{ backgroundColor: BG_CARD, borderColor: BORDER }}>
                        <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5" style={{ border: `2px solid ${ACCENT}`, color: ACCENT }}>{i + 1}</div>
                        <p className="text-sm leading-relaxed">{step}</p>
                      </div>
                    ))}
                  </div>
                )}

                {tab === 'terms' && (
                  <div className="space-y-2">
                    {module.keyTerms.map(({ term, def }) => {
                      const open = expandedTerms.has(term);
                      return (
                        <button key={term} onClick={() => toggleTerm(term)}
                          className="w-full text-left p-4 rounded-xl border transition-all"
                          style={{ backgroundColor: BG_CARD, borderColor: open ? ACCENT : BORDER }}>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold font-mono" style={{ color: ACCENT }}>{term}</span>
                            <svg className="w-4 h-4 flex-shrink-0 transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none', color: TEXT_MUTED }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                          {open && <p className="mt-2 text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>{def}</p>}
                        </button>
                      );
                    })}
                  </div>
                )}

                {tab === 'screenshots' && (
                  <div className="space-y-4">
                    {(module.screenshots || []).map(({ src, caption }) => (
                      <div key={src} className="rounded-xl overflow-hidden border" style={{ borderColor: BORDER }}>
                        <img src={src} alt={caption} className="w-full object-contain" style={{ backgroundColor: '#f8fafc' }} />
                        <div className="px-4 py-2.5" style={{ backgroundColor: BG_CARD }}>
                          <p className="text-xs" style={{ color: TEXT_MUTED }}>{caption}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </>

            {/* ── Navigation ── */}
            <div className="flex items-center justify-between mt-8 pt-5 border-t" style={{ borderColor: BORDER }}>
              <button onClick={() => navigate(-1)} disabled={activeModule === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-30 transition-all"
                style={{ border: `1px solid ${BORDER}`, color: TEXT_MUTED }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Previous
              </button>

              <button onClick={markDone}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{ backgroundColor: completedModules.has(activeModule) ? ACCENT_DIM : ACCENT, color: completedModules.has(activeModule) ? ACCENT : BG, border: `1px solid ${ACCENT}` }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                {completedModules.has(activeModule) ? 'Done ✓' : activeModule === MODULES.length - 1 ? 'Finish' : 'Done & Next'}
                {!completedModules.has(activeModule) && activeModule < MODULES.length - 1 && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                )}
              </button>
            </div>

            <p className="text-xs text-center mt-3" style={{ color: BORDER }}>← → arrow keys to navigate</p>
          </div>
        </main>

        {/* ── Right panel ── */}
        <aside className="hidden xl:flex flex-col w-48 border-l p-4 flex-shrink-0" style={{ backgroundColor: BG_CARD, borderColor: BORDER }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: TEXT_MUTED }}>Session Map</p>
            <div className="space-y-2 flex-1">
              {MODULES.map((m, i) => {
                const done = completedModules.has(i);
                const active = i === activeModule;
                return (
                  <div key={m.id} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: done || active ? ACCENT : BORDER }} />
                    <span className="text-xs truncate" style={{ color: active ? ACCENT : done ? ACCENT : TEXT_MUTED }}>{m.title}</span>
                    <span className="text-xs ml-auto flex-shrink-0" style={{ color: BORDER }}>{m.time}m</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 space-y-1" style={{ borderTop: `1px solid ${BORDER}` }}>
              <p className="text-xs" style={{ color: TEXT_MUTED }}>Total: {TOTAL_TIME} min</p>
              <p className="text-xs" style={{ color: TEXT_MUTED }}>Done: {Array.from(completedModules).reduce((s, i) => s + MODULES[i].time, 0)} min</p>
            </div>
          </aside>
      </div>
    </div>
  );
}
