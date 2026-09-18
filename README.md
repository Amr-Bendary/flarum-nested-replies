# Nested Replies for Flarum

Restyles Flarum discussions as Reddit-style nested reply threads: indented replies with
colored thread lines, collapsible comments, an optional vote rail, and admin settings.

## Features

- Reddit-like comment cards with indentation and depth-colored thread lines.
- Collapse/expand a comment; descendants are hidden while collapsed.
- Vote rail that integrates [fof/gamification](https://github.com/FriendsOfFlarum/gamification)
  when enabled (otherwise shown disabled/static).
- Reply depth derived from the [flarum/mentions](https://github.com/flarum/framework)
  extension. Without mentions the stream still restyles, but stays flat.
- Admin settings: enable/disable, maximum indent depth, show vote rail.

## Requirements

- Flarum 1.x or 2.x.
- Optional: `flarum/mentions` (for indentation), `fof/gamification` (for voting).

## Installation

```bash
composer require itqan/flarum-nested-replies
```

Then enable the extension in the admin panel and configure it under **Nested Replies**.

## Manual test matrix

Verify on a real Flarum install across these combinations:

| Flarum | mentions | gamification | Expected |
| --- | --- | --- | --- |
| 2.x | on | on | Indented tree, clicking arrows persists votes |
| 2.x | on | off | Indented tree, vote rail disabled |
| 2.x | off | on | Flat restyle, votes persist |
| 2.x | off | off | Flat restyle, no votes |
| 1.x | on | on | Same as 2.x equivalent |

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
