import { describe, it, expect } from 'vitest';
import { readSettings } from './settings';

function fakeApp(attrs) {
  return { forum: { attribute: (name) => attrs[name] } };
}

describe('readSettings', () => {
  it('uses the serialized forum attributes', () => {
    const settings = readSettings(
      fakeApp({
        nestedRepliesEnabled: false,
        nestedRepliesMaxDepth: 3,
        nestedRepliesShowVotes: false,
        nestedRepliesShowReplyTag: false,
        nestedRepliesShowRepliedIndicator: false,
        nestedRepliesLikeColor: '#00ff00',
        nestedRepliesStartAtFirstPost: false,
        nestedRepliesAutoFoldThreshold: 7,
      })
    );
    expect(settings).toEqual({
      enabled: false,
      maxDepth: 3,
      showVotes: false,
      showReplyTag: false,
      showRepliedIndicator: false,
      likeColor: '#00ff00',
      startAtFirstPost: false,
      autoFoldThreshold: 7,
    });
  });

  it('falls back to defaults when attributes are missing', () => {
    expect(readSettings(fakeApp({}))).toEqual({
      enabled: true,
      maxDepth: 5,
      showVotes: true,
      showReplyTag: true,
      showRepliedIndicator: true,
      likeColor: '#ff4500',
      startAtFirstPost: true,
      autoFoldThreshold: 5,
    });
  });

  it('falls back to defaults when app is absent', () => {
    expect(readSettings(null)).toEqual({
      enabled: true,
      maxDepth: 5,
      showVotes: true,
      showReplyTag: true,
      showRepliedIndicator: true,
      likeColor: '#ff4500',
      startAtFirstPost: true,
      autoFoldThreshold: 5,
    });
  });

  it('reads the serialized attributes from the initial payload before boot', () => {
    const app = {
      data: {
        resources: [
          {
            type: 'forums',
            id: '1',
            attributes: { nestedRepliesShowReplyTag: false, nestedRepliesShowRepliedIndicator: false, nestedRepliesMaxDepth: 2 },
          },
        ],
      },
    };
    expect(readSettings(app)).toEqual({
      enabled: true,
      maxDepth: 2,
      showVotes: true,
      showReplyTag: false,
      showRepliedIndicator: false,
      likeColor: '#ff4500',
      startAtFirstPost: true,
      autoFoldThreshold: 5,
    });
  });
});
