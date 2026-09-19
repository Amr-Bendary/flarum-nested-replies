import Component from 'flarum/common/Component';
import app from 'flarum/forum/app';
import icon from 'flarum/common/helpers/icon';

// "Show more replies" control for a folded sibling group. `indent` is the
// difference between the depth the control belongs to and the depth of the post
// it is anchored to, so the control lines up with the hidden replies.
export default class MoreReplies extends Component {
  view() {
    const { count, indent } = this.attrs;

    return m(
      'button.NestedRepliesShowMore.Button.Button--link',
      {
        type: 'button',
        title: app.translator.trans('mtareq-nested-replies.forum.more_replies', { count }),
        // Move the control to the hidden replies' depth and centre its + badge
        // on that depth's guide line: the badge sits 16px inside the button, so
        // the margin carries an extra 29px to put the badge's centre on the
        // line. The guide line itself ends at the control's top edge.
        style: `margin-inline-start: calc(${indent || 0} * var(--indent) - 29px)`,
        onclick: this.attrs.onclick,
      },
      [
        m('span.NestedRepliesShowMore-toggle', icon('fas fa-plus')),
        m('span.NestedRepliesShowMore-label', app.translator.trans('mtareq-nested-replies.forum.show_more_replies')),
        m('span.NestedRepliesShowMore-icon', icon('fas fa-angles-down')),
      ]
    );
  }
}
