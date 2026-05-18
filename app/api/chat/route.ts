import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { DealHubWebClient } from '@/lib/web-dealhub-client';

export const maxDuration = 300;

// ── Playbook in-memory cache per session ─────────────────────────────────────
// Lives for the Node.js process lifetime — fine for local/dev use.
const playbookCache = new Map<string, Record<string, unknown>>();

// ── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'list_versions',
    description: 'List all draft/active versions on the DealHub tenant. Returns [{guid, name, status}]. Call this first to find the right version GUID.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'list_playbooks',
    description: 'List all playbooks in a given version. Returns [{guid, name}].',
    input_schema: {
      type: 'object',
      properties: {
        versionGuid: { type: 'string', description: 'Version GUID from list_versions.' },
      },
      required: ['versionGuid'],
    },
  },
  {
    name: 'playbook_load',
    description: 'Load a playbook into session memory by its GUID. Must call this before any mutation or summary tool. The playbook stays loaded for all subsequent tool calls in this conversation turn.',
    input_schema: {
      type: 'object',
      properties: {
        playbookGuid: { type: 'string', description: 'Playbook GUID from list_playbooks.' },
      },
      required: ['playbookGuid'],
    },
  },
  {
    name: 'playbook_summary',
    description: 'Return a compact overview of the loaded playbook: group names, group kinds (regular/repeatable), and question names+types. No network call needed — uses in-memory state.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'playbook_inspect_group',
    description: 'Return the full JSON for one group from the loaded playbook, including all question details.',
    input_schema: {
      type: 'object',
      properties: {
        groupName: { type: 'string', description: 'Exact group name (case-sensitive).' },
      },
      required: ['groupName'],
    },
  },
  {
    name: 'playbook_inspect_question',
    description: 'Return the full JSON for one question. Use "Group.Question" notation if the same question name exists in multiple groups.',
    input_schema: {
      type: 'object',
      properties: {
        questionName: { type: 'string', description: 'Question name, optionally "Group.Question" form.' },
      },
      required: ['questionName'],
    },
  },
  {
    name: 'group_create',
    description: 'Add a new question group to the loaded playbook.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Internal group name (no spaces, use underscores).' },
        displayedName: { type: 'string', description: 'Label shown in the UI.' },
        kind: { type: 'string', enum: ['regular', 'repeatable'], description: 'regular = Q&A style, repeatable = table of rows (e.g. product lines).' },
      },
      required: ['name', 'displayedName', 'kind'],
    },
  },
  {
    name: 'group_delete',
    description: 'Delete a group from the loaded playbook.',
    input_schema: {
      type: 'object',
      properties: {
        groupName: { type: 'string' },
      },
      required: ['groupName'],
    },
  },
  {
    name: 'question_create',
    description: 'Add a question to a group in the loaded playbook.',
    input_schema: {
      type: 'object',
      properties: {
        groupName: { type: 'string', description: 'Target group name.' },
        name: { type: 'string', description: 'Internal question ID (no spaces, use underscores).' },
        label: { type: 'string', description: 'Question text shown to the rep.' },
        type: {
          type: 'string',
          enum: ['text', 'text_list', 'numeric', 'date', 'date_formula', 'calculated', 'textarea'],
          description: 'Question type.',
        },
        textListValues: { type: 'array', items: { type: 'string' }, description: 'For text_list: dropdown options (exact values).' },
        textListDefault: { type: 'string', description: 'For text_list: default selected value (must be in textListValues).' },
        numericMin: { type: 'number', description: 'For numeric: minimum value (omit for unbounded).' },
        numericMax: { type: 'number', description: 'For numeric: maximum value (omit for unbounded).' },
        formula: { type: 'string', description: 'For date_formula / calculated: the formula expression.' },
        isMandatory: { type: 'boolean', description: 'Whether the field is required.' },
        defaultValue: { type: 'string', description: 'Default value (for text / textarea).' },
      },
      required: ['groupName', 'name', 'label', 'type'],
    },
  },
  {
    name: 'question_delete',
    description: 'Delete a question from the loaded playbook.',
    input_schema: {
      type: 'object',
      properties: {
        questionName: { type: 'string', description: 'Question name (use "Group.Question" if ambiguous).' },
      },
      required: ['questionName'],
    },
  },
  {
    name: 'question_set_hidden_rule',
    description: 'Set a Hide rule on a question. Use DealHub rule syntax, e.g. "[Group.Question] == \\"Yes\\"".',
    input_schema: {
      type: 'object',
      properties: {
        questionName: { type: 'string' },
        rule: { type: 'string', description: 'DealHub rule expression. "true" = always hidden, "false" = never hidden.' },
      },
      required: ['questionName', 'rule'],
    },
  },
  {
    name: 'question_set_readonly_rule',
    description: 'Set a Read-only rule on a question.',
    input_schema: {
      type: 'object',
      properties: {
        questionName: { type: 'string' },
        rule: { type: 'string', description: 'DealHub rule expression. "true" = always read-only.' },
      },
      required: ['questionName', 'rule'],
    },
  },
  {
    name: 'question_set_presentation_rule',
    description: 'Set a "Define question: If" presentation rule. The question only shows when the rule is true. Pass null to clear and always show.',
    input_schema: {
      type: 'object',
      properties: {
        questionName: { type: 'string' },
        rule: { type: 'string', description: 'DealHub rule expression, or null to always show.' },
      },
      required: ['questionName', 'rule'],
    },
  },
  {
    name: 'playbook_save',
    description: 'Persist the loaded (and mutated) playbook back to DealHub. Always call this after making changes.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
];

// ── Playbook mutation helpers (pure, no external deps) ────────────────────────

function findGroup(pb: Record<string, unknown>, name: string) {
  const groups = pb.solutions as Array<Record<string, unknown>>;
  return groups.find((g) => g.name === name);
}

function requireGroup(pb: Record<string, unknown>, name: string) {
  const g = findGroup(pb, name);
  if (!g) {
    const names = (pb.solutions as Array<Record<string, unknown>>).map((g) => g.name).join(', ');
    throw new Error(`Group "${name}" not found. Available: ${names}`);
  }
  return g;
}

function findQuestion(pb: Record<string, unknown>, name: string) {
  if (name.includes('.')) {
    const [gName, qName] = name.split('.', 2);
    const group = requireGroup(pb, gName);
    const qs = group.solutionAttributes as Array<Record<string, unknown>>;
    const q = qs.find((q) => q.name === qName);
    if (!q) throw new Error(`Question "${qName}" not found in group "${gName}".`);
    return { group, question: q };
  }
  const matches: Array<{ group: Record<string, unknown>; question: Record<string, unknown> }> = [];
  for (const g of pb.solutions as Array<Record<string, unknown>>) {
    const qs = g.solutionAttributes as Array<Record<string, unknown>>;
    const q = qs.find((q) => q.name === name);
    if (q) matches.push({ group: g, question: q });
  }
  if (matches.length === 0) throw new Error(`Question "${name}" not found.`);
  if (matches.length > 1) {
    throw new Error(`Question "${name}" exists in multiple groups: ${matches.map((m) => m.group.name).join(', ')}. Use "Group.Question" notation.`);
  }
  return matches[0];
}

function quotedTextListValue(v: string) {
  const escaped = v.replace(/"/g, '\\"');
  return { id: `"${escaped}"`, text: `"${escaped}"` };
}

const TYPE_MAP: Record<string, string> = {
  text: 'Text answer',
  numeric: 'Numeric answer',
  text_list: 'Text list',
  date: 'Date',
  date_formula: 'Date',
  calculated: 'Calculated answer',
  manual_item: 'Manual item',
  textarea: 'Text answer',
};

// ── Tool execution ────────────────────────────────────────────────────────────

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  client: DealHubWebClient,
  sessionId: string,
): Promise<string> {
  const pb = playbookCache.get(sessionId);

  switch (name) {
    case 'list_versions': {
      const raw = await client.get<Array<{ guid: string; name: string; status: string }>>('/versions/admin?isArchived=false&versionsScreen=true');
      return JSON.stringify(raw.map((v) => ({ guid: v.guid, name: v.name, status: v.status })));
    }

    case 'list_playbooks': {
      const { versionGuid } = input as { versionGuid: string };
      const raw = await client.get<Array<{ guid: string; name: string }>>(`/playbooks?versionGUID=${versionGuid}`);
      return JSON.stringify(raw.map((p) => ({ guid: p.guid, name: p.name })));
    }

    case 'playbook_load': {
      const { playbookGuid } = input as { playbookGuid: string };
      const loaded = await client.get<Record<string, unknown>>(`/playbook?playbookGUID=${playbookGuid}`);
      playbookCache.set(sessionId, loaded);
      const groups = loaded.solutions as Array<Record<string, unknown>>;
      return `Loaded playbook "${loaded.name}" (${groups.length} groups, ${groups.reduce((n, g) => n + (g.solutionAttributes as unknown[]).length, 0)} questions)`;
    }

    case 'playbook_summary': {
      if (!pb) return 'No playbook loaded. Call playbook_load first.';
      const groups = pb.solutions as Array<Record<string, unknown>>;
      const summary = {
        name: pb.name,
        guid: pb.guid,
        groups: groups.map((g) => ({
          name: g.name,
          displayedName: g.displayedName,
          kind: g.repetitive ? 'repeatable' : 'regular',
          questions: (g.solutionAttributes as Array<Record<string, unknown>>).map((q) => ({
            name: q.name,
            type: q.type,
          })),
        })),
      };
      return JSON.stringify(summary, null, 2);
    }

    case 'playbook_inspect_group': {
      if (!pb) return 'No playbook loaded.';
      const g = requireGroup(pb, input.groupName as string);
      return JSON.stringify(g, null, 2);
    }

    case 'playbook_inspect_question': {
      if (!pb) return 'No playbook loaded.';
      const { question } = findQuestion(pb, input.questionName as string);
      return JSON.stringify(question, null, 2);
    }

    case 'group_create': {
      if (!pb) return 'No playbook loaded.';
      const { name, displayedName, kind } = input as { name: string; displayedName: string; kind: string };
      if (findGroup(pb, name)) throw new Error(`Group "${name}" already exists.`);
      const groups = pb.solutions as Array<Record<string, unknown>>;
      const isRepeatable = kind === 'repeatable';
      const newGroup: Record<string, unknown> = {
        name,
        displayedName,
        guid: null,
        versionGUID: pb.versionGUID,
        ordinal: groups.length,
        cpr: '',
        cprValid: true,
        enableCPR: false,
        global: false,
        globalBefore: true,
        showAsTable: isRepeatable,
        tableColumnWidth: 220,
        showGroupNameColumn: false,
        enableSingleAddButton: false,
        addButtonLabel: 'Add new',
        enableMultiselectForTable: false,
        multiSelectButtonLabel: 'Select and add products',
        multiselectEntityType: 'PRODUCTS',
        enableCustomObject: false,
        customObjectBtnLabel: 'Get Subscriptions',
        customObjectQueryId: '',
        getAllSubscriptionsAutomatically: false,
        showExternalObjectButton: true,
        automaticRunCustomObject: false,
        automaticRunRefresh: false,
        automaticRunRefreshSolutions: [],
        showCustomObjectRefreshBtn: false,
        customObjectRefreshBtnLabel: 'Refresh Results',
        enableBulkDuplication: false,
        showRemoveSelectedRowsBtn: true,
        removeSelectedRowsBtnLabel: 'Remove selected rows',
        showSolutionTitle: true,
        isNewSolution: true,
        enablePreventImportUponErrors: false,
        enableDownloadTemplateButton: true,
        groupType: isRepeatable ? 'REPEATABLE_GROUP' : 'QUESTIONS_GROUP',
        pinByDefaultList: [],
        repetitive: isRepeatable,
        repetitiveName: isRepeatable ? displayedName : null,
        enableProductSelectionPR: isRepeatable ? {
          guid: null,
          rule: 'true',
          solutionAttributeGUID: null,
          ordinal: 0,
          accountGUID: pb.accountGUID,
          versionGUID: pb.versionGUID,
          presentationRuleType: 'ENABLE_PRODUCT_SELECTION',
        } : null,
        solutionAttributes: [],
        enableCommonPresentationRule: false,
        commonPresentationRule: null,
      };
      groups.push(newGroup);
      return `Created group "${name}" (${kind}).`;
    }

    case 'group_delete': {
      if (!pb) return 'No playbook loaded.';
      const g = requireGroup(pb, input.groupName as string);
      pb.solutions = (pb.solutions as Array<unknown>).filter((s) => s !== g);
      if (g.guid) {
        const del = { deletedType: 'SOLUTION', parentGUID: pb.guid, entityGUID: g.guid };
        pb.deletedItems = [...((pb.deletedItems as unknown[]) ?? []), del];
      }
      return `Deleted group "${input.groupName}".`;
    }

    case 'question_create': {
      if (!pb) return 'No playbook loaded.';
      const { groupName, name, label, type, textListValues, textListDefault, numericMin, numericMax, formula, isMandatory, defaultValue } = input as {
        groupName: string; name: string; label: string; type: string;
        textListValues?: string[]; textListDefault?: string;
        numericMin?: number; numericMax?: number; formula?: string;
        isMandatory?: boolean; defaultValue?: string;
      };
      const g = requireGroup(pb, groupName);
      const qs = g.solutionAttributes as Array<Record<string, unknown>>;
      if (qs.some((q) => q.name === name)) throw new Error(`Question "${name}" already exists in group "${groupName}".`);

      const q: Record<string, unknown> = {
        guid: null,
        type: TYPE_MAP[type] ?? 'Text answer',
        description: '',
        name,
        note: '',
        tooltip: '',
        question: label,
        ordinalValue: qs.length,
        solutionGUID: g.guid ?? null,
        value: [],
        valueLabels: {},
        excludedFilterValues: [],
        conditionalRules: [],
        presentationRules: [],
        showMode: 'ALWAYS',
        readOnlyRule: (type === 'date_formula' || type === 'calculated') ? 'true' : 'false',
        hiddenRule: 'false',
        billingAttributeType: null,
        timezoneIndependent: false,
        dayOfMonth: 'ANY',
        calculateWhenRule: 'true',
        versionGUID: pb.versionGUID,
        pinByDefault: false,
        tableColumnWidth: 220,
        hidden: false,
        defaultValue: defaultValue ?? '',
        readOnly: type === 'date_formula' || type === 'calculated',
        step: null,
        isRichText: type === 'textarea',
        multiSelect: false,
        calculatedAnswer: type === 'calculated',
        dateAttributeValueType: null,
        displayNumberType: 'NUMBER',
        isMandatory: !!isMandatory,
        allowEmpty: false,
        mantissa: 0,
      };

      if (type === 'numeric') {
        const minId = numericMin == null ? '5e-324' : String(numericMin);
        const maxId = numericMax == null ? '' : String(numericMax);
        q.value = [{ id: minId, text: minId }, { id: maxId, text: maxId }];
        q.step = '1';
      } else if (type === 'text_list') {
        q.value = (textListValues ?? []).map(quotedTextListValue);
        const def = textListDefault ?? textListValues?.[0];
        if (def) q.defaultValue = `"${def}"`;
      } else if (type === 'date_formula' || type === 'calculated') {
        if (!formula) throw new Error(`${type} question "${name}" requires a formula.`);
        q.dateAttributeValueType = type === 'date_formula' ? 'FORMULA' : null;
        q.defaultValue = formula;
      }

      qs.push(q);
      return `Added question "${name}" (${type}) to group "${groupName}".`;
    }

    case 'question_delete': {
      if (!pb) return 'No playbook loaded.';
      const { group, question } = findQuestion(pb, input.questionName as string);
      const qs = group.solutionAttributes as Array<Record<string, unknown>>;
      group.solutionAttributes = qs.filter((q) => q !== question);
      (group.solutionAttributes as Array<Record<string, unknown>>).forEach((q, i) => { q.ordinalValue = i; });
      if (question.guid) {
        const del = { deletedType: 'SOLUTION_ATTRIBUTE', parentGUID: group.guid ?? pb.guid, entityGUID: question.guid };
        pb.deletedItems = [...((pb.deletedItems as unknown[]) ?? []), del];
      }
      return `Deleted question "${input.questionName}".`;
    }

    case 'question_set_hidden_rule': {
      if (!pb) return 'No playbook loaded.';
      const { question } = findQuestion(pb, input.questionName as string);
      question.hiddenRule = input.rule;
      return `Set hiddenRule on "${input.questionName}" to: ${input.rule}`;
    }

    case 'question_set_readonly_rule': {
      if (!pb) return 'No playbook loaded.';
      const { question } = findQuestion(pb, input.questionName as string);
      question.readOnlyRule = input.rule;
      return `Set readOnlyRule on "${input.questionName}" to: ${input.rule}`;
    }

    case 'question_set_presentation_rule': {
      if (!pb) return 'No playbook loaded.';
      const { question } = findQuestion(pb, input.questionName as string);
      const rule = input.rule as string | null;
      if (!rule) {
        question.showMode = 'ALWAYS';
        question.presentationRules = [];
      } else {
        question.showMode = 'RULE_BASED';
        question.presentationRules = [{
          accountGUID: pb.accountGUID,
          guid: '',
          rule,
          versionGUID: pb.versionGUID,
          ordinal: 0,
          solutionAttributeGUID: question.guid ?? '',
          presentationRuleType: 'SOLUTION_ATTRIBUTE',
        }];
      }
      return rule ? `Set presentation rule on "${input.questionName}" to: ${rule}` : `Cleared presentation rule on "${input.questionName}" (always shown).`;
    }

    case 'playbook_save': {
      if (!pb) return 'No playbook loaded.';
      const result = await client.post<unknown>('/playbook', pb);
      // Update cache with server response if it looks like a full playbook
      if (result && typeof result === 'object' && 'solutions' in (result as object)) {
        playbookCache.set(sessionId, result as Record<string, unknown>);
      }
      return `Playbook "${pb.name}" saved successfully.`;
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(context?: { baseUrl?: string; versionGuid?: string; versionName?: string }) {
  const ctx = context?.versionGuid
    ? `\n\n**Active context:**\n- Tenant: ${context.baseUrl ?? 'unknown'}\n- Version: ${context.versionName ?? 'unknown'} (GUID: ${context.versionGuid})\n\nWhen the user asks to list or load playbooks, use this version GUID automatically — don't ask for it.`
    : '';

  return `You are a DealHub CPQ configuration assistant. You help configure and modify DealHub playbooks through natural language requests.

DealHub is a CPQ (Configure, Price, Quote) platform. Key concepts:
- **Version**: A collection of playbooks. Always has a status (DRAFT / ACTIVE).
- **Playbook**: The quote configurator. Contains groups (sections) of questions.
- **Group**: A section in the playbook. Regular groups = Q&A fields. Repeatable groups = table rows (product lines, subscriptions).
- **Question**: A field within a group. Types: text, text_list (dropdown), numeric, date, date_formula (calculated date), calculated, textarea.
- **Rules**: DealHub uses rule expressions like [GroupName.QuestionName] == "Yes" for conditional logic.

Workflow:
1. Use list_versions → list_playbooks to find what the user is looking for (skip list_versions if a version is already in the active context below).
2. Call playbook_load to load a playbook into memory. If the user references a playbook you've loaded before in this conversation, call playbook_load again — the cache may have been cleared on the server.
3. Make changes using mutation tools (group_create, question_create, etc.).
4. Always call playbook_save when done with changes.

Be concise and action-oriented. When the user says "add X", do it — don't ask for confirmation unless something is genuinely ambiguous. After saving, confirm what was done.${ctx}`;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const send = async (data: object) => {
    await writer.write(encoder.encode(JSON.stringify(data) + '\n'));
  };

  (async () => {
    try {
      const { messages, baseUrl, sessionCookies, sessionId, versionGuid, versionName } = await req.json() as {
        messages: Anthropic.MessageParam[];
        baseUrl: string;
        sessionCookies: string;
        sessionId: string;
        versionGuid?: string;
        versionName?: string;
      };

      if (!baseUrl || !sessionCookies) {
        await send({ type: 'error', error: 'baseUrl and sessionCookies are required.' });
        return;
      }

      const dhClient = new DealHubWebClient(baseUrl, sessionCookies);
      const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      let currentMessages: Anthropic.MessageParam[] = [...messages];

      // Agentic loop — runs until Claude stops calling tools
      while (true) {
        const response = await claude.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          system: buildSystemPrompt({ baseUrl, versionGuid, versionName }),
          tools: TOOLS,
          messages: currentMessages,
        });

        // Emit text blocks as they come
        for (const block of response.content) {
          if (block.type === 'text') {
            await send({ type: 'text', text: block.text });
          } else if (block.type === 'tool_use') {
            await send({ type: 'tool_use', id: block.id, name: block.name, input: block.input });
          }
        }

        if (response.stop_reason === 'end_turn' || response.stop_reason === 'stop_sequence') break;
        if (response.stop_reason !== 'tool_use') break;

        // Execute all tool calls
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of response.content) {
          if (block.type !== 'tool_use') continue;
          let content: string;
          try {
            content = await executeTool(block.name, block.input as Record<string, unknown>, dhClient, sessionId);
          } catch (e: unknown) {
            content = `Error: ${e instanceof Error ? e.message : String(e)}`;
          }
          await send({ type: 'tool_result', id: block.id, name: block.name, content });
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content });
        }

        // Add assistant turn + tool results to message history
        currentMessages = [
          ...currentMessages,
          { role: 'assistant', content: response.content },
          { role: 'user', content: toolResults },
        ];
      }

      await send({ type: 'done' });
    } catch (e: unknown) {
      await send({ type: 'error', error: e instanceof Error ? e.message : String(e) });
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
