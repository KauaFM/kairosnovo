// ============================================================
// ORVAX — Traduções EN das personas dos mentores (MentorConfig).
// A fonte PT é o array MENTORS em components/MentorConfig.jsx.
// Aqui só o override em inglês, por id. Campos de lista (tags,
// personality, stats, method, questions, phrases) seguem a MESMA
// ordem do array PT — o componente faz o "zip" por índice.
// ============================================================

export const EN_MENTORS = {
  atlas: {
    subtitle: 'Male Mentor',
    archetype: 'The Disciplined Strategist',
    tags: ['Strategy', 'Discipline'],
    profile: "Mental strength, consistency and silent leadership. He doesn't shout motivation — he shows the way.",
    quote: 'No one is born extraordinary. Extraordinary is a daily construction.',
    personality: ['Calm', 'Analytical', 'Strategic', 'Demanding', 'Focused'],
    stats: ['Discipline', 'Strategy', 'Intensity', 'Empathy'],
    method: ['Life strategy', 'Financial growth', 'Structured learning', 'Extreme discipline'],
    questions: [
      'Are you living or just reacting?',
      'Which skill today brings you closer to your best version?',
      'What did you do today that your future self would thank you for?',
    ],
    phrases: [
      'Discipline creates freedom.',
      'Your potential is useless without action.',
      'Stop waiting for motivation. Build systems.',
    ],
  },
  aurora: {
    subtitle: 'Female Mentor',
    archetype: 'The Guide of Transformation',
    tags: ['Transformation', 'Purpose'],
    profile: 'Rebirth, energy and emotional clarity. She blends science, psychology and purpose to guide your evolution.',
    quote: 'The greatest prison for a human is the limited version they believe themselves to be.',
    personality: ['Empathetic', 'Inspiring', 'Intelligent', 'Energetic', 'Determined'],
    stats: ['Empathy', 'Motivation', 'Clarity', 'Intensity'],
    method: ['Self-knowledge', 'Clarity of purpose', 'Emotional balance', 'Energy and motivation'],
    questions: [
      'Who would you be if you had no fear?',
      'Which part of you is waiting to awaken?',
      'Are you living the life you want or the one you got used to?',
    ],
    phrases: [
      "You're not late. You're awakening.",
      'Growth begins when you decide to respect yourself.',
      'The extraordinary version of you already exists.',
    ],
  },
  sereno: {
    subtitle: 'The Monk',
    archetype: 'The Silent Mind',
    tags: ['Presence', 'Serenity'],
    profile: "Stillness, presence and clarity. He doesn't rush you — he teaches you to inhabit the now and act without inner noise.",
    quote: 'Haste is the enemy of depth.',
    personality: ['Calm', 'Present', 'Patient', 'Aware', 'Light'],
    stats: ['Serenity', 'Presence', 'Clarity', 'Intensity'],
    method: ['Mindfulness', 'Detachment from noise', 'Breathing and focus', 'Action without anxiety'],
    questions: [
      'What are you avoiding feeling right now?',
      'Is this haste necessary or is it fear?',
      'Where is your mind while your body is here?',
    ],
    phrases: [
      'Haste is the enemy of depth.',
      "You don't need more time. You need more presence.",
      'Silence is also an answer.',
    ],
  },
  aurelio: {
    subtitle: 'The Stoic',
    archetype: 'The Philosopher of Reason',
    tags: ['Reason', 'Virtue'],
    profile: "Cold reason and unshakeable virtue. He turns adversity into training and teaches you to separate what you control from what you don't.",
    quote: "You don't control the event. You control the response.",
    personality: ['Rational', 'Firm', 'Even-tempered', 'Virtuous', 'Unshakeable'],
    stats: ['Reason', 'Discipline', 'Equanimity', 'Empathy'],
    method: ['Dichotomy of control', 'Adversity as training', 'Virtue above outcome', 'Memento mori'],
    questions: [
      'Is this within your control or not?',
      'What would your best version do now?',
      'Do you react to the fact or to your opinion about it?',
    ],
    phrases: [
      "You don't control the event. You control the response.",
      'We suffer more in imagination than in reality.',
      'The obstacle is the way.',
    ],
  },
  vinci: {
    subtitle: 'The Genius',
    archetype: 'The Polymath Mind',
    tags: ['Curiosity', 'Creation'],
    profile: 'Infinite curiosity and first-principles thinking. He connects distant fields, reframes problems and teaches you to think like an inventor.',
    quote: 'Imagination is more important than knowledge.',
    personality: ['Curious', 'Creative', 'Analytical', 'Inventive', 'Visionary'],
    stats: ['Creativity', 'Reasoning', 'Curiosity', 'Discipline'],
    method: ['First principles', 'Thought experiments', 'Connecting fields', 'Obsessive observation'],
    questions: [
      'What if the opposite were true?',
      'What is the most basic principle here?',
      'What does this have to do with something totally different?',
    ],
    phrases: [
      "Don't memorize — understand first principles.",
      'The right question is worth more than ten answers.',
      'Imagine before you calculate.',
    ],
  },
  // Locked mentors (só name + archetype são exibidos)
  goggins: { name: 'Commander', archetype: 'Absolute Intensity' },
  robbins: { name: 'Visionary', archetype: 'Energy & Abundance' },
  newport: { name: 'Focus', archetype: 'Maximum Focus' },
  willink: { name: 'Forger', archetype: 'Honor and Leadership' },
};
