import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extraDecks, searchDecks } from '../public/decks.js';
test('starter catalogue has unique ids and complete question-answer pairs',()=>{
  assert.ok(extraDecks.length>=20);
  assert.equal(new Set(extraDecks.map(d=>d.id)).size,extraDecks.length);
  for(const deck of extraDecks) {
    assert.match(deck.id,/^[a-z0-9-]+$/);
    assert.ok(deck.subject && deck.title && deck.description);
    assert.ok(deck.cards.length>=3);
    for(const card of deck.cards) assert.ok(card.length===2 && card.every(s=>typeof s==='string' && s.trim()));
  }
});
test('search finds titles, subjects and card text, with combined subject filters',()=>{
  assert.ok(searchDecks(extraDecks,'aCtIvE transport','Biology').some(d=>d.id==='bio-transport'));
  assert.ok(searchDecks(extraDecks,'chloroplasts').some(d=>d.id==='bio-photosynthesis'));
  assert.equal(searchDecks(extraDecks,'photosynthesis','Mathematics').length,0);
  assert.equal(searchDecks(extraDecks,'this does not exist').length,0);
});
