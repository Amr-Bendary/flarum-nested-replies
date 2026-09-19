<?php

use Flarum\Api\Serializer\PostSerializer;
use Flarum\Extend;
use Mtareq\NestedReplies\Api\VotePostController;
use Mtareq\NestedReplies\PostVote;

return [
    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        ->css(__DIR__.'/less/forum.less'),

    (new Extend\Frontend('admin'))
        ->js(__DIR__.'/js/dist/admin.js'),

    (new Extend\Settings())
        ->default('mtareq-nested-replies.enabled', '1')
        ->default('mtareq-nested-replies.max_depth', '5')
        ->default('mtareq-nested-replies.show_votes', '1')
        ->default('mtareq-nested-replies.show_reply_tag', '1')
        ->default('mtareq-nested-replies.show_replied_indicator', '1')
        ->default('mtareq-nested-replies.like_color', '#ff4500')
        ->default('mtareq-nested-replies.start_at_first_post', '1')
        ->serializeToForum('nestedRepliesEnabled', 'mtareq-nested-replies.enabled', 'boolval')
        ->serializeToForum('nestedRepliesMaxDepth', 'mtareq-nested-replies.max_depth', 'intval')
        ->serializeToForum('nestedRepliesShowVotes', 'mtareq-nested-replies.show_votes', 'boolval')
        ->serializeToForum('nestedRepliesShowReplyTag', 'mtareq-nested-replies.show_reply_tag', 'boolval')
        ->serializeToForum('nestedRepliesShowRepliedIndicator', 'mtareq-nested-replies.show_replied_indicator', 'boolval')
        ->serializeToForum('nestedRepliesLikeColor', 'mtareq-nested-replies.like_color')
        ->serializeToForum('nestedRepliesStartAtFirstPost', 'mtareq-nested-replies.start_at_first_post', 'boolval'),

    (new Extend\Routes('api'))
        ->post('/mtareq-nested-replies/posts/{id}/vote', 'mtareq-nested-replies.vote', VotePostController::class),

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
