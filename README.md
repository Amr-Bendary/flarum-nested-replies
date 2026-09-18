# Nested Replies for Flarum

Restyles Flarum discussions as Reddit-style nested reply threads: indented replies with
colored thread lines, collapsible comments, an optional vote rail, and admin settings.

## Features

- Reddit-like comment cards with indentation and depth-colored thread lines.
- Collapse/expand a comment; descendants are hidden while collapsed.
- Native up/down voting with a score rail, stored by this extension. Signed-in
  users can upvote, downvote, or clear their vote.
- Reply depth derived from the [flarum/mentions](https://github.com/flarum/framework)
  extension. Without mentions the stream still restyles, but stays flat.
- Admin settings: enable/disable, maximum indent depth, show vote rail.

## Requirements

- Flarum 1.x or 2.x.
- Optional: `flarum/mentions` (for indentation).

Voting is built into the extension and needs no other package.

## Installation

```bash
composer require itqan/flarum-nested-replies
```

Then enable the extension in the admin panel and configure it under **Nested Replies**.

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
