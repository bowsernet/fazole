import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

import Anthropic from '@anthropic-ai/sdk';

import { coerceExtraction } from './coerce-extraction';
import type { CsvBean } from './scrape-csv';
import type { LlmFields } from './types';

export const DEFAULT_MODEL = 'claude-sonnet-4-6';

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
        items: { type: 'string', enum: ['white', 'yellow', 'brown', 'pink', 'red', 'purple', 'black', 'blue'] },
      },
      notes: { type: 'string', description: 'Extraction caveats or low-confidence flags.' },
    },
    required: ['species', 'plantType', 'podType', 'beanColors', 'notes'],
  },
};

function mediaType(path: string): 'image/jpeg' | 'image/png' | 'image/webp' {
  const ext = extname(path).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

function prompt(bean: CsvBean): string {
  return [
    'Extract structured attributes for this heirloom bean variety. You are shown the seed photo plus catalog text.',
    '',
    `Name: ${bean.name}`,
    `Image alt text: ${bean.alt}`,
    `Description: ${bean.rawDescription}`,
    '',
    'Guidance:',
    '- plantType / podType usually appear as a leading token like "Bush/Dry", "Pole lima", "Runner/Snap".',
    '- species: "lima" in the text means lima; only use "scarlet" for an explicit Phaseolus coccineus / scarlet runner — never infer it from the word "runner" alone.',
    '- beanColors: read the SEED colors primarily from the PHOTO (the text/name is a weak hint). Map to the closest of: white, yellow, brown, pink, red, purple, black, blue. List 1-3, most dominant first.',
  ].join('\n');
}

export async function extractMultimodal(
  client: Anthropic,
  bean: CsvBean,
  model: string = DEFAULT_MODEL,
  retries = 2,
): Promise<LlmFields> {
  const data = readFileSync(bean.localImagePath).toString('base64');
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const res = await client.messages.create({
        model,
        max_tokens: 1024,
        tools: [TOOL],
        tool_choice: { type: 'tool', name: 'record_bean' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType(bean.localImagePath), data } },
              { type: 'text', text: prompt(bean) },
            ],
          },
        ],
      });
      const block = res.content.find((c): c is Anthropic.ToolUseBlock => c.type === 'tool_use');
      if (!block) throw new Error('no tool_use block in response');
      return coerceExtraction(block.input, bean.rules);
    } catch (err) {
      lastError = err;
      if (attempt <= retries) await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
  throw new Error(`multimodal extraction failed for "${bean.name}": ${String(lastError)}`);
}
