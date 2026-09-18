<?php

use Flarum\Extend;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        ->css(__DIR__.'/less/forum.less'),

    (new Extend\Frontend('admin'))
        ->js(__DIR__.'/js/dist/admin.js'),

    (new Extend\Settings())
        ->default('itqan-nested-replies.enabled', '1')
        ->default('itqan-nested-replies.max_depth', '5')
        ->default('itqan-nested-replies.show_votes', '1')
        ->serializeToForum('redditRepliesEnabled', 'itqan-nested-replies.enabled', 'boolval')
        ->serializeToForum('redditRepliesMaxDepth', 'itqan-nested-replies.max_depth', 'intval')
        ->serializeToForum('redditRepliesShowVotes', 'itqan-nested-replies.show_votes', 'boolval'),

    new Extend\Locales(__DIR__.'/locale'),
];
