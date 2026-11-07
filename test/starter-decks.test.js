import { test } from 'node:test';
import assert from 'node:assert/strict';
import { starterDecks, subjects } from '../public/starter-decks.js';
import { starterExpansions } from '../public/starter-expansions.js';

test('all built-in flashcard sets contain at least 20 distinct, complete cards', () => {
  assert.equal(starterDecks.length, 105);
  assert.equal(new Set(starterDecks.map(deck => deck.id)).size, starterDecks.length);
  assert.ok(Object.keys(starterExpansions).every(id => starterDecks.some(deck => deck.id === id)));
  assert.equal(starterDecks.reduce((total, deck) => total + deck.cards.length, 0), 2100);
  for (const deck of starterDecks) {
    assert.ok(deck.cards.length >= 20, `${deck.id} has only ${deck.cards.length} cards`);
    const questions = deck.cards.map(([question, answer]) => {
      assert.ok(typeof question === 'string' && question.trim(), `${deck.id} has an empty question`);
      assert.ok(typeof answer === 'string' && answer.trim(), `${deck.id} has an empty answer`);
      return question.trim().toLowerCase();
    });
    assert.equal(new Set(questions).size, questions.length, `${deck.id} repeats a question`);
  }
});

test('original cards remain at their original indices for saved review progress', () => {
  const originalQuestions = {
    biology: ['What does the nucleus contain?', 'Where does aerobic respiration occur?', 'What does the cell membrane do?'],
    maths: ['How do you solve 2x + 6 = 14?', 'What is the gradient of a straight line?', 'How do you expand 3(x + 2)?'],
    'bio-transport': ['What is diffusion?', 'What is osmosis?', 'What is active transport?', 'Name one factor that increases the rate of diffusion.', 'Why do root hair cells have a large surface area?'],
    'physics-waves': ['What is wavelength?', 'What is frequency?', 'What is the wave speed equation?', 'What is a transverse wave?', 'Are electromagnetic waves transverse or longitudinal?'],
    'welsh-intro': ['What does “bore da” mean?', 'What does “diolch” mean?', 'What does “ie” mean?']
  };
  for (const [id, questions] of Object.entries(originalQuestions)) {
    const deck = starterDecks.find(item => item.id === id);
    assert.deepEqual(deck.cards.slice(0, questions.length).map(card => card[0]), questions);
  }
  for (const subject of subjects) {
    assert.deepEqual(starterDecks.find(deck => deck.id === subject.id).cards.slice(0, subject.cards.length), subject.cards);
  }
});

test('every listed subject has at least one starter set', async () => {
  const { subjectCatalog } = await import('../public/subject-catalog.js');
  for (const subject of subjectCatalog) assert.ok(starterDecks.some(deck => deck.subject === subject), `${subject} has no starter set`);
  assert.ok(starterDecks.every(deck => subjectCatalog.includes(deck.subject)));
});
