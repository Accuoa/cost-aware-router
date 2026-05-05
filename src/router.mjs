const CODE_PATTERNS = [
  /```/, // markdown code fences
  /\bdef\s+\w+\s*\(/,
  /\bfunction\s+\w+\s*\(/,
  /\bclass\s+[A-Z]\w*/,
  /\bimport\s+\w+/,
  /<html\b/i,
  /\bSELECT\s+.*\bFROM\b/i,
];

export function decideRoute(request, config) {
  const text = extractUserText(request.messages);
  const lowerText = text.toLowerCase();

  // Highest precedence: forced-local override
  for (const kw of config.always_local_keywords ?? []) {
    if (lowerText.includes(kw.toLowerCase())) {
      return { target: 'local', reason: `forced_local:"${kw}"` };
    }
  }

  // Hard gate: code detection
  for (const pat of CODE_PATTERNS) {
    if (pat.test(text)) {
      return { target: 'cloud', reason: 'contains_code' };
    }
  }

  // Complexity keywords (combined: configured + always_cloud)
  const allCloudKw = [
    ...(config.complexity_keywords ?? []),
    ...(config.always_cloud_keywords ?? []),
  ];
  for (const kw of allCloudKw) {
    if (lowerText.includes(kw.toLowerCase())) {
      return { target: 'cloud', reason: `complexity_keyword:"${kw}"` };
    }
  }

  // Length gate
  const tokens = approximateTokenCount(text);
  if (tokens > config.length_threshold_tokens) {
    return { target: 'cloud', reason: `long_prompt:${tokens}_tokens` };
  }

  return { target: 'local', reason: 'short_simple' };
}

function extractUserText(messages) {
  return messages
    .filter((m) => m.role === 'user')
    .map((m) => {
      if (typeof m.content === 'string') return m.content;
      if (Array.isArray(m.content)) {
        return m.content
          .filter((p) => p.type === 'text')
          .map((p) => p.text)
          .join(' ');
      }
      return '';
    })
    .join(' ');
}

function approximateTokenCount(text) {
  // ~3.5 chars per token is a good rough estimate for English.
  return Math.ceil(text.length / 3.5);
}
