<?php

use Flarum\Api\Serializer\PostSerializer;
use Flarum\Extend;
use Itqan\NestedReplies\Api\VotePostController;
use Itqan\NestedReplies\PostVote;

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
        ->default('itqan-nested-replies.show_reply_tag', '1')
        ->default('itqan-nested-replies.show_replied_indicator', '1')
        ->serializeToForum('redditRepliesEnabled', 'itqan-nested-replies.enabled', 'boolval')
        ->serializeToForum('redditRepliesMaxDepth', 'itqan-nested-replies.max_depth', 'intval')
        ->serializeToForum('redditRepliesShowVotes', 'itqan-nested-replies.show_votes', 'boolval')
        ->serializeToForum('redditRepliesShowReplyTag', 'itqan-nested-replies.show_reply_tag', 'boolval')
        ->serializeToForum('redditRepliesShowRepliedIndicator', 'itqan-nested-replies.show_replied_indicator', 'boolval'),

    (new Extend\Routes('api'))
        ->post('/itqan-nested-replies/posts/{id}/vote', 'itqan-nested-replies.vote', VotePostController::class),

    (new Extend\ApiSerializer(PostSerializer::class))
        ->attribute('votes', function ($serializer, $post) {
            return (int) PostVote::query()->where('post_id', $post->id)->sum('value');
        })
        ->attribute('userVote', function ($serializer, $post) {
            $actor = $serializer->getActor();

            if (! $actor || ! $actor->exists) {
                return null;
            }

            $vote = PostVote::query()
                ->where('post_id', $post->id)
                ->where('user_id', $actor->id)
                ->first();

            if (! $vote) {
                return null;
            }

            return $vote->value > 0 ? 'up' : 'down';
        }),

    new Extend\Locales(__DIR__.'/locale'),
];
