export function getParentId(post) {
  if (!post || typeof post.mentionsPosts !== "function") return null;

  const mentions = post.mentionsPosts();
  if (!Array.isArray(mentions) || mentions.length === 0) return null;

  const first = mentions[0];
  if (!first || typeof first.id !== "function") return null;

  return String(first.id());
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

    current = parent;
    depth += 1;
  }

  return depth;
}

export function isHidden(post, collapsedSet, getPostById) {
  return getAncestorIds(post, getPostById).some((id) => collapsedSet.has(id));
}
