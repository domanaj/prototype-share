const ADJECTIVES = [
  'brave', 'bold', 'calm', 'cool', 'crisp', 'fast', 'free', 'glad', 'keen', 'kind',
  'neat', 'nice', 'pure', 'rare', 'safe', 'slim', 'soft', 'warm', 'wide', 'wise',
  'amber', 'azure', 'coral', 'frost', 'jade', 'lunar', 'maple', 'ocean', 'pearl', 'solar',
  'arctic', 'cosmic', 'golden', 'misty', 'neon', 'pixel', 'prism', 'retro', 'sonic', 'vivid',
];

const ANIMALS = [
  'badger', 'falcon', 'fox', 'hawk', 'otter', 'panda', 'raven', 'tiger', 'wolf', 'bear',
  'crane', 'eagle', 'heron', 'ibis', 'koala', 'lemur', 'moose', 'newt', 'owl', 'pike',
  'quail', 'robin', 'seal', 'toad', 'viper', 'whale', 'wren', 'yak', 'zebra', 'gecko',
];

export function generateSlug(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj}-${animal}-${num}`;
}

const REVIEWER_ADJECTIVES = [
  'Curious', 'Bold', 'Calm', 'Swift', 'Bright', 'Keen', 'Warm', 'Sharp',
  'Steady', 'Quick', 'Fair', 'Wise', 'Free', 'Kind', 'True', 'Neat',
];

const REVIEWER_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
  '#ef4444', '#14b8a6', '#f97316', '#06b6d4', '#84cc16', '#a855f7',
];

export function generateReviewerName(): string {
  const adj = REVIEWER_ADJECTIVES[Math.floor(Math.random() * REVIEWER_ADJECTIVES.length)];
  const num = Math.floor(Math.random() * 100);
  return `${adj} Reviewer ${num}`;
}

export function randomColor(): string {
  return REVIEWER_COLORS[Math.floor(Math.random() * REVIEWER_COLORS.length)];
}
