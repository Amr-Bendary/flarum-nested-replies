import { describe, it, expect } from 'vitest';
import { getParentId, getDepth, getAncestorIds, isHidden, getReplyTarget } from './threadDepths';

function build(pairs) {
  const posts = {};

  function makePost(id, parentId) {
    return {
      id: () => String(id),
      number: () => Number(id),
      mentionsPosts: () => (parentId == null ? [] : [posts[parentId]]),
    };
  }

  for (const [id, parent] of pairs) {
    posts[id] = makePost(id, parent);
  }

  return { posts, lookup: (id) => posts[String(id)] || null };
}

describe('getParentId', () => {
  it('reads the parent id from the first post mention', () => {
    const post = {
      id: () => '5',
      mentionsPosts: () => [{ id: () => '4' }, { id: () => '3' }],
    };
    expect(getParentId(post)).toBe('4');
  });

  it('returns null without mentions', () => {
    expect(getParentId({ id: () => '1', mentionsPosts: () => [] })).toBeNull();
    expect(getParentId({ id: () => '1' })).toBeNull();
  });

  it('falls back to the rendered mention in contentHtml (Flarum 1.x)', () => {
    const post = {
      id: () => '7',
      contentHtml: () => '<p>Reply to <a href="/d/2/1" class="PostMention" data-id="4">admin</a></p>',
    };
    expect(getParentId(post)).toBe('4');
  });

  it('handles reversed attribute order in contentHtml', () => {
    const post = { id: () => '7', contentHtml: () => '<a data-id="9" class="PostMention">x</a>' };
    expect(getParentId(post)).toBe('9');
  });

  it('falls back to the raw mention syntax', () => {
    const post = { id: () => '7', content: () => 'hi @"admin"#p12' };
    expect(getParentId(post)).toBe('12');
  });

  it('prefers mentionsPosts() when available', () => {
    const post = {
      id: () => '7',
      mentionsPosts: () => [{ id: () => '4' }],
      contentHtml: () => '<a class="PostMention" data-id="99">x</a>',
    };
    expect(getParentId(post)).toBe('4');
  });
});

describe('getReplyTarget', () => {
  it('extracts the name, href and id from the first post mention', () => {
    const post = {
      contentHtml: () => '<p>hi <a href="/d/2-x/1" class="PostMention" data-id="4">admin</a> there</p>',
    };
    expect(getReplyTarget(post)).toEqual({ id: '4', href: '/d/2-x/1', name: 'admin' });
  });

  it('handles reversed attribute order', () => {
    const post = { contentHtml: () => '<a data-id="7" class="PostMention" href="/d/2-x/3">sara</a>' };
    expect(getReplyTarget(post)).toEqual({ id: '7', href: '/d/2-x/3', name: 'sara' });
  });

  it('returns null when there is no post mention', () => {
    expect(getReplyTarget({ contentHtml: () => '<p>plain reply</p>' })).toBeNull();
    expect(getReplyTarget({ contentHtml: () => '' })).toBeNull();
    expect(getReplyTarget({})).toBeNull();
    expect(getReplyTarget(null)).toBeNull();
  });

  it('ignores user mentions', () => {
    const post = { contentHtml: () => '<a class="UserMention" data-id="9">bob</a>' };
    expect(getReplyTarget(post)).toBeNull();
  });
});

describe('getDepth', () => {
  it('returns 0 for a root post', () => {
    const { posts, lookup } = build([['1', null]]);
    expect(getDepth(posts['1'], 10, lookup)).toBe(0);
  });

  it('treats a reply that mentions the original post as top-level', () => {
    const { posts, lookup } = build([
      ['1', null],
      ['2', '1'],
    ]);
    expect(getDepth(posts['2'], 10, lookup)).toBe(0);
  });

  it('does not count the original post in the ancestor depth', () => {
    const { posts, lookup } = build([
      ['1', null],
      ['2', '1'],
      ['3', '2'],
    ]);
    expect(getDepth(posts['3'], 10, lookup)).toBe(1);
  });

  it('counts nested ancestors below the first reply', () => {
    const { posts, lookup } = build([
      ['1', null],
      ['2', '1'],
      ['3', '2'],
      ['4', '3'],
    ]);
    expect(getDepth(posts['4'], 10, lookup)).toBe(2);
  });

  it('caps the depth at maxDepth', () => {
    const { posts, lookup } = build([
      ['1', null],
      ['2', '1'],
      ['3', '2'],
      ['4', '3'],
    ]);
    expect(getDepth(posts['4'], 1, lookup)).toBe(1);
  });

  it('treats an unloaded parent as a root', () => {
    const orphan = {
      id: () => '9',
      mentionsPosts: () => [{ id: () => '404' }],
    };
    expect(getDepth(orphan, 10, () => null)).toBe(0);
  });

  it('terminates on a cyclic mention graph', () => {
    const a = { id: () => '1' };
    const b = { id: () => '2', mentionsPosts: () => [a] };
    a.mentionsPosts = () => [b];
    const lookup = (id) => (String(id) === '1' ? a : b);
    expect(getDepth(a, 100, lookup)).toBe(2);
  });
});

describe('getAncestorIds', () => {
  it('lists ancestor ids nearest first', () => {
    const { posts, lookup } = build([
      ['1', null],
      ['2', '1'],
      ['3', '2'],
    ]);
    expect(getAncestorIds(posts['3'], lookup)).toEqual(['2', '1']);
  });
});

describe('isHidden', () => {
  it('is true when a collapsed ancestor exists', () => {
    const { posts, lookup } = build([
      ['1', null],
      ['2', '1'],
      ['3', '2'],
    ]);
    expect(isHidden(posts['3'], new Set(['2']), lookup)).toBe(true);
  });

  it('is false for the collapsed post itself and unrelated posts', () => {
    const { posts, lookup } = build([
      ['1', null],
      ['2', '1'],
      ['3', '2'],
    ]);
    expect(isHidden(posts['1'], new Set(['2']), lookup)).toBe(false);
    expect(isHidden(posts['2'], new Set(['2']), lookup)).toBe(false);
  });
});
