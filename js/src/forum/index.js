import { extend, override } from 'flarum/common/extend';
import app from 'flarum/forum/app';
import icon from 'flarum/common/helpers/icon';
import Post from 'flarum/forum/components/Post';
import CommentPost from 'flarum/forum/components/CommentPost';
import PostStream from 'flarum/forum/components/PostStream';
import { readSettings } from '../common/settings';
import { createVoteAdapter } from '../common/voteAdapter';
import { getDepth, isHidden, isOriginalPost, getReplyTarget } from './utils/threadDepths';
import VoteRail from './components/VoteRail';
import CollapseToggle from './components/CollapseToggle';

app.initializers.add('itqan-nested-replies', () => {
  const settings = readSettings(app);
  if (!settings.enabled) return;

  const votes = createVoteAdapter(app);
  const collapsed = new Set();
  const mounted = new Set();
  const lookup = (id) => app.store.getById('posts', String(id));

  // Core mentions renders a "You replied to this." summary; hide it globally
  // when the admin turns the indicator off.
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.classList.toggle('RedditHideMentionedBy', !settings.showRepliedIndicator);
  }

  function decorate(component) {
    const post = component.attrs.post;
    const element = component.$ ? component.$()[0] : null;
    if (!post || !element) return;

    const id = String(post.id());
    const depth = getDepth(post, settings.maxDepth, lookup);
    const hidden = isHidden(post, collapsed, lookup);
    const op = isOriginalPost(post);

    element.classList.add('RedditPost');
    element.classList.toggle('RedditPost--op', op);

    // Flarum 2.x ships a `.Post-container` wrapper; 1.x has an unnamed div.
    // Tag it ourselves so the LESS works on both.
    const container = element.firstElementChild;
    if (container) container.classList.add('RedditPost-container');

    element.dataset.depth = String(depth);
    element.style.setProperty('--depth', String(depth));

    // Tag the stream item so the reply card can draw separators between
    // top-level replies only, and never between nested ones.
    const item = element.parentElement;
    if (item && item.classList && item.classList.contains('PostStream-item')) {
      item.classList.toggle('is-top-level', depth === 0 && !op);
      item.classList.toggle('is-nested', depth > 0);
    }

    if (collapsed.has(id)) element.dataset.collapsed = 'true';
    else delete element.dataset.collapsed;

    if (hidden) element.dataset.hidden = 'true';
    else delete element.dataset.hidden;

    // The reply target is shown as a tag in the header, so hide the inline
    // mention Flarum renders at the start of the body.
    if (settings.showReplyTag) {
      const body = element.querySelector('.Post-body') || element.querySelector('.Post-content');
      if (body) {
        const mention = body.querySelector('a.PostMention');
        if (mention) mention.classList.add('RedditReplyTag-source');
      }
    }
  }

  // Flarum's post stream is a flat list. Reddit's layout wants the original
  // post in its own card and every reply inside a second card, so regroup the
  // rendered vnodes without touching core.
  override(PostStream.prototype, 'view', function (original) {
    const vnode = original();
    const children = vnode && Array.isArray(vnode.children) ? vnode.children : null;
    if (!children || !children.length) return vnode;

    const isPostItem = (child) => Boolean(child && child.attrs && child.attrs['data-id'] != null);
    const opIndex = children.findIndex((child) => child && child.attrs && String(child.attrs['data-number']) === '1');

    // If the original post isn't in the current page (e.g. scrolled into the
    // middle of a long discussion), leave the stream untouched.
    if (opIndex === -1) return vnode;

    const before = children.slice(0, opIndex);
    const op = children[opIndex];
    const rest = children.slice(opIndex + 1);
    const replies = rest.filter(isPostItem);
    const tail = rest.filter((child) => !isPostItem(child));

    const grouped = [...before, m('div.RedditThreadCard', { key: 'redditThreadCard' }, op)];

    if (replies.length) {
      grouped.push(m('div.RedditReplyCard', { key: 'redditReplyCard' }, replies));
    }

    grouped.push(...tail);

    return m('div.PostStream', vnode.attrs, grouped);
  });

  // Flarum 1.x skips a Post's redraw unless its SubtreeRetainer says a rebuild
  // is needed, so invalidate the mounted posts ourselves before redrawing.
  function forceRedraw() {
    mounted.forEach((post) => {
      if (post.subtree && typeof post.subtree.invalidate === 'function') {
        post.subtree.invalidate();
      }
    });

    m.redraw();
  }

  function toggleCollapse(post) {
    const id = String(post.id());

    if (collapsed.has(id)) collapsed.delete(id);
    else collapsed.add(id);

    forceRedraw();
  }

  extend(Post.prototype, 'oncreate', function () {
    mounted.add(this);
    decorate(this);
  });

  extend(Post.prototype, 'onupdate', function () {
    decorate(this);
  });

  extend(Post.prototype, 'onremove', function () {
    mounted.delete(this);
  });

  // Surface who a reply answers as a tag in the header, instead of the inline
  // mention Flarum renders at the start of the body.
  extend(CommentPost.prototype, 'headerItems', function (items) {
    if (!settings.showReplyTag) return;

    const post = this.attrs.post;
    const target = getReplyTarget(post);

    if (!target || !target.name) return;

    items.add(
      'redditReplyTag',
      m('a.RedditReplyTag', { href: target.href || '#', title: target.name }, [
        icon('fas fa-reply'),
        m('span.RedditReplyTag-label', app.translator.trans('itqan-nested-replies.forum.reply_to', { username: target.name })),
      ]),
      95
    );
  });

  // Add the controls to the post action bar (next to Reply / Like).
  extend(Post.prototype, 'actionItems', function (items) {
    const post = this.attrs.post;
    if (!post) return;

    if (settings.showVotes) {
      items.add('redditVotes', m(VoteRail, { post, adapter: votes }), 10);
    }

    items.add(
      'redditCollapse',
      m(CollapseToggle, {
        collapsed: collapsed.has(String(post.id())),
        onclick: () => toggleCollapse(post),
      }),
      9
    );
  });
});
