// Thin Claude proxy for the extension-mode client-side agentic loop.
// Accepts messages (including tool results), calls Claude once, streams text
// and returns complete tool_use blocks. Tool *execution* happens in the browser.

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 300;

const TOOLS: Anthropic.Tool[] = [
  { name: 'list_versions', description: 'List all versions on the DealHub tenant. Returns [{guid,name,status}].', input_schema: { type: 'object', properties: {}, required: [] } },
  { name: 'list_playbooks', description: 'List playbooks in a version. Returns [{guid,name}].', input_schema: { type: 'object', properties: { versionGuid: { type: 'string' } }, required: ['versionGuid'] } },
  { name: 'playbook_load', description: 'Load a playbook into session memory by GUID.', input_schema: { type: 'object', properties: { playbookGuid: { type: 'string' } }, required: ['playbookGuid'] } },
  { name: 'playbook_summary', description: 'Return compact overview of loaded playbook (groups + question names/types).', input_schema: { type: 'object', properties: {}, required: [] } },
  { name: 'playbook_inspect_group', description: 'Return full JSON for one group from the loaded playbook.', input_schema: { type: 'object', properties: { groupName: { type: 'string' } }, required: ['groupName'] } },
  { name: 'playbook_inspect_question', description: 'Return full JSON for one question. Use "Group.Question" if ambiguous.', input_schema: { type: 'object', properties: { questionName: { type: 'string' } }, required: ['questionName'] } },
  { name: 'group_create', description: 'Add a question group to the loaded playbook.', input_schema: { type: 'object', properties: { name: { type: 'string' }, displayedName: { type: 'string' }, kind: { type: 'string', enum: ['regular', 'repeatable'] } }, required: ['name', 'displayedName', 'kind'] } },
  { name: 'group_delete', description: 'Delete a group from the loaded playbook.', input_schema: { type: 'object', properties: { groupName: { type: 'string' } }, required: ['groupName'] } },
  { name: 'question_create', description: 'Add a question to a group.', input_schema: { type: 'object', properties: { groupName: { type: 'string' }, name: { type: 'string' }, label: { type: 'string' }, type: { type: 'string', enum: ['text','text_list','numeric','date','date_formula','calculated','textarea'] }, textListValues: { type: 'array', items: { type: 'string' } }, textListDefault: { type: 'string' }, numericMin: { type: 'number' }, numericMax: { type: 'number' }, formula: { type: 'string' }, isMandatory: { type: 'boolean' }, defaultValue: { type: 'string' } }, required: ['groupName','name','label','type'] } },
  { name: 'question_update', description: 'Update properties of an existing question (label, values, formula, isMandatory, defaultValue). Prefer this over delete+recreate.', input_schema: { type: 'object', properties: { questionName: { type: 'string' }, label: { type: 'string' }, textListValues: { type: 'array', items: { type: 'string' } }, textListDefault: { type: 'string' }, numericMin: { type: 'number' }, numericMax: { type: 'number' }, formula: { type: 'string' }, isMandatory: { type: 'boolean' }, defaultValue: { type: 'string' } }, required: ['questionName'] } },
  { name: 'question_delete', description: 'Delete a question from the loaded playbook. Only use when truly removing; never delete then recreate to change values — use question_update instead.', input_schema: { type: 'object', properties: { questionName: { type: 'string' } }, required: ['questionName'] } },
  { name: 'question_set_hidden_rule', description: 'Set a Hide rule on a question.', input_schema: { type: 'object', properties: { questionName: { type: 'string' }, rule: { type: 'string' } }, required: ['questionName','rule'] } },
  { name: 'question_set_readonly_rule', description: 'Set a Read-only rule on a question.', input_schema: { type: 'object', properties: { questionName: { type: 'string' }, rule: { type: 'string' } }, required: ['questionName','rule'] } },
  { name: 'question_set_presentation_rule', description: 'Set a presentation rule on a question (null to clear).', input_schema: { type: 'object', properties: { questionName: { type: 'string' }, rule: { type: 'string' } }, required: ['questionName','rule'] } },
  { name: 'playbook_save', description: 'Persist the loaded playbook back to DealHub. Always call after mutations.', input_schema: { type: 'object', properties: {}, required: [] } },
];

function buildSystem(baseUrl?: string, versionGuid?: string, versionName?: string) {
  const ctx = versionGuid
    ? `\n\n**Active context:** Tenant: ${baseUrl ?? 'unknown'} · Version: ${versionName ?? 'unknown'} (GUID: ${versionGuid})\nUse this version GUID automatically when listing/loading playbooks.`
    : '';
  return `You are a DealHub CPQ configuration assistant. Help configure DealHub playbooks through natural language.

DealHub concepts: Version (collection of playbooks, DRAFT/ACTIVE), Playbook (quote configurator with groups of questions), Group (regular=Q&A, repeatable=table rows), Question (text/text_list/numeric/date/calculated/textarea), Rules (e.g. [Group.Question] == "Yes").

Workflow: list_versions → list_playbooks → playbook_load → mutate → playbook_save.
Skip list_versions if version is in active context. Re-call playbook_load if cache may be stale.
Be concise. Act on requests without confirmation unless genuinely ambiguous.

RULES:
- Always work in DRAFT versions. Never modify an ACTIVE version — if only ACTIVE exists, tell the user to create a DRAFT first.
- To change a question's label, values, formula, or any other property: use question_update. Never delete then recreate a question just to change its values.
- textListValues must be plain text strings only — no HTML, no Markdown, no // comments, no quotes. Example: ["Yes", "No", "Maybe"] not ["Yes // option", "<b>No</b>"].${ctx}`;
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const send = async (d: object) => writer.write(encoder.encode(JSON.stringify(d) + '\n'));

  (async () => {
    try {
      const { messages, baseUrl, versionGuid, versionName } = await req.json() as {
        messages: Anthropic.MessageParam[];
        baseUrl?: string;
        versionGuid?: string;
        versionName?: string;
      };

      const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

      const response = await claude.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: buildSystem(baseUrl, versionGuid, versionName),
        tools: TOOLS,
        messages,
      });

      for (const block of response.content) {
        if (block.type === 'text') await send({ type: 'text', text: block.text });
        else if (block.type === 'tool_use') await send({ type: 'tool_use', id: block.id, name: block.name, input: block.input });
      }
      await send({ type: 'done', stop_reason: response.stop_reason });
    } catch (e: unknown) {
      await send({ type: 'error', error: e instanceof Error ? e.message : String(e) });
    } finally {
      await writer.close();
    }
  })();

  return new NextResponse(stream.readable, { headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache' } });
}
