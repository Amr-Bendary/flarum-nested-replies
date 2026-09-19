import { extend, override } from 'flarum/common/extend';
import app from 'flarum/forum/app';
import icon from 'flarum/common/helpers/icon';
import Button from 'flarum/common/components/Button';
import Post from 'flarum/forum/components/Post';
import CommentPost from 'flarum/forum/components/CommentPost';
import DiscussionControls from 'flarum/forum/utils/DiscussionControls';
import PostStream from 'flarum/forum/components/PostStream';
import ReplyPlaceholder from 'flarum/forum/components/ReplyPlaceholder';
import DiscussionListItem from 'flarum/forum/components/DiscussionListItem';
import { readSettings } from '../common/settings';
import { createVoteAdapter } from '../common/voteAdapter';
import { getDepth, isHidden, isOriginalPost, getReplyTarget, getParentId } from './utils/threadDepths';
import VoteRail from './components/VoteRail';
import CollapseToggle from './components/CollapseToggle';

app.initializers.add('mtareq-nested-replies', () => {
  const settings = readSettings(app);
  if (!settings.enabled) return;

  const votes = createVoteAdapter(app);
  const collapsed = new Set();
  const mounted = new Set();
  const lookup = (id) => app.store.getById('posts', String(id));

  // Reply-card sorting. `oldest` uses Flarum's native stream; the other modes
  // fetch every page first so pagination can't leave posts out of the order.
  let sortMode = 'oldest';
  let allPosts = null;
  let loadingAll = false;
  let currentDiscussion = null;
  let pendingParentId = null;

  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.classList.toggle('NestedRepliesHideMentionedBy', !settings.showRepliedIndicator);
    document.documentElement.style.setProperty('--nested-replies-like-color', settings.likeColor || '#ff4500');
  }

  // Ensure every post has a Reply action. flarum/mentions supplies one when it
  // is enabled; otherwise we add our own so threading still works.
  extend(CommentPost.prototype, 'actionItems', function (items) {
    if (items.has('reply')) return;

    const post = this.attrs.post;
    if (!post || post.isHidden()) return;
    if (app.session.user && !post.discussion().canReply()) return;

    items.add(
      'reply',
      m(
        Button,
        {
          className: 'Button Button--link',
          onclick: () => {
            pendingParentId = String(post.id());
            DiscussionControls.replyAction.call(post.discussion());
          },
        },
        app.translator.trans('mtareq-nested-replies.forum.reply_link')
      ),
      0
    );
  });

  // The tree follows the post whose Reply button was clicked, not mentions in
  // the body. Works for our button and, when enabled, mentions' button.
  if (typeof document !== 'undefined') {
    document.addEventListener(
      'click',
      (event) => {
        const target = event.target;
        const replyItem = target && target.closest ? target.closest('.item-reply') : null;

        if (replyItem) {
          const item = replyItem.closest('.PostStream-item[data-id]');
          // A .item-reply with no post ancestor is the discussion-level Reply.
          pendingParentId = item ? String(item.getAttribute('data-id')) : null;
          return;
        }

        if (target && target.closest && target.closest('.ReplyPlaceholder')) {
          pendingParentId = null;
        }
      },
      true
    );
  }

  // ComposerState.body is a { componentClass, attrs } descriptor, not the
  // component. Patch the reply composer's class so its data() carries the
  // stored parent, and clear the pending parent once it submits or closes.
  function patchReplyComposer(componentClass) {
    if (!componentClass || !componentClass.prototype) return;

    const proto = componentClass.prototype;
    if (proto.__nestedRepliesParentPatched) return;
    proto.__nestedRepliesParentPatched = true;

    const originalData = proto.data;
    proto.data = function () {
      const data = (originalData ? originalData.call(this) : {}) || {};
      if (pendingParentId != null) data.replyToPostId = pendingParentId;
      return data;
    };

    const originalSubmit = proto.onsubmit;
    proto.onsubmit = function (...args) {
      const result = originalSubmit ? originalSubmit.apply(this, args) : undefined;
      pendingParentId = null;
      return result;
    };

    const originalRemove = proto.onremove;
    proto.onremove = function (...args) {
      pendingParentId = null;
      return originalRemove ? originalRemove.apply(this, args) : undefined;
    };
  }

  if (app.composer && typeof app.composer.load === 'function') {
    override(app.composer, 'load', function (original, componentClass, attrs) {
      const result = original.call(this, componentClass, attrs);

      const apply = () => {
        const body = this.body;
        if (body && body.attrs && body.attrs.discussion && !body.attrs.post) {
          patchReplyComposer(body.componentClass);
        }
      };

      if (result && typeof result.then === 'function') {
        result.then(apply);
      } else {
        apply();
      }

      return result;
    });
  }

  // Flarum's discussion-list links resume at the first unread post. Optionally
  // open discussions at the top so readers start with the original post.
  if (settings.startAtFirstPost) {
    override(DiscussionListItem.prototype, 'getJumpTo', function (original) {
      // Keep search-result jumps so the matched post is still highlighted.
      if (this.attrs.params && this.attrs.params.q) return original();

      return 1;
    });
  }

  function isLikedByMe(post) {
    if (!app.session.user || typeof post.likes !== 'function') return false;

    const likes = post.likes();
    if (!Array.isArray(likes)) return false;

    return likes.some(
      (user) => user === app.session.user || (user && typeof user.id === 'function' && String(user.id()) === String(app.session.user.id()))
    );
  }

  function syncLikedClass(element, post) {
    const item = element.querySelector('.item-like');
    if (item) item.classList.toggle('is-liked', isLikedByMe(post));
  }

  function decorate(component) {
    const post = component.attrs.post;
    const element = component.$ ? component.$()[0] : null;
    if (!post || !element) return;

    const id = String(post.id());
    const depth = getDepth(post, settings.maxDepth, lookup);
    const hidden = isHidden(post, collapsed, lookup);
    const op = isOriginalPost(post);

    element.classList.add('NestedRepliesPost');
    element.classList.toggle('NestedRepliesPost--op', op);

    // Flarum 2.x ships a `.Post-container` wrapper; 1.x has an unnamed div.
    // Tag it ourselves so the LESS works on both.
    const container = element.firstElementChild;
    if (container) container.classList.add('NestedRepliesPost-container');

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

    syncLikedClass(element, post);

    // The reply target is shown as a tag in the header, so hide only the inline
    // mention that points at the stored parent.
    if (settings.showReplyTag) {
      const parentId = getParentId(post);
      const target = parentId ? getReplyTarget(post, lookup) : null;

      if (parentId && target) {
        const body = element.querySelector('.Post-body') || element.querySelector('.Post-content');
        if (body) {
          const mention = body.querySelector(`a.PostMention[data-id="${parentId}"]`);
          if (mention) mention.classList.add('NestedRepliesReplyTag-source');
        }
      }
    }
  }

  // Pull every page of the discussion from the API so sorting sees all posts.
  async function fetchAllPosts() {
    if (!currentDiscussion) return [];

    const filter = { discussion: currentDiscussion.id() };
    const limit = 50;
    const collected = [];
    let offset = 0;
    let effective = limit;

    for (let guard = 0; guard < 500; guard++) {
      const page = await app.store.find('posts', { filter, page: { offset, limit }, sort: 'number' });

      if (!page || !page.length) break;
      if (offset === 0) effective = page.length;

      collected.push(...page);

      if (page.length < effective) break;
      offset += page.length;
    }

    return collected;
  }

  // Order the replies as a tree: sort each sibling group by the chosen mode and
  // walk depth-first so children always follow their parent.
  function buildReplyOrder(posts, mode) {
    const byId = new Map();
    posts.forEach((post) => byId.set(String(post.id()), post));

    const op = posts.find((post) => isOriginalPost(post)) || null;
    const opId = op ? String(op.id()) : null;

    const children = new Map();
    const roots = [];

    posts.forEach((post) => {
      if (op && post === op) return;

      const parentId = getParentId(post);

      if (parentId && parentId !== opId && byId.has(parentId)) {
        const list = children.get(parentId) || [];
        list.push(post);
        children.set(parentId, list);
      } else {
        roots.push(post);
      }
    });

    const counts = new Map();
    const countDescendants = (post, seen) => {
      const id = String(post.id());
      if (seen.has(id)) return 0;
      seen.add(id);

      const kids = children.get(id) || [];
      let total = 0;
      kids.forEach((kid) => {
        total += 1 + countDescendants(kid, seen);
      });

      counts.set(id, total);
      return total;
    };
    posts.forEach((post) => {
      if (!counts.has(String(post.id()))) countDescendants(post, new Set());
    });

    const time = (post) => Number(post.createdAt ? post.createdAt() : 0) || 0;
    const score = (post) => Number(post.attribute ? post.attribute('votes') : 0) || 0;
    const replyCount = (post) => counts.get(String(post.id())) || 0;

    const comparator = (a, b) => {
      if (mode === 'newest') return time(b) - time(a);
      if (mode === 'top') return score(b) - score(a) || time(a) - time(b);
      if (mode === 'replies') return replyCount(b) - replyCount(a) || time(a) - time(b);
      return time(a) - time(b);
    };

    const ordered = [];
    const walk = (list) => {
      list.sort(comparator);
      list.forEach((post) => {
        ordered.push(post);
        const kids = children.get(String(post.id()));
        if (kids) walk(kids);
      });
    };
    walk(roots);

    return { op, ordered };
  }

  function makePostItem(post, index) {
    const PostComponent = app.postComponents[post.contentType()];
    if (!PostComponent) return null;

    const createdAt = post.createdAt ? post.createdAt() : null;

    return m(
      'div.PostStream-item',
      {
        key: 'post' + post.id(),
        'data-index': index,
        'data-number': post.number(),
        'data-id': post.id(),
        'data-type': post.contentType(),
        'data-time': createdAt && createdAt.toISOString ? createdAt.toISOString() : undefined,
      },
      m(PostComponent, { post })
    );
  }

  function replySortVNode() {
    const trans = (key) => app.translator.trans(`mtareq-nested-replies.forum.${key}`);
    const options = [
      ['oldest', trans('sort_oldest')],
      ['newest', trans('sort_newest')],
      ['top', trans('sort_top')],
      ['replies', trans('sort_replies')],
    ];

    return m('div.NestedRepliesReplySort', { key: 'nestedRepliesReplySort' }, [
      m('span.NestedRepliesReplySort-label', trans('sort_by')),
      m(
        'select.NestedRepliesReplySort-select',
        {
          value: sortMode,
          disabled: loadingAll,
          onchange: (e) => setSortMode(e.target.value),
        },
        options.map(([value, label]) => m('option', { value, selected: sortMode === value }, label))
      ),
      loadingAll ? m('span.NestedRepliesReplySort-loading', trans('sort_loading')) : null,
    ]);
  }

  function setSortMode(mode) {
    sortMode = mode;

    if (mode !== 'oldest' && !allPosts) {
      loadingAll = true;
      m.redraw();

      fetchAllPosts()
        .then((posts) => {
          allPosts = posts;
        })
        .catch(() => {
          allPosts = null;
        })
        .then(() => {
          loadingAll = false;
          m.redraw();
        });
    } else {
      m.redraw();
    }
  }

  // Flarum's post stream is a flat list. A nested-reply layout wants the original
  // post in its own card and every reply inside a second card, so regroup the
  // rendered vnodes without touching core.
  override(PostStream.prototype, 'view', function (original) {
    currentDiscussion = this.discussion;
    const vnode = original();

    if (sortMode !== 'oldest' && allPosts && allPosts.length) {
      // Sorted mode renders the whole discussion from our own ordering, so stop
      // the native stream from paginating underneath it.
      if (this.stream) this.stream.paused = true;

      const { op, ordered } = buildReplyOrder(allPosts, sortMode);

      const chrono = [...allPosts].sort((a, b) => Number(a.number()) - Number(b.number()));
      const indexOf = new Map(chrono.map((post, i) => [String(post.id()), i]));

      const opItem = op ? makePostItem(op, indexOf.get(String(op.id())) || 0) : null;
      const replyItems = ordered.map((post) => makePostItem(post, indexOf.get(String(post.id())) || 0)).filter(Boolean);

      const grouped = [];
      if (opItem) grouped.push(m('div.NestedRepliesThreadCard', { key: 'nestedRepliesThreadCard' }, opItem));

      grouped.push(m('div.NestedRepliesReplyCard', { key: 'nestedRepliesReplyCard' }, [replySortVNode(), ...replyItems]));

      // The native stream isn't at its end when only the first page is loaded,
      // but the sorted view shows the whole discussion, so allow replying.
      const canReply = currentDiscussion && (!app.session.user || currentDiscussion.canReply());
      if (canReply) {
        grouped.push(m('div.PostStream-item', { key: 'reply' }, m(ReplyPlaceholder, { discussion: currentDiscussion })));
      }

      return m('div.PostStream', vnode.attrs, grouped);
    }

    if (this.stream) this.stream.paused = false;

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

    const grouped = [...before, m('div.NestedRepliesThreadCard', { key: 'nestedRepliesThreadCard' }, op)];

    if (replies.length) {
      grouped.push(m('div.NestedRepliesReplyCard', { key: 'nestedRepliesReplyCard' }, [replySortVNode(), ...replies]));
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

    // Keep the liked colour in sync even when the post doesn't rebuild.
    if (this.element) {
      this.element.addEventListener('click', (e) => {
        if (e.target && e.target.closest && e.target.closest('.item-like')) {
          requestAnimationFrame(() => {
            if (this.element) syncLikedClass(this.element, this.attrs.post);
          });
        }
      });
    }
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
    const target = getReplyTarget(post, lookup);

    if (!target || !target.name) return;

    items.add(
      'nestedRepliesReplyTag',
      m('a.NestedRepliesReplyTag', { href: target.post ? app.route.post(target.post) : '#', title: target.name }, [
        icon('fas fa-reply'),
        m('span.NestedRepliesReplyTag-label', app.translator.trans('mtareq-nested-replies.forum.reply_to', { username: target.name })),
      ]),
      95
    );
  });

  // Add the controls to the post action bar (next to Reply / Like).
  extend(Post.prototype, 'actionItems', function (items) {
    const post = this.attrs.post;
    if (!post) return;

    if (settings.showVotes) {
      items.add('nestedRepliesVotes', m(VoteRail, { post, adapter: votes }), 10);
    }

    items.add(
      'nestedRepliesCollapse',
      m(CollapseToggle, {
        collapsed: collapsed.has(String(post.id())),
        onclick: () => toggleCollapse(post),
      }),
      9
    );
  });
});
