import { describe, it, expect } from 'vitest';
import { scoreMMLU, scoreHumanEvalJS } from '../benchmark/score.mjs';

describe('scoreMMLU', () => {
  const item = {
    subject: 'test',
    question: 'What is 2+2?',
    choices: ['3', '4', '5', '6'],
    answer: 1, // index of correct choice
  };

  it('scores correct: response contains the answer letter', () => {
    expect(scoreMMLU(item, 'The answer is B')).toBe(true);
    expect(scoreMMLU(item, 'B')).toBe(true);
    expect(scoreMMLU(item, '(B)')).toBe(true);
  });

  it('scores incorrect: response contains a different answer letter', () => {
    expect(scoreMMLU(item, 'The answer is A')).toBe(false);
    expect(scoreMMLU(item, 'C')).toBe(false);
  });

  it('parses first letter found if multiple letters appear', () => {
    expect(scoreMMLU(item, 'Choices A and C are wrong, the answer is B')).toBe(true);
    expect(scoreMMLU(item, 'A is wrong, B is right')).toBe(true);
  });

  it('scores incorrect when no letter found', () => {
    expect(scoreMMLU(item, 'I am not sure')).toBe(false);
    expect(scoreMMLU(item, '')).toBe(false);
  });

  it('handles lowercase letters', () => {
    expect(scoreMMLU(item, 'the answer is b')).toBe(true);
  });
});

describe('scoreHumanEvalJS', () => {
  it('scores pass when generated code passes tests', () => {
    const item = {
      task_id: 'test/1',
      prompt: 'const add = function(a, b)',
      tests: 'console.assert(add(2, 3) === 5);\nconsole.assert(add(0, 0) === 0);',
      entry_point: 'add',
    };
    const generated = '{ return a + b; }';
    expect(scoreHumanEvalJS(item, generated)).toBe(true);
  });

  it('scores fail when generated code fails tests', () => {
    const item = {
      task_id: 'test/2',
      prompt: 'const subtract = function(a, b)',
      tests: 'console.assert(subtract(5, 3) === 2);',
      entry_point: 'subtract',
    };
    const generatedWrong = '{ return a + b; }';
    expect(scoreHumanEvalJS(item, generatedWrong)).toBe(false);
  });

  it('extracts code from markdown fences if present', () => {
    const item = {
      task_id: 'test/3',
      prompt: 'const sq = function(n)',
      tests: 'console.assert(sq(3) === 9);',
      entry_point: 'sq',
    };
    const generated = 'Here is the code:\n```js\nconst sq = function(n) { return n * n; };\n```';
    expect(scoreHumanEvalJS(item, generated)).toBe(true);
  });

  it('scores fail on syntax error in generated code', () => {
    const item = {
      task_id: 'test/4',
      prompt: 'const x = function()',
      tests: 'console.assert(x() === 1);',
      entry_point: 'x',
    };
    const generatedBroken = '{ return 1 +; }';
    expect(scoreHumanEvalJS(item, generatedBroken)).toBe(false);
  });

  it('scores fail on infinite loop / timeout', () => {
    const item = {
      task_id: 'test/5',
      prompt: 'const loop = function()',
      tests: 'console.assert(loop() === 0);',
      entry_point: 'loop',
    };
    const generatedLoop = '{ while(true){} return 0; }';
    expect(scoreHumanEvalJS(item, generatedLoop, { timeoutMs: 200 })).toBe(false);
  });
});
