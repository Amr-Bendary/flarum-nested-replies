function forumAttribute(app, name) {
  if (!app) return undefined;

  // After boot, `app.forum` is the Forum model.
  if (app.forum && typeof app.forum.attribute === 'function') {
    const value = app.forum.attribute(name);
    if (value !== undefined && value !== null) return value;
  }

  // Flarum runs initializers before assigning `app.forum`, so fall back to the
  // initial JSON:API payload, which already contains the serialized forum.
  const resources = app.data && Array.isArray(app.data.resources) ? app.data.resources : [];
  const forum = resources.find((resource) => resource && resource.type === 'forums');
  const value = forum && forum.attributes ? forum.attributes[name] : undefined;

  return value === undefined || value === null ? undefined : value;
}

export function readSettings(app) {
  const read = (name, fallback) => {
    const value = forumAttribute(app, name);
    return value === undefined || value === null ? fallback : value;
  };

  return {
    enabled: Boolean(read('redditRepliesEnabled', true)),
    maxDepth: Number(read('redditRepliesMaxDepth', 5)) || 0,
    showVotes: Boolean(read('redditRepliesShowVotes', true)),
    showReplyTag: Boolean(read('redditRepliesShowReplyTag', true)),
    showRepliedIndicator: Boolean(read('redditRepliesShowRepliedIndicator', true)),
    likeColor: String(read('redditRepliesLikeColor', '#ff4500')),
    startAtFirstPost: Boolean(read('redditRepliesStartAtFirstPost', true)),
  };
}
