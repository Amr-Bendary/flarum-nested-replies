function extractPostMentionId(html) {
  if (typeof html !== 'string' || html === '') return null;

  // Rendered mention anchor, e.g. <a ... class="PostMention" data-id="123">.
  // Attribute order is not guaranteed, so try both arrangements.
  const anchor =
    /<a\b[^>]*\bclass="[^"]*\bPostMention\b[^"]*"[^>]*\bdata-id="(\d+)"/i.exec(html) ||
    /<a\b[^>]*\bdata-id="(\d+)"[^>]*\bclass="[^"]*\bPostMention\b[^"]*"/i.exec(html);

  return anchor ? anchor[1] : null;
}

export function getReplyTarget(post) {
  if (!post || typeof post.contentHtml !== 'function') return null;

  const html = post.contentHtml();
  if (typeof html !== 'string' || html === '') return null;

  // The post mention Flarum already rendered, e.g.
  // <a href="/d/2-x/1" class="PostMention" data-id="4">admin</a>
  const anchor = /<a\b([^>]*\bclass="[^"]*\bPostMention\b[^"]*"[^>]*)>([\s\S]*?)<\/a>/i.exec(html);
  if (!anchor) return null;

  const attrs = anchor[1];
  const hrefMatch = /\bhref="([^"]*)"/i.exec(attrs);
  const idMatch = /\bdata-id="([^"]*)"/i.exec(attrs);
  const name = anchor[2]
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!name && !hrefMatch && !idMatch) return null;

  return {
    id: idMatch ? idMatch[1] : null,
    href: hrefMatch ? hrefMatch[1] : null,
    name,
  };
}

export function getParentId(post) {
  if (!post) return null;

  // Flarum 2.x exposes the mentioned posts as models.
  if (typeof post.mentionsPosts === 'function') {
    const mentions = post.mentionsPosts();
    if (Array.isArray(mentions) && mentions.length > 0) {
      const first = mentions[0];
      if (first && typeof first.id === 'function') {
        return String(first.id());
      }
    }
  }

  // Flarum 1.x has no mentionsPosts(); the mention is rendered into contentHtml.
  if (typeof post.contentHtml === 'function') {
    const fromHtml = extractPostMentionId(post.contentHtml());
    if (fromHtml) return fromHtml;
  }

  // Last resort: the raw mention syntax, e.g. `@"admin"#p123`.
  if (typeof post.content === 'function') {
    const raw = /#p(\d+)/.exec(post.content() || '');
    if (raw) return raw[1];
  }

  return null;
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

    // Replying to the original post inserts a mention of it. Such a reply is a
    // top-level reply, not a nested one, so the OP never counts as a level.
    if (isOriginalPost(parent)) break;

    current = parent;
    depth += 1;
  }

  return depth;
}

export function isHidden(post, collapsedSet, getPostById) {
  return getAncestorIds(post, getPostById).some((id) => collapsedSet.has(id));
}
