import { test } from 'node:test';
import assert from 'node:assert/strict';
import { uniqueGameCards, shuffled, createMatch, selectMatch, createQuiz, answerQuiz, advanceQuiz, createRecall, revealRecall, markRecall } from '../public/games.js';
import { starterDecks } from '../public/starter-decks.js';

const cards=[['One?','First'],['Two?','Second'],['Three?','Third'],['Four?','Fourth'],['Five?','Fifth'],['Six?','Sixth']];
const random=()=>0.3;
test('games ignore incomplete and ambiguous cards without changing source indices',()=>{
  const input=[[' What? ',' Yes '],['what?', 'No'],['Other?', 'YES'],['Third?','Maybe'],['', 'no'],['Missing'],null];
  const snapshot=structuredClone(input);assert.deepEqual(uniqueGameCards(input),[{id:0,question:'What?',answer:'Yes'},{id:3,question:'Third?',answer:'Maybe'}]);assert.deepEqual(input,snapshot);
  assert.deepEqual(uniqueGameCards(null),[]);assert.equal(createMatch([['Q','A']]),null);assert.equal(createQuiz([['Q','A'],['Q2','a']]),null);
  assert.deepEqual([...shuffled([1,2,3],random)].sort(),[1,2,3]);
});
test('match accepts either order, handles mistakes and completes without repeated credit',()=>{
  const game=createMatch(cards,random);assert.equal(game.pairs.length,5);const [first,second]=game.pairs;
  assert.equal(selectMatch(game,'answer',first.id),true);assert.equal(selectMatch(game,'answer',first.id),true);assert.equal(game.answer,null);
  selectMatch(game,'question',first.id);selectMatch(game,'answer',second.id);assert.equal(game.attempts,1);assert.equal(game.matched.length,0);assert.match(game.message,/Not a match/);
  for(const pair of game.pairs){selectMatch(game,'answer',pair.id);selectMatch(game,'question',pair.id);}
  assert.equal(game.complete,true);assert.equal(game.matched.length,5);assert.equal(game.attempts,6);assert.equal(selectMatch(game,'question',first.id),false);
  assert.equal(selectMatch(game,'invalid',first.id),false);
});
test('quiz gives unique options, accurate feedback and a review list',()=>{
  const game=createQuiz(cards,random);assert.equal(game.questions.length,6);
  for(const [i,question] of game.questions.entries()){
    assert.equal(new Set(question.choices.map(c=>c.text)).size,4);assert.ok(question.choices.some(c=>c.id===question.id));
    assert.equal(advanceQuiz(game),false);
    const answer=i===0?question.choices.find(c=>c.id!==question.id).id:question.id;
    assert.equal(answerQuiz(game,answer),true);assert.equal(answerQuiz(game,question.id),false);assert.equal(advanceQuiz(game),true);
  }
  assert.equal(game.complete,true);assert.equal(game.correct,5);assert.deepEqual(game.missed,[{question:game.questions[0].question,answer:game.questions[0].answer}]);assert.equal(advanceQuiz(game),false);
});
test('two-card sets create two answer options and no more than ten questions',()=>{
  const short=createQuiz(cards.slice(0,2),random);assert.equal(short.questions.length,2);assert.ok(short.questions.every(q=>q.choices.length===2));
  const many=Array.from({length:20},(_,i)=>[`Question ${i}`,`Answer ${i}`]);assert.equal(createQuiz(many,random).questions.length,10);
});
test('every starter set can create both games without modifying original cards',()=>{
  for(const deck of starterDecks){const snapshot=JSON.stringify(deck.cards);assert.ok(createMatch(deck.cards,random),`${deck.id} match`);assert.ok(createQuiz(deck.cards,random),`${deck.id} quiz`);assert.ok(createRecall(deck.cards,random),`${deck.id} recall`);assert.equal(JSON.stringify(deck.cards),snapshot);}
});

test('written recall reveals the answer and records only the learner’s self-assessment',()=>{
  const game=createRecall(cards.slice(0,2),random);assert.equal(markRecall(game,true),false);
  assert.equal(revealRecall(game,'My own words'),true);assert.equal(game.response,'My own words');assert.equal(revealRecall(game,'again'),false);
  assert.equal(markRecall(game,false),true);assert.equal(game.response,'');assert.equal(game.missed.length,1);
  assert.equal(revealRecall(game,''),true);assert.equal(markRecall(game,true),true);assert.equal(game.complete,true);assert.equal(game.correct,1);assert.equal(markRecall(game,true),false);
  assert.ok(createRecall([['A','B']],random));assert.equal(createRecall([],random),null);
});
