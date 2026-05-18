'use client';

import { useState, useEffect, useCallback } from 'react';

const ACCENT = '#4ade80';
const ACCENT_DIM = 'rgba(74,222,128,0.15)';
const BG = '#0d1a27';
const BG_CARD = '#162332';
const BORDER = '#1e3346';
const TEXT = '#ffffff';
const TEXT_MUTED = '#7a9bb5';

interface KeyTerm { term: string; def: string; }
interface Module {
  id: string;
  title: string;
  subtitle: string;
  time: number;
  talkingPoints: string[];
  demoSteps: string[];
  keyTerms: KeyTerm[];
  screenshots?: { src: string; caption: string }[];
}

// Shared module data — client sees concepts + screenshots only
const MODULES: Module[] = [
  {
    id: 'intro', title: 'Welcome & Overview', subtitle: 'What is DealHub and why it matters', time: 5,
    talkingPoints: ['DealHub is a CPQ platform that lives inside your CRM — reps never leave Salesforce to build a quote', 'Three pillars: CPQ (quoting engine), DealRoom (buyer collaboration workspace), CLM (contract management)', 'The problem we solve: manual quoting in spreadsheets causes pricing errors, approval delays, and inconsistent buyer experiences', 'Today we\'ll walk through the full admin backend — by the end you\'ll know how every module connects'],
    demoSteps: [], keyTerms: [
      { term: 'CPQ', def: 'Configure, Price, Quote — the engine that guides reps through building an accurate quote' },
      { term: 'DealRoom', def: 'A buyer-facing digital workspace where quotes are shared, negotiated, and signed' },
      { term: 'Playbook', def: 'The guided selling form — the heart of DealHub. Every quote starts here' },
      { term: 'Version', def: 'A configuration snapshot. You work in Draft, then publish to Live' },
    ],
  },
  {
    id: 'users', title: 'User Management', subtitle: 'Users, roles, profiles, and permissions', time: 10,
    talkingPoints: ['Users are synced from your CRM automatically', 'Two primary roles: Admin (full config access) and Sales (quote creation only)', 'Admin Profiles let you create permission tiers — e.g., a "Deal Desk" profile that can override pricing but can\'t edit the Playbook', 'Positions define the reporting hierarchy — critical for approval routing', 'Impersonation: admins can log in as any user to test their exact experience'],
    demoSteps: [], keyTerms: [
      { term: 'Admin Profile', def: 'A named permission set assigned to users — controls what they can edit, override, or view' },
      { term: 'Position', def: 'The user\'s place in the org hierarchy. Determines who their manager is for approval routing' },
      { term: 'Impersonation', def: 'Admin ability to temporarily act as another user — essential for troubleshooting' },
      { term: 'User Group', def: 'A collection of users that can share permissions, pricing, or document templates' },
    ],
    screenshots: [{ src: '/slides/users.png', caption: 'User Management — user list synced from CRM, showing Roles, Positions, and Admin Profiles' }],
  },
  {
    id: 'versions', title: 'Version Management', subtitle: 'Draft vs Live — working safely in DealHub', time: 5,
    talkingPoints: ['Every change in DealHub happens in a Draft version — your Live environment is never touched until you publish', 'You can have multiple Draft versions in progress simultaneously', 'When you\'re ready, you publish Draft → Live. Active quotes on the old version continue unaffected', 'Best practice: always create a new Draft before any config work'],
    demoSteps: [], keyTerms: [
      { term: 'Draft', def: 'A working copy of your configuration — safe to edit, not visible to sales reps' },
      { term: 'Live', def: 'The active published version — what sales reps see when they open DealHub' },
      { term: 'Publish', def: 'The action of promoting a Draft to Live, making changes visible to the sales team' },
    ],
  },
  {
    id: 'playbook', title: 'Playbook', subtitle: 'The guided selling engine', time: 20,
    talkingPoints: ['The Playbook is the form reps fill out to build a quote — every question drives what products, pricing, and documents appear', 'Structure: Playbook → Question Groups → Questions', 'Question types: Text, Number, Dropdown, Date, Checkbox, Multi-select', 'Presentation Rules control when a Question Group shows', 'Conditional Answers build dynamic, logic-driven flows', 'Mandatory questions prevent reps from submitting incomplete quotes'],
    demoSteps: [], keyTerms: [
      { term: 'Question Group (QG)', def: 'A section of the Playbook form. Can be shown/hidden based on rules' },
      { term: 'Presentation Rule', def: 'A condition that controls when a QG is visible — built with IF/AND/OR logic' },
      { term: 'Conditional Answer', def: 'An answer that triggers additional questions or changes downstream behavior' },
      { term: '[PB.QuestionName]', def: 'Syntax to reference a Playbook answer anywhere in DealHub (pricing, docs, approvals)' },
    ],
    screenshots: [{ src: '/slides/playbook.png', caption: 'Playbook in Sales Mode — General Questions QG with Opportunity Type, Start Date, Duration, and Product Family' }],
  },
  {
    id: 'products', title: 'Products', subtitle: 'Catalog, pricing, assignment rules, and bundles', time: 20,
    talkingPoints: ['Products in DealHub are your SKUs — they live in Product Families and get assigned to quotes based on Playbook answers', 'Three attribute types: Product Attributes, Proposal Attributes, Product Factors', 'Assignment Rules determine which products auto-populate when a rep answers a Playbook question', 'Basic Pricing: set a fixed list price. Advanced Pricing: write a formula', 'Bulk import from Excel — upload a CSV/XLSX to add hundreds of products in one go'],
    demoSteps: [], keyTerms: [
      { term: 'Product Attribute', def: 'Internal metadata on a product (e.g., Category, Region) — not shown on quotes' },
      { term: 'Proposal Attribute', def: 'A field shown on the quote line (e.g., Description, Discount %) — visible to buyers' },
      { term: 'Assignment Rule', def: 'Logic that auto-adds a product to the quote when a Playbook condition is met' },
      { term: '[Item.FieldName]', def: 'Syntax to reference a product\'s attribute value in formulas or output documents' },
    ],
    screenshots: [
      { src: '/slides/products-list.png', caption: 'Product catalog — SKUs with Primary Tag (family), Price, Max Discount, and manual add flag' },
      { src: '/slides/products-add.png', caption: 'Add New Product dialog — SKU, Name, Attributes, and manual add setting' },
    ],
  },
  {
    id: 'filtering', title: 'Hands-On: Product Filtering', subtitle: 'Live exercise — filtered product selection', time: 15,
    talkingPoints: ['Product Filtering lets reps search and select products from a filtered catalog', 'Use case: a Hardware QG should only show hardware SKUs filtered by the Software product the rep already selected', 'The filter connects a Product Attribute on one product to a Playbook answer'],
    demoSteps: [], keyTerms: [
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
    talkingPoints: ['List Price Factors let you adjust the base price dynamically — no formulas needed for common patterns like volume tiers', 'Volume LPF: 1-10 seats = $100/seat, 11-50 = $85/seat, 51+ = $70/seat', 'Geo Factors: charge different prices by region', 'Discount Tables: define max discount tiers per role'],
    demoSteps: [], keyTerms: [
      { term: 'List Price Factor (LPF)', def: 'A pricing rule that adjusts a product\'s base price based on a condition (volume, geography, tier)' },
      { term: 'Volume Factor', def: 'An LPF that uses quantity ranges to set tiered per-unit pricing' },
      { term: 'Discount Table', def: 'A matrix that defines max discount % per user role, with approval thresholds' },
    ],
    screenshots: [{ src: '/slides/pricing.png', caption: 'Price Factors screen — Discount Tables, Geo Factors, Special Factors, Rounding, and Currency tabs' }],
  },
  {
    id: 'approvals', title: 'Approval Workflows', subtitle: 'Automate discount control and deal governance', time: 15,
    talkingPoints: ['Two types: General Workflow (triggers on discount % thresholds) and Rule-Based (triggers on any condition)', 'General Workflow example: any discount > 15% requires manager approval, > 25% requires VP Sales', 'Rule-Based example: trigger approval when warranty is waived or payment terms are non-standard', 'Approval Dashboard: managers see all pending requests in one view'],
    demoSteps: [], keyTerms: [
      { term: 'General Workflow', def: 'Approval triggered by discount percentage — the most common approval type' },
      { term: 'Rule-Based Workflow', def: 'Approval triggered by any logical condition — payment terms, deal size, contract length, etc.' },
      { term: 'Validation', def: 'A hard block that prevents quote submission when a rule is violated' },
      { term: 'Approval Dashboard', def: 'A centralised view for managers to see, approve, or reject all pending quotes' },
    ],
    screenshots: [
      { src: '/slides/approvals-rule.png', caption: 'Rule-Based Workflow config — trigger condition [Software.warranty] = "No", routed to Manager' },
      { src: '/slides/approvals-result.png', caption: 'Sales Mode — Product Summary with Approval Workflow section showing pending "Warranty" approval step' },
    ],
  },
  {
    id: 'docs', title: 'Output Documents', subtitle: 'Build professional proposals, order forms, and contracts', time: 15,
    talkingPoints: ['Output Documents are the PDFs sent to buyers — Proposal, Order Form, SOW, MSA — all built inside DealHub', 'Dynamic parameters pull live values into the doc: [CRM.AccountName], [PB.ContractTerm], [Item.ListPrice]', 'Conditional Sections: a block of text that only appears if a condition is true', 'Shared Elements: a pricing table built once and reused across multiple documents'],
    demoSteps: [], keyTerms: [
      { term: 'Pricing Table', def: 'A dynamic table in a document that renders all quote line items with their prices' },
      { term: '[Item.FieldName]', def: 'Parameter that pulls a product attribute value into the document for each line item' },
      { term: 'Conditional Element', def: 'A document block that shows/hides based on a Playbook or CRM condition' },
    ],
    screenshots: [{ src: '/slides/docs.png', caption: 'Output Document editor — conditional text section with rule [QG1.opp_type] = "New Business"' }],
  },
  {
    id: 'dealroom', title: 'DealRoom', subtitle: 'The buyer experience — collaboration, signing, and deal intelligence', time: 10,
    talkingPoints: ['DealRoom is the buyer-facing workspace — a microsite the rep sends to the buyer instead of a PDF attachment', 'Everything in one place: the proposal, videos, case studies, mutual action plan, e-signature', 'DealStream analytics show who viewed the DealRoom and which pages they spent time on'],
    demoSteps: [], keyTerms: [
      { term: 'DealRoom', def: 'A personalised buyer workspace — replaces the email attachment with a live, trackable microsite' },
      { term: 'Widget', def: 'A modular content block inside the DealRoom — video, documents, calendar, HTML, etc.' },
      { term: 'DealStream', def: 'Engagement analytics — shows exactly how the buyer interacted with the DealRoom' },
    ],
  },
  {
    id: 'next', title: 'Next Steps', subtitle: 'Implementation journey and resources', time: 5,
    talkingPoints: ['Phase 1 (Weeks 1-2): Salesforce integration, user setup, system settings', 'Phase 2 (Weeks 3-5): Playbook build, product catalog import, basic pricing', 'Phase 3 (Weeks 6-8): approval workflows, output documents, DealRoom templates', 'Phase 4 (Week 9-10): UAT in sandbox, rep training, go-live'],
    demoSteps: [], keyTerms: [
      { term: 'Essential Admin Learning Path', def: 'The recommended Academy sequence for new admins before go-live' },
      { term: 'UAT', def: 'User Acceptance Testing — the admin validates the full config in sandbox before going live' },
    ],
  },
];

export default function ClientPage() {
  const [activeModule, setActiveModule] = useState(0);
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set());
  const [questions, setQuestions] = useState<string[]>([]);
  const [newQuestion, setNewQuestion] = useState('');

  // Read module from URL param on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const m = parseInt(params.get('m') || '0', 10);
    if (!isNaN(m) && m >= 0 && m < MODULES.length) setActiveModule(m);
  }, []);

  const navigate = useCallback((dir: 1 | -1) => {
    setActiveModule(i => Math.max(0, Math.min(MODULES.length - 1, i + dir)));
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight') navigate(1);
      if (e.key === 'ArrowLeft') navigate(-1);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  const toggleTerm = (term: string) => {
    setExpandedTerms(prev => {
      const next = new Set(prev);
      if (next.has(term)) next.delete(term);
      else next.add(term);
      return next;
    });
  };

  const addQuestion = () => {
    if (newQuestion.trim()) {
      setQuestions(q => [...q, newQuestion.trim()]);
      setNewQuestion('');
    }
  };

  const module = MODULES[activeModule];
  const progress = ((activeModule + 1) / MODULES.length) * 100;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: BG, fontFamily: 'system-ui, -apple-system, sans-serif', color: TEXT }}>

      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b" style={{ backgroundColor: BG_CARD, borderColor: BORDER }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold" style={{ backgroundColor: ACCENT, color: '#0d1a27' }}>d</div>
          <div>
            <span className="font-semibold text-sm">dealhub <span style={{ color: ACCENT }}>ai</span></span>
            <span className="ml-2 text-xs" style={{ color: TEXT_MUTED }}>Overview Session</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-40 h-1 rounded-full overflow-hidden" style={{ backgroundColor: BORDER }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: ACCENT }} />
          </div>
          <span className="text-xs" style={{ color: TEXT_MUTED }}>{activeModule + 1} / {MODULES.length}</span>
        </div>
      </header>

      {/* Module nav pills */}
      <div className="px-6 py-3 flex gap-2 overflow-x-auto border-b" style={{ borderColor: BORDER, backgroundColor: BG_CARD }}>
        {MODULES.map((m, i) => (
          <button
            key={m.id}
            onClick={() => setActiveModule(i)}
            className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all"
            style={{
              backgroundColor: i === activeModule ? ACCENT : 'transparent',
              color: i === activeModule ? '#0d1a27' : TEXT_MUTED,
              border: `1px solid ${i === activeModule ? ACCENT : BORDER}`,
            }}
          >
            {m.title}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

          {/* Module header */}
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>
              {activeModule + 1} of {MODULES.length} · {module.time} min
            </span>
            <h1 className="text-3xl font-bold mt-1" style={{ color: TEXT }}>{module.title}</h1>
            <p className="mt-1 text-lg" style={{ color: TEXT_MUTED }}>{module.subtitle}</p>
          </div>

          {/* What you'll learn */}
          <div className="rounded-xl p-5 border" style={{ backgroundColor: BG_CARD, borderColor: BORDER }}>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: ACCENT }}>What we cover</h2>
            <ul className="space-y-2.5">
              {module.talkingPoints.map((p, i) => (
                <li key={i} className="flex gap-3 text-sm leading-relaxed" style={{ color: TEXT }}>
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: ACCENT }} />
                  {p}
                </li>
              ))}
            </ul>
          </div>

          {/* Screenshots */}
          {module.screenshots?.map(({ src, caption }) => (
            <div key={src} className="rounded-xl overflow-hidden border" style={{ borderColor: BORDER }}>
              <img src={src} alt={caption} className="w-full object-contain" style={{ backgroundColor: '#f8fafc' }} />
              <div className="px-4 py-3" style={{ backgroundColor: BG_CARD }}>
                <p className="text-xs" style={{ color: TEXT_MUTED }}>{caption}</p>
              </div>
            </div>
          ))}

          {/* Key terms */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: ACCENT }}>Key Terms</h2>
            <div className="space-y-2">
              {module.keyTerms.map(({ term, def }) => {
                const open = expandedTerms.has(term);
                return (
                  <button
                    key={term}
                    onClick={() => toggleTerm(term)}
                    className="w-full text-left p-4 rounded-xl border transition-all"
                    style={{ backgroundColor: BG_CARD, borderColor: open ? ACCENT : BORDER }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold font-mono" style={{ color: ACCENT }}>{term}</span>
                      <svg className="w-4 h-4 flex-shrink-0 transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none', color: TEXT_MUTED }}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    {open && <p className="mt-2 text-sm leading-relaxed" style={{ color: TEXT_MUTED }}>{def}</p>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Questions box */}
          <div className="rounded-xl p-5 border" style={{ backgroundColor: BG_CARD, borderColor: BORDER }}>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: ACCENT }}>Questions & Notes</h2>
            {questions.length > 0 && (
              <ul className="mb-3 space-y-2">
                {questions.map((q, i) => (
                  <li key={i} className="flex gap-2 text-sm" style={{ color: TEXT }}>
                    <span style={{ color: ACCENT }}>Q{i + 1}.</span> {q}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newQuestion}
                onChange={e => setNewQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addQuestion()}
                placeholder="Type a question or note..."
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{ backgroundColor: '#0d1a27', border: `1px solid ${BORDER}`, color: TEXT }}
              />
              <button
                onClick={addQuestion}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                style={{ backgroundColor: ACCENT, color: '#0d1a27' }}
              >
                Add
              </button>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-2">
            <button
              onClick={() => navigate(-1)}
              disabled={activeModule === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-30"
              style={{ border: `1px solid ${BORDER}`, color: TEXT_MUTED }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
            <button
              onClick={() => navigate(1)}
              disabled={activeModule === MODULES.length - 1}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-30"
              style={{ backgroundColor: ACCENT, color: '#0d1a27' }}
            >
              Next
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <p className="text-xs text-center pb-4" style={{ color: BORDER }}>← → arrow keys to navigate</p>
        </div>
      </div>
    </div>
  );
}
