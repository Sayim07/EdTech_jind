// Built-in fallback MCQs, used only for enrolled courses that have no admin-created test yet.
// As soon as an admin adds a real test to a course, it replaces the sample automatically.

export interface SampleQuestion {
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const FOOD: SampleQuestion[] = [
  { text: 'Which period marks the shift from hunting and gathering to farming?', options: ['Paleolithic', 'Neolithic', 'Industrial Revolution', 'Bronze Age'], correctIndex: 1, explanation: 'The Neolithic Revolution (about 10,000 BCE) introduced settled agriculture.' },
  { text: 'Which region is known as the birthplace of wheat and barley farming?', options: ['Amazon Basin', 'The Fertile Crescent', 'Scandinavia', 'Patagonia'], correctIndex: 1, explanation: 'Wheat and barley were first domesticated in the Fertile Crescent of West Asia.' },
  { text: 'Which crop was first domesticated in Mesoamerica?', options: ['Rice', 'Maize', 'Oats', 'Rye'], correctIndex: 1, explanation: 'Maize (corn) was domesticated in Mesoamerica from teosinte.' },
  { text: 'Which grain was first cultivated in the Yangtze River valley of China?', options: ['Rice', 'Sorghum', 'Quinoa', 'Millet'], correctIndex: 0, explanation: 'Rice cultivation began in the Yangtze valley roughly 9,000 years ago.' },
  { text: 'What was the main purpose of fermentation in early food preservation?', options: ['Adding colour', 'Extending shelf life', 'Reducing weight', 'Removing fibre'], correctIndex: 1, explanation: 'Fermentation helped communities store food (bread, cheese, wine) for longer.' },
  { text: 'The Columbian Exchange moved which crop from the Americas to Europe?', options: ['Potato', 'Wheat', 'Olive', 'Grape'], correctIndex: 0, explanation: 'Potatoes, tomatoes and maize travelled from the Americas to the Old World.' },
  { text: 'Which spice was so valuable in medieval Europe that it shaped trade routes?', options: ['Salt', 'Black pepper', 'Sugar beet', 'Garlic'], correctIndex: 1, explanation: 'Black pepper from India drove much of the spice trade.' },
  { text: 'Domesticating animals mainly gave early farmers a dependable supply of what?', options: ['Protein and dairy', 'Spices', 'Fruit', 'Salt'], correctIndex: 0, explanation: 'Livestock provided meat, milk and labour.' },
  { text: 'Surplus food in early societies led most directly to which development?', options: ['Specialised occupations', 'The end of trade', 'Nomadic life', 'Smaller settlements'], correctIndex: 0, explanation: 'Surplus allowed some people to become artisans, priests and administrators.' },
  { text: 'Which tool was most important for early grain harvesting?', options: ['Sickle', 'Telescope', 'Printing press', 'Compass'], correctIndex: 0, explanation: 'Flint-bladed sickles were used to harvest wild and cultivated cereals.' },
];

const CIVILIZATIONS: SampleQuestion[] = [
  { text: 'Which river supported the civilization of ancient Egypt?', options: ['Tigris', 'Nile', 'Indus', 'Yellow'], correctIndex: 1, explanation: 'The annual Nile flood made the valley fertile.' },
  { text: 'Which civilization developed cuneiform writing?', options: ['Sumerians', 'Romans', 'Maya', 'Vikings'], correctIndex: 0, explanation: 'The Sumerians of Mesopotamia developed cuneiform around 3400 BCE.' },
  { text: 'Mohenjo-daro and Harappa belonged to which civilization?', options: ['Indus Valley', 'Minoan', 'Aztec', 'Persian'], correctIndex: 0, explanation: 'Both were major cities of the Indus Valley Civilization.' },
  { text: 'Which ancient city-state is regarded as the birthplace of democracy?', options: ['Sparta', 'Athens', 'Thebes', 'Corinth'], correctIndex: 1, explanation: 'Athens introduced direct democracy in the 5th century BCE.' },
  { text: 'The Great Wall of China was built primarily to defend against whom?', options: ['Northern nomadic groups', 'Sea raiders', 'Roman legions', 'Mongol navies'], correctIndex: 0, explanation: 'It protected China’s northern frontier from nomadic incursions.' },
  { text: 'Which empire built an extensive network of roads connecting its provinces, including the Appian Way?', options: ['Roman', 'Ottoman', 'Mughal', 'Inca'], correctIndex: 0, explanation: 'Roman roads supported trade, communication and the army.' },
  { text: 'Hieroglyphs were the writing system of which civilization?', options: ['Egyptian', 'Greek', 'Phoenician', 'Babylonian'], correctIndex: 0, explanation: 'Egyptian hieroglyphs were used for monuments and sacred texts.' },
  { text: 'Which civilization built Machu Picchu?', options: ['Inca', 'Maya', 'Olmec', 'Toltec'], correctIndex: 0, explanation: 'Machu Picchu was built by the Inca in the 15th century.' },
  { text: 'The Code of Hammurabi is an early example of what?', options: ['Written law', 'A trade map', 'A calendar', 'A poem'], correctIndex: 0, explanation: 'It is one of the oldest deciphered written law codes.' },
  { text: 'What did the invention of the wheel mainly improve in early societies?', options: ['Transport and pottery', 'Navigation at sea', 'Writing', 'Astronomy'], correctIndex: 0, explanation: 'Wheels transformed carts and potter’s wheels in Mesopotamia.' },
];

const GENERAL: SampleQuestion[] = [
  { text: 'Which technique best helps you remember new information long term?', options: ['Re-reading once', 'Spaced repetition', 'Highlighting only', 'Cramming'], correctIndex: 1, explanation: 'Reviewing material at increasing intervals strengthens memory.' },
  { text: 'What does "active recall" involve?', options: ['Testing yourself from memory', 'Listening passively', 'Copying notes word for word', 'Skipping hard topics'], correctIndex: 0, explanation: 'Retrieving information yourself is more effective than passive review.' },
  { text: 'A good first step when you do not understand a concept is to:', options: ['Memorise it', 'Break it into smaller parts', 'Skip it', 'Wait for the exam'], correctIndex: 1, explanation: 'Decomposing a topic makes the gaps in understanding visible.' },
  { text: 'Which of these is a primary source?', options: ['A textbook summary', 'A letter written at the time of the event', 'An encyclopedia', 'A documentary'], correctIndex: 1, explanation: 'Primary sources are first-hand evidence from the period being studied.' },
  { text: 'What is the best way to take notes during a lecture?', options: ['Write everything', 'Summarise in your own words', 'Take no notes', 'Only copy slides'], correctIndex: 1, explanation: 'Paraphrasing forces you to process the material.' },
  { text: 'Which habit most improves long study sessions?', options: ['Short regular breaks', 'No breaks', 'Studying late at night only', 'Multitasking'], correctIndex: 0, explanation: 'Short breaks restore attention and retention.' },
  { text: 'What should you do before submitting an assignment?', options: ['Proofread and check the requirements', 'Submit immediately', 'Add more pages', 'Delete the introduction'], correctIndex: 0, explanation: 'Reviewing against the brief catches avoidable mistakes.' },
  { text: 'In multiple choice tests, a sensible strategy for a hard question is to:', options: ['Eliminate clearly wrong options', 'Always pick option C', 'Leave it blank without thinking', 'Pick the longest option'], correctIndex: 0, explanation: 'Elimination raises the chance of choosing correctly.' },
  { text: 'Setting SMART goals means goals should be:', options: ['Specific and measurable', 'Vague and flexible', 'Secret', 'Unlimited'], correctIndex: 0, explanation: 'SMART: Specific, Measurable, Achievable, Relevant, Time-bound.' },
  { text: 'Why is feedback on assignments valuable?', options: ['It shows how to improve', 'It only gives a grade', 'It replaces studying', 'It is optional noise'], correctIndex: 0, explanation: 'Feedback highlights strengths and next steps.' },
];

export function sampleQuestionsFor(course: { title: string; slug: string; category?: string | null }): SampleQuestion[] {
  const key = `${course.title} ${course.slug} ${course.category || ''}`.toLowerCase();
  if (key.includes('food') || key.includes('cuisine')) return FOOD;
  if (key.includes('civili') || key.includes('ancient') || key.includes('history')) return CIVILIZATIONS;
  return GENERAL;
}
