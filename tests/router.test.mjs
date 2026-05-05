import { describe, it, expect } from 'vitest';
import { decideRoute } from '../src/router.mjs';

const baseConfig = {
  length_threshold_tokens: 200,
  complexity_keywords: ['step by step', 'deeply analyze'],
  always_cloud_keywords: [],
  always_local_keywords: [],
};

function userMessage(content) {
  return { messages: [{ role: 'user', content }] };
}

describe('decideRoute', () => {
  it('routes short simple prompts to local', () => {
    const decision = decideRoute(userMessage('What is the capital of France?'), baseConfig);
    expect(decision.target).toBe('local');
    expect(decision.reason).toBe('short_simple');
  });

  it('routes prompts containing triple-backtick code blocks to cloud', () => {
    const decision = decideRoute(
      userMessage('Fix this:\n```js\nconst x = 1;\n```'),
      baseConfig,
    );
    expect(decision.target).toBe('cloud');
    expect(decision.reason).toBe('contains_code');
  });

  it('routes prompts with `def name(` to cloud', () => {
    const decision = decideRoute(userMessage('What does def foo(x): return x do?'), baseConfig);
    expect(decision.target).toBe('cloud');
    expect(decision.reason).toBe('contains_code');
  });

  it('routes prompts with `function name(` to cloud', () => {
    const decision = decideRoute(
      userMessage('Explain function bar(y) { return y; }'),
      baseConfig,
    );
    expect(decision.target).toBe('cloud');
    expect(decision.reason).toBe('contains_code');
  });

  it('routes prompts with `class Name` to cloud', () => {
    const decision = decideRoute(userMessage('What is class Animal in OOP?'), baseConfig);
    expect(decision.target).toBe('cloud');
    expect(decision.reason).toBe('contains_code');
  });

  it('routes prompts with `import X` to cloud', () => {
    const decision = decideRoute(userMessage('Why does import math matter?'), baseConfig);
    expect(decision.target).toBe('cloud');
    expect(decision.reason).toBe('contains_code');
  });

  it('routes prompts with SELECT...FROM to cloud', () => {
    const decision = decideRoute(
      userMessage('Walk me through SELECT * FROM users where id=1'),
      baseConfig,
    );
    expect(decision.target).toBe('cloud');
    expect(decision.reason).toBe('contains_code');
  });

  it('routes prompts containing complexity keywords to cloud', () => {
    const decision = decideRoute(
      userMessage('Explain the French Revolution step by step'),
      baseConfig,
    );
    expect(decision.target).toBe('cloud');
    expect(decision.reason).toBe('complexity_keyword:"step by step"');
  });

  it('matches complexity keywords case-insensitively', () => {
    const decision = decideRoute(
      userMessage('Please DEEPLY ANALYZE this poem'),
      baseConfig,
    );
    expect(decision.target).toBe('cloud');
    expect(decision.reason).toBe('complexity_keyword:"deeply analyze"');
  });

  it('routes long prompts (>threshold) to cloud', () => {
    const longPrompt = 'word '.repeat(300);
    const decision = decideRoute(userMessage(longPrompt), baseConfig);
    expect(decision.target).toBe('cloud');
    expect(decision.reason).toMatch(/^long_prompt:\d+_tokens$/);
  });

  it('respects always_cloud_keywords (overrides default-local)', () => {
    const decision = decideRoute(userMessage('quick math: 2+2'), {
      ...baseConfig,
      always_cloud_keywords: ['math'],
    });
    expect(decision.target).toBe('cloud');
    expect(decision.reason).toBe('complexity_keyword:"math"');
  });

  it('respects always_local_keywords (overrides everything else)', () => {
    const decision = decideRoute(
      userMessage('Please deeply analyze this short question'),
      {
        ...baseConfig,
        always_local_keywords: ['short question'],
      },
    );
    expect(decision.target).toBe('local');
    expect(decision.reason).toBe('forced_local:"short question"');
  });

  it('extracts text from multi-message conversations (only user messages)', () => {
    const decision = decideRoute(
      {
        messages: [
          { role: 'system', content: 'You are helpful.' },
          { role: 'user', content: 'Hi.' },
          { role: 'assistant', content: 'Hello!' },
          { role: 'user', content: 'What is 2+2?' },
        ],
      },
      baseConfig,
    );
    expect(decision.target).toBe('local');
    expect(decision.reason).toBe('short_simple');
  });

  it('handles content as array of parts (vision-style messages)', () => {
    const decision = decideRoute(
      {
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: 'What is the capital of Spain?' },
            ],
          },
        ],
      },
      baseConfig,
    );
    expect(decision.target).toBe('local');
    expect(decision.reason).toBe('short_simple');
  });
});
