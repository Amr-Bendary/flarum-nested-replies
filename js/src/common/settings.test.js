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
        redditRepliesShowReplyTag: false,
        redditRepliesShowRepliedIndicator: false,
      })
    );
    expect(settings).toEqual({ enabled: false, maxDepth: 3, showVotes: false, showReplyTag: false, showRepliedIndicator: false });
  });

  it('falls back to defaults when attributes are missing', () => {
    expect(readSettings(fakeApp({}))).toEqual({ enabled: true, maxDepth: 5, showVotes: true, showReplyTag: true, showRepliedIndicator: true });
  });

  it('falls back to defaults when app is absent', () => {
    expect(readSettings(null)).toEqual({ enabled: true, maxDepth: 5, showVotes: true, showReplyTag: true, showRepliedIndicator: true });
  });

  it('reads the serialized attributes from the initial payload before boot', () => {
    const app = {
      data: {
        resources: [
          {
            type: 'forums',
            id: '1',
            attributes: { redditRepliesShowReplyTag: false, redditRepliesShowRepliedIndicator: false, redditRepliesMaxDepth: 2 },
          },
        ],
      },
    };
    expect(readSettings(app)).toEqual({ enabled: true, maxDepth: 2, showVotes: true, showReplyTag: false, showRepliedIndicator: false });
  });
});
