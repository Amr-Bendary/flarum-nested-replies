import { extend } from 'flarum/common/extend';
import app from 'flarum/forum/app';
import Post from 'flarum/forum/components/Post';
import { readSettings } from '../common/settings';
import { createVoteAdapter } from '../common/voteAdapter';
import { getDepth, isHidden } from './utils/threadDepths';
import VoteRail from './components/VoteRail';
import CollapseToggle from './components/CollapseToggle';

app.initializers.add('itqan-nested-replies', () => {
  const settings = readSettings(app);
  if (!settings.enabled) return;

  const votes = createVoteAdapter(app);
  const collapsed = new Set();
  const lookup = (id) => app.store.getById('posts', String(id));

  function decorate(component) {
    const post = component.attrs.post;
    const element = component.$ ? component.$()[0] : null;
    if (!post || !element) return;

    const id = String(post.id());
    const depth = getDepth(post, settings.maxDepth, lookup);
    const hidden = isHidden(post, collapsed, lookup);

    element.classList.add('RedditPost');
    element.dataset.depth = String(depth);
    element.style.setProperty('--depth', String(depth));

    if (collapsed.has(id)) element.dataset.collapsed = 'true';
    else delete element.dataset.collapsed;

    if (hidden) element.dataset.hidden = 'true';
    else delete element.dataset.hidden;
  }

  extend(Post.prototype, ['oncreate', 'onupdate'], function () {
    decorate(this);
  });

  const itemsMethod = Post.prototype.headerItems ? 'headerItems' : 'footerItems';

  extend(Post.prototype, itemsMethod, function (items) {
    const post = this.attrs.post;
    if (!post) return;

    items.add(
      'redditCollapse',
      m(CollapseToggle, {
        collapsed: collapsed.has(String(post.id())),
        onclick: () => {
          const id = String(post.id());
          if (collapsed.has(id)) collapsed.delete(id);
          else collapsed.add(id);
          m.redraw();
        },
      }),
      100
    );

    if (settings.showVotes) {
      items.add('redditVotes', m(VoteRail, { post, adapter: votes }), 90);
    }
  });
});
