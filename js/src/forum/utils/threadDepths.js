export function getParentId(post) {
  if (!post || typeof post.attribute !== 'function') return null;

  const parentId = post.attribute('replyToPostId');
  if (parentId == null || parentId === '') return null;

  return String(parentId);
}

export function getReplyTarget(post, getPostById) {
  const parentId = getParentId(post);
  if (!parentId) return null;

  const parent = getPostById ? getPostById(parentId) : null;
  if (!parent) return null;

  const user = typeof parent.user === 'function' ? parent.user() : null;
  const name = user && typeof user.displayName === 'function' ? user.displayName() : null;

  return { id: parentId, name, post: parent };
}

export function getAncestorIds(post, getPostById) {
  const ids = [];
  const seen = new Set();
  let current = post;

  while (current) {
    const currentId = String(current.id());
    if (seen.has(currentId)) break;
    seen.add(currentId);

    const parentId = getParentId(current);
    if (!parentId) break;

    ids.push(parentId);
    current = getPostById ? getPostById(parentId) : null;
  }

  return ids;
}

export function isOriginalPost(post) {
  return Boolean(post && typeof post.number === 'function' && post.number() === 1);
}

export function getDepth(post, maxDepth = Infinity, getPostById = null) {
  if (!post) return 0;

  let depth = 0;
  const seen = new Set();
  let current = post;

  while (current && depth < maxDepth) {
    const currentId = String(current.id());
    if (seen.has(currentId)) break;
    seen.add(currentId);

    const parentId = getParentId(current);
    if (!parentId) break;

    const parent = getPostById ? getPostById(parentId) : null;
    if (!parent) break;

    // Replying to the original post is a top-level reply, not a nested level.
    if (isOriginalPost(parent)) break;

    current = parent;
    depth += 1;
  }

  return depth;
}

export function isHidden(post, collapsedSet, getPostById) {
  return getAncestorIds(post, getPostById).some((id) => collapsedSet.has(id));
}
