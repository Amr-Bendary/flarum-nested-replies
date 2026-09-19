# Nested Replies for Flarum

Restyles Flarum discussions as nested reply threads: indented replies with depth-colored
thread lines, collapsible comments, an optional vote rail, and admin settings.

See [ARCHITECTURE.md](ARCHITECTURE.md) for how the extension is put together.

## Features

- Threaded comment cards with indentation and depth-colored guide lines.
- Collapse/expand a comment; descendants are hidden while collapsed.
- Native up/down voting with a score rail, stored by this extension. Signed-in
  users can upvote, downvote, or clear their vote.
- Reply sorting per discussion: oldest, newest, top voted, or most replies.
- Reply depth derived from the [flarum/mentions](https://github.com/flarum/framework)
  extension. Without mentions the stream still restyles, but stays flat.
- Optional "Reply to {username}" header tag, like color, and more via admin settings.

## Requirements

- PHP 8.1+ and Flarum `^1.8 || ^2.0`.

## Dependent packages

| Package | Required | Why |
| --- | --- | --- |
| `flarum/core` | Yes | Provides the extension API, post stream, and `PostSerializer`. |
| `flarum/mentions` | Recommended | Nesting is derived from each post's mention of its parent. Without it, replies cannot be linked to a parent, so the stream restyles but stays flat. |
| `flarum/likes` | No | Adds the Like action that this theme restyles and colors. Without it, there is simply no Like chip to theme; voting from this extension is unaffected. |

Voting is built into this extension and needs no other package.

## Installation

```bash
composer require mtareq/flarum-nested-replies
```

Then enable the extension in the admin panel and configure it under **Nested Replies**.

## Settings

Configure everything under **Administration → Extensions → Nested Replies**. The
settings are stored with the `mtareq-nested-replies.` prefix and serialized to the
forum as `nestedReplies*` attributes.

| Setting | Key | Type | Default | Description |
| --- | --- | --- | --- | --- |
| Enable nested replies | `mtareq-nested-replies.enabled` | Boolean | `on` | Master switch. When off, the post stream renders with Flarum's default layout. |
| Maximum indent depth | `mtareq-nested-replies.max_depth` | Number | `5` | Deepest indent level a reply is drawn at. Replies past this depth are shown at the cap, keeping deep threads readable. |
| Show vote rail | `mtareq-nested-replies.show_votes` | Boolean | `on` | Shows the up/down vote rail in each post's action bar. |
| Show "Reply to" tag | `mtareq-nested-replies.show_reply_tag` | Boolean | `on` | Shows a "Reply to {username}" tag in the header and hides the inline mention at the start of the body. |
| Show "replied to this" indicator | `mtareq-nested-replies.show_replied_indicator` | Boolean | `on` | Shows flarum/mentions' "You replied to this." summary above the post. Turn off to hide it. |
| Like color (active) | `mtareq-nested-replies.like_color` | Color | `#ff4500` | Color of the Like action once a post is liked (requires `flarum/likes`). |
| Start discussions at the first post | `mtareq-nested-replies.start_at_first_post` | Boolean | `on` | Opens a discussion at the original post instead of jumping to the first unread post. Search-result jumps are preserved. |

## Manual test matrix

Verify on a real Flarum install across these combinations:

| Flarum | mentions | Expected |
| --- | --- | --- |
| 2.x | on | Indented tree with depth-colored thread lines |
| 2.x | off | Flat restyle |
| 1.x | on | Same as 2.x equivalent |
| 1.x | off | Same as 2.x equivalent |

Votes are available to signed-in users on every supported version; guests see
the rail disabled.

## Development

```bash
cd js
npm install
npm run dev      # watch
npm run build    # production
npm test         # unit tests for pure logic
npm run format-check
```

## License

MIT
