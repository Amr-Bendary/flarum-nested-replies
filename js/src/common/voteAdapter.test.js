import { describe, it, expect, vi } from 'vitest';
import { createVoteAdapter } from './voteAdapter';

function fakeApp(extensions) {
  return { extensions };
}

function fakePost(attrs = {}) {
  return {
    attribute: (name) => attrs[name],
    save: vi.fn((data) => Promise.resolve(data)),
  };
}

describe('createVoteAdapter', () => {
  it('reports unavailable when fof/gamification is absent', () => {
    expect(createVoteAdapter(fakeApp({})).isAvailable()).toBe(false);
  });

  it('detects fof-gamification', () => {
    expect(createVoteAdapter(fakeApp({ 'fof-gamification': {} })).isAvailable()).toBe(true);
  });

  it('reads the score and the current user vote when available', () => {
    const adapter = createVoteAdapter(fakeApp({ 'fof-gamification': {} }));
    const post = fakePost({ votes: 7, vote: 'up' });
    expect(adapter.getScore(post)).toBe(7);
    expect(adapter.getUserVote(post)).toBe('up');
  });

  it('returns null score and vote when unavailable', () => {
    const adapter = createVoteAdapter(fakeApp({}));
    const post = fakePost({ votes: 7, vote: 'up' });
    expect(adapter.getScore(post)).toBeNull();
    expect(adapter.getUserVote(post)).toBeNull();
  });

  it('saves an up vote through post.save', async () => {
    const adapter = createVoteAdapter(fakeApp({ 'fof-gamification': {} }));
    const post = fakePost();
    await adapter.vote(post, 'up');
    expect(post.save).toHaveBeenCalledWith({ vote: 'up' });
  });

  it('clears a vote by saving null', async () => {
    const adapter = createVoteAdapter(fakeApp({ 'fof-gamification': {} }));
    const post = fakePost();
    await adapter.vote(post, null);
    expect(post.save).toHaveBeenCalledWith({ vote: null });
  });

  it('does not call save when unavailable', async () => {
    const adapter = createVoteAdapter(fakeApp({}));
    const post = fakePost();
    await adapter.vote(post, 'up');
    expect(post.save).not.toHaveBeenCalled();
  });
});
