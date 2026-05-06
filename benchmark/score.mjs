import { runInNewContext } from 'node:vm';

const LETTER_RE = /\b([A-D])\b/g;

export function scoreMMLU(item, response) {
  const upper = (response ?? '').toUpperCase();
  const matches = [...upper.matchAll(LETTER_RE)];
  if (!matches.length) return false;
  // Use the last letter found (handles "A is wrong, B is right" → B)
  const letter = matches[matches.length - 1][1];
  const responseIdx = letter.charCodeAt(0) - 'A'.charCodeAt(0);
  return responseIdx === item.answer;
}

const FENCE_RE = /```(?:js|javascript)?[ \t]*\n([\s\S]*?)\n?```/;

function extractCode(response) {
  const fenceMatch = response.match(FENCE_RE);
  return fenceMatch ? fenceMatch[1] : response;
}

export function scoreHumanEvalJS(item, response, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 1500;
  const code = extractCode(response ?? '');

  // If the extracted code already contains the full function definition (e.g. from a markdown
  // fence), use it directly; otherwise prepend the prompt signature.
  const isFullDefinition = code.includes(item.prompt.trim()) || code.trimStart().startsWith('const ') || code.trimStart().startsWith('function ');
  const fullProgram = isFullDefinition
    ? `
    ${code}
    ${item.tests}
  `
    : `
    ${item.prompt} ${code}
    ${item.tests}
  `;

  try {
    runInNewContext(
      fullProgram,
      {
        console: { assert: (cond, msg) => { if (!cond) throw new Error(msg ?? 'assertion failed'); } },
      },
      { timeout: timeoutMs },
    );
    return true;
  } catch (err) {
    return false;
  }
}
