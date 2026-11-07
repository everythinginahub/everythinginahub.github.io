// Small, untimed games made from existing flashcard pairs. Indices always refer
// to the original cards; playing never rearranges or edits the source set.
const key = value => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
export function uniqueGameCards(cards) {
  const questions = new Set(), answers = new Set(), result = [];
  if (!Array.isArray(cards)) return result;
  cards.forEach((card, index) => {
    if (!Array.isArray(card) || card.length !== 2 || !card.every(v => typeof v === 'string' && v.trim())) return;
    const question = card[0].trim(), answer = card[1].trim();
    const q = key(question), a = key(answer);
    // Duplicate prompts or answers make matching and multiple-choice ambiguous.
    if (questions.has(q) || answers.has(a)) return;
    questions.add(q); answers.add(a); result.push({ id: index, question, answer });
  });
  return result;
}
export function shuffled(items, random = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
export function createMatch(cards, random = Math.random) {
  const pairs = shuffled(uniqueGameCards(cards), random).slice(0, 5);
  if (pairs.length < 2) return null;
  return { mode: 'match', pairs, questions: shuffled(pairs, random), answers: shuffled(pairs, random), question: null, answer: null, matched: [], attempts: 0, message: 'Choose a question, then its matching answer.', complete: false };
}
export function selectMatch(game, side, id) {
  if (!game || game.mode !== 'match' || game.complete || !['question', 'answer'].includes(side) || !game.pairs.some(pair => pair.id === id) || game.matched.includes(id)) return false;
  game[side] = game[side] === id ? null : id;
  if (game.question === null || game.answer === null) {
    game.message = game[side] === null ? 'Selection cleared.' : `Now choose ${side === 'question' ? 'an answer' : 'a question'}.`;
    return true;
  }
  game.attempts++;
  if (game.question === game.answer) {
    game.matched.push(game.question);
    game.complete = game.matched.length === game.pairs.length;
    game.message = game.complete ? 'All pairs matched. Great work!' : `Match found! ${game.matched.length} of ${game.pairs.length} pairs matched.`;
  } else game.message = 'Not a match. Try another pair.';
  game.question = null; game.answer = null;
  return true;
}
export function createQuiz(cards, random = Math.random) {
  const pairs = uniqueGameCards(cards);
  if (pairs.length < 2) return null;
  const questions = shuffled(pairs, random).slice(0, 10).map(pair => {
    const others = shuffled(pairs.filter(other => other.id !== pair.id), random).slice(0, 3);
    return { ...pair, choices: shuffled([pair, ...others], random).map(item => ({ id: item.id, text: item.answer })) };
  });
  return { mode: 'quiz', questions, position: 0, selected: null, correct: 0, missed: [], complete: false, message: '' };
}
export function answerQuiz(game, id) {
  const current = game?.questions?.[game.position];
  if (!game || game.mode !== 'quiz' || game.complete || game.selected !== null || !current?.choices.some(choice => choice.id === id)) return false;
  game.selected = id;
  if (id === current.id) { game.correct++; game.message = 'Correct!'; }
  else { game.missed.push({ question: current.question, answer: current.answer }); game.message = 'Not quite. The answer is shown below.'; }
  return true;
}
export function advanceQuiz(game) {
  if (!game || game.mode !== 'quiz' || game.complete || game.selected === null) return false;
  if (game.position + 1 === game.questions.length) { game.complete = true; game.message = 'Quiz complete.'; }
  else { game.position++; game.selected = null; game.message = ''; }
  return true;
}

export function createRecall(cards, random = Math.random) {
  const questions = shuffled(uniqueGameCards(cards), random).slice(0, 10);
  if (!questions.length) return null;
  return { mode: 'recall', questions, position: 0, revealed: false, response: '', correct: 0, missed: [], complete: false, message: '' };
}
export function revealRecall(game, response) {
  if (!game || game.mode !== 'recall' || game.complete || game.revealed || typeof response !== 'string') return false;
  game.response = response.slice(0, 1000).trim();
  game.revealed = true;
  game.message = 'Answer revealed. Compare it with your response and choose how you did.';
  return true;
}
export function markRecall(game, remembered) {
  if (!game || game.mode !== 'recall' || game.complete || !game.revealed || typeof remembered !== 'boolean') return false;
  const current = game.questions[game.position];
  if (remembered) game.correct++;
  else game.missed.push({ question: current.question, answer: current.answer });
  if (game.position + 1 === game.questions.length) { game.complete = true; game.message = 'Recall round complete.'; }
  else { game.position++; game.revealed = false; game.response = ''; game.message = ''; }
  return true;
}
