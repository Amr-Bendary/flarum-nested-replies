import Component from 'flarum/common/Component';
import NestedRepliesQuickReply from './NestedRepliesQuickReply';

// Host for the in-card reply form. `indent` is 1 (child level) or 0 (at the
// depth cap); the LESS converts it to an inline-start margin.
export default class NestedRepliesInlineReply extends Component {
  view() {
    const { post, discussion, draft, onCancel, onSubmitted } = this.attrs;

    return m(
      'div.NestedRepliesInlineReply',
      { style: `--form-indent: ${this.attrs.indent}` },
      m(NestedRepliesQuickReply, { post, discussion, draft, onCancel, onSubmitted })
    );
  }
}
