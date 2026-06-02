import Anthropic from '@anthropic-ai/sdk';

import type { LlmFields, ParsedBean } from './types';

const MODEL = 'claude-haiku-4-5';

const TOOL: Anthropic.Tool = {
  name: 'record_bean',
  description: 'Record the structured attributes of a single bean variety.',
  input_schema: {
    type: 'object',
    properties: {
      species: { type: 'string', enum: ['vulgaris', 'lima', 'scarlet'] },
      plantType: { type: 'string', enum: ['bush', 'semi', 'runner'] },
      podType: { type: 'string', enum: ['snap', 'dry'] },
      beanColors: {
        type: 'array',
        items: { type: 'string', enum: ['white', 'yellow', 'brown', 'pink', 'red', 'purple', 'black'] },
      },
      notes: { type: 'string', description: 'Extraction caveats or low-confidence flags.' },
    },
    required: ['species', 'plantType', 'podType', 'beanColors', 'notes'],
  },
};

function buildPrompt(bean: ParsedBean): string {
  return [
    'Extract structured attributes for this heirloom bean variety from a seed catalog.',
    '',
    `Name: ${bean.name}`,
    `Image alt text: ${bean.alt}`,
    `Description: ${bean.rawDescription}`,
    '',
    'Guidance on where to look:',
    '- plantType / podType usually appear as a leading token like "Bush/Dry", "Pole lima", "Runner/Snap".',
    '- species: "lima" in the text means lima; only use "scarlet" for an explicit Phaseolus coccineus / scarlet runner — never infer it from the word "runner" alone (this site calls climbing common beans "runner").',
    '- beanColors: infer the seed colors from the description and the image alt text. Map to the closest of: white, yellow, brown, pink, red, purple, black. List 1-3, most dominant first.',
    'If a field is genuinely unclear, make your best guess and explain in notes.',
  ].join('\n');
}

export async function extractLlm(client: Anthropic, bean: ParsedBean, retries = 2): Promise<LlmFields> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 1024,
        tools: [TOOL],
        tool_choice: { type: 'tool', name: 'record_bean' },
        messages: [{ role: 'user', content: buildPrompt(bean) }],
      });
      const block = res.content.find((c): c is Anthropic.ToolUseBlock => c.type === 'tool_use');
      if (!block) throw new Error('no tool_use block in response');
      return parseLlmFields(block.input, bean.name);
    } catch (err) {
      lastError = err;
      if (attempt <= retries) await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  throw new Error(`LLM extraction failed for "${bean.name}": ${String(lastError)}`);
}

const SPECIES = ['vulgaris', 'lima', 'scarlet'];
const PLANT_TYPES = ['bush', 'semi', 'runner'];
const POD_TYPES = ['snap', 'dry'];
const COLORS = ['white', 'yellow', 'brown', 'pink', 'red', 'purple', 'black'];

function parseLlmFields(input: unknown, name: string): LlmFields {
  if (typeof input !== 'object' || input === null) {
    throw new Error(`malformed tool result for "${name}": not an object`);
  }
  const o = input as Record<string, unknown>;
  if (!SPECIES.includes(o.species as string)) throw new Error(`bad species for "${name}": ${String(o.species)}`);
  if (!PLANT_TYPES.includes(o.plantType as string))
    throw new Error(`bad plantType for "${name}": ${String(o.plantType)}`);
  if (!POD_TYPES.includes(o.podType as string)) throw new Error(`bad podType for "${name}": ${String(o.podType)}`);
  if (!Array.isArray(o.beanColors) || !o.beanColors.every((c) => COLORS.includes(c as string))) {
    throw new Error(`bad beanColors for "${name}": ${String(o.beanColors)}`);
  }
  return {
    species: o.species as LlmFields['species'],
    plantType: o.plantType as LlmFields['plantType'],
    podType: o.podType as LlmFields['podType'],
    beanColors: o.beanColors as LlmFields['beanColors'],
    notes: typeof o.notes === 'string' ? o.notes : '',
  };
}
