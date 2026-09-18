const GAMIFICATION_IDS = ['fof-gamification', 'fof/gamification'];

export function createVoteAdapter(app) {
  const extensions = (app && app.extensions) || {};
  const available = GAMIFICATION_IDS.some((id) => Boolean(extensions[id]));

  return {
    isAvailable: () => available,

    getScore(post) {
      if (!available || !post || typeof post.attribute !== 'function') return null;
      const value = post.attribute('votes');
      return typeof value === 'number' ? value : null;
    },

    getUserVote(post) {
      if (!available || !post || typeof post.attribute !== 'function') return null;
      const value = post.attribute('vote');
      return value === 'up' || value === 'down' ? value : null;
    },

    vote(post, direction) {
      if (!available || !post || typeof post.save !== 'function') return Promise.resolve();
      const value = direction === 'up' || direction === 'down' ? direction : null;
      return post.save({ vote: value });
    },
  };
}
