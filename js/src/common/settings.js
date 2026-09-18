export function readSettings(app) {
  const read = (name, fallback) => {
    if (!app || !app.forum || typeof app.forum.attribute !== 'function') return fallback;
    const value = app.forum.attribute(name);
    return value === undefined || value === null ? fallback : value;
  };

  return {
    enabled: Boolean(read('redditRepliesEnabled', true)),
    maxDepth: Number(read('redditRepliesMaxDepth', 5)) || 0,
    showVotes: Boolean(read('redditRepliesShowVotes', true)),
  };
}
