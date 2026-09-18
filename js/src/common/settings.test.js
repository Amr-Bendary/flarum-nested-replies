import { describe, it, expect } from 'vitest';
import { readSettings } from './settings';

function fakeApp(attrs) {
  return { forum: { attribute: (name) => attrs[name] } };
}

describe('readSettings', () => {
  it('uses the serialized forum attributes', () => {
    const settings = readSettings(
      fakeApp({
        redditRepliesEnabled: false,
        redditRepliesMaxDepth: 3,
        redditRepliesShowVotes: false,
      })
    );
    expect(settings).toEqual({ enabled: false, maxDepth: 3, showVotes: false });
  });

  it('falls back to defaults when attributes are missing', () => {
    expect(readSettings(fakeApp({}))).toEqual({ enabled: true, maxDepth: 5, showVotes: true });
  });

  it('falls back to defaults when app is absent', () => {
    expect(readSettings(null)).toEqual({ enabled: true, maxDepth: 5, showVotes: true });
  });
});
