import { test } from 'node:test';
import assert from 'node:assert/strict';
import { videos, filterVideos } from '../public/videos.js';
import { subjectCatalog } from '../public/subject-catalog.js';

test('selected videos have unique IDs, known subjects and secure external watch links', () => {
  assert.ok(videos.length >= 20);
  assert.equal(new Set(videos.map(video => video.id)).size, videos.length);
  for (const video of videos) {
    assert.ok(video.title && video.creator && video.description && video.level);
    assert.ok(video.subjects.length && video.subjects.every(subject => subjectCatalog.includes(subject)));
    const url = new URL(video.url);
    assert.equal(url.protocol, 'https:');
    assert.equal(url.hostname, 'www.youtube.com');
    assert.equal(url.pathname, '/watch');
    assert.match(url.searchParams.get('v'), /^[A-Za-z0-9_-]{11}$/);
  }
});

test('video filtering respects selected subjects, a specific subject, all subjects and search', () => {
  const mine=filterVideos(videos, '', 'My subjects', ['Biology']);
  assert.ok(mine.some(video => video.id === 'bio-osmosis'));
  assert.ok(mine.every(video => video.subjects.includes('Biology')));
  assert.equal(filterVideos(videos, 'OSMOSIS', 'All subjects', []).length, 1);
  assert.equal(filterVideos(videos, 'Cognito', 'Mathematics', ['Biology']).length, 0);
  assert.ok(filterVideos(videos, 'cognito', 'Combined Science', []).length > 0);
  assert.equal(filterVideos(videos, '', 'My subjects', ['Custom subject']).length, 0);
});
