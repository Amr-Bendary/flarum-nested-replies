# Architecture

How the Nested Replies extension is put together. Read this before changing the
layout logic, the settings pipeline, or the voting API.

## Overview

The extension has two halves that meet over Flarum's normal extension APIs:

- **PHP backend** — declares settings, serializes them to the forum, exposes a
  vote endpoint, and adds `votes` / `userVote` to every serialized post.
- **JS frontend** — reads the serialized settings, derives reply depth from post
  mentions, restyles the post stream into cards, and renders the vote and
  collapse controls.

There is no custom database relation between posts. The reply tree is derived
client-side from the mentions that `flarum/mentions` already records, so the
extension stays compatible with Flarum's flat post stream.

## Package layout

```
composer.json                     Flarum extension manifest (name, namespace, icon)
extend.php                        Backend registration (assets, settings, routes, serializer)
src/
  PostVote.php                    Eloquent model for the votes table
  Api/VotePostController.php      POST vote endpoint
migrations/
  2026_09_18_000000_create_nested_replies_votes_table.php
locale/
  en.yml, ar.yml                  Admin + forum translations
less/
  forum.less                      Card layout, thread lines, action bar, RTL
js/
  admin.js, forum.js              Webpack entry points
  src/
    admin/index.js                Registers admin settings
    forum/index.js                Orchestrates the whole forum UI
    forum/components/
      VoteRail.js                 Up/down vote control
      CollapseToggle.js           Collapse/expand control
    forum/utils/threadDepths.js   Pure reply-tree / depth logic
    common/settings.js            Reads serialized forum settings
    common/voteAdapter.js         Vote read/write adapter
  dist/                           Built bundles loaded by Flarum
```

## Backend

### `extend.php`

- Registers the compiled `js/dist/forum.js` + `less/forum.less` on the forum and
  `js/dist/admin.js` on the admin.
- Declares every setting with a default and serializes the relevant ones to the
  forum under `nestedReplies*` keys (see [Settings pipeline](#settings-pipeline)).
- Registers `POST /mtareq-nested-replies/posts/{id}/vote`.
- Extends `Flarum\Api\Serializer\PostSerializer` with two attributes:
  - `votes` — sum of the post's vote values.
  - `userVote` — `'up'`, `'down'`, or `null` for the current actor.

### `src/PostVote.php` + migration

A thin model over `mtareq_nested_replies_votes` with `post_id`, `user_id`, and
`value` (`1` / `-1`), unique on `(post_id, user_id)` and indexed on each column.

### `src/Api/VotePostController.php`

Requires a registered actor, then:

- `direction = 'up' | 'down'` → `updateOrCreate` the actor's vote row.
- anything else (`null`) → delete the actor's vote row (clears the vote).

It returns the post serialized through `PostSerializer`, so the updated `votes`
and `userVote` attributes flow back to the client in the response.

## Frontend

### Boot and settings

`js/src/forum/index.js` runs inside an initializer. It calls `readSettings(app)`
(`common/settings.js`) and bails out entirely when `enabled` is off.

`settings.js` reads attributes from `app.forum` once booted, and otherwise falls
back to the initial JSON:API payload (`app.data.resources`) because Flarum runs
initializers before `app.forum` is assigned.

### Reply tree (`forum/utils/threadDepths.js`)

Pure, dependency-injected functions — the only part covered by fast unit tests:

- `getParentId(post)` — resolves the parent post id, preferring Flarum 2.x's
  `mentionsPosts()`, then the rendered `PostMention` in `contentHtml()`, then the
  raw `#p123` syntax (Flarum 1.x).
- `getDepth(post, maxDepth, lookup)` — walks parents, never counting the original
  post as a level, and caps at `maxDepth`. Cycle-safe.
- `getAncestorIds` / `isHidden` — used to hide descendants of a collapsed post.
- `getReplyTarget(post)` — extracts `{ id, href, name }` from the rendered
  mention for the header tag.

### Stream regrouping (`forum/index.js`)

Flarum's post stream is a flat list. The extension `override`s
`PostStream.prototype.view` to wrap the original post in a
`NestedRepliesThreadCard` and the replies in a `NestedRepliesReplyCard`,
without mutating core state.

`Post` lifecycle hooks (`oncreate` / `onupdate`) call `decorate()`, which adds
the `NestedRepliesPost` class, computes each post's `data-depth` and CSS
`--depth`, tags stream items as `is-top-level` / `is-nested`, and applies the
collapsed/hidden state.

`CommentPost.prototype.headerItems` adds the "Reply to" tag, and
`Post.prototype.actionItems` injects the vote rail and collapse toggle into the
action bar.

### Sorting

`buildReplyOrder(posts, mode)` sorts sibling groups and walks depth-first so
children always follow their parent. `oldest` uses Flarum's native stream; the
other modes (newest, top, replies) first fetch every page of the discussion
(`fetchAllPosts`) and pause native pagination for the sorted view.

### Collapse state

Held in an in-memory `Set` of post ids. `isHidden` hides any post with a
collapsed ancestor. A manual `forceRedraw()` invalidates mounted `Post`
subtrees so Flarum 1.x rebuilds without a full page reload.

### Components

- `VoteRail` — reads `score` / `current` from the `voteAdapter`, disables itself
  for guests, and toggles a vote off when the active direction is clicked again.
- `CollapseToggle` — icon button that flips the collapsed state via callback.

### Styling (`less/forum.less`)

Cards, depth-colored guide lines (drawn as stacked background gradients per
`data-depth`), the inline action bar, the vote rail, the reply tag, and RTL
mirroring. The active Like color is driven by the `--nested-replies-like-color`
CSS variable, set from the `like_color` setting.

## Settings pipeline

```
extend.php default()                 -> stored setting (mtareq-nested-replies.*)
extend.php serializeToForum()        -> forum attribute (nestedReplies*)
settings.js readSettings(app)        -> typed settings object for the UI
```

| Forum attribute | Setting key | Cast |
| --- | --- | --- |
| `nestedRepliesEnabled` | `mtareq-nested-replies.enabled` | bool |
| `nestedRepliesMaxDepth` | `mtareq-nested-replies.max_depth` | int |
| `nestedRepliesShowVotes` | `mtareq-nested-replies.show_votes` | bool |
| `nestedRepliesShowReplyTag` | `mtareq-nested-replies.show_reply_tag` | bool |
| `nestedRepliesShowRepliedIndicator` | `mtareq-nested-replies.show_replied_indicator` | bool |
| `nestedRepliesLikeColor` | `mtareq-nested-replies.like_color` | string |
| `nestedRepliesStartAtFirstPost` | `mtareq-nested-replies.start_at_first_post` | bool |

## Dependencies

- `flarum/core` — required.
- `flarum/mentions` — optional but recommended; the reply tree is derived from
  its mention data, so without it threads render flat.
- `flarum/likes` — optional; only relevant to the themed Like action and the
  `like_color` setting.

## Build and test

Webpack (via `flarum-webpack-config`) bundles `admin.js` / `forum.js` into
`js/dist`. Pure logic modules are tested with Vitest:

```bash
cd js
npm run build         # regenerate dist/ after source changes
npm test              # Vitest for threadDepths, settings, voteAdapter
npm run format-check  # Prettier
```
