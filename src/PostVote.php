<?php

namespace Itqan\NestedReplies;

use Flarum\Database\AbstractModel;

class PostVote extends AbstractModel
{
    protected $table = 'itqan_nested_replies_votes';

    protected $fillable = ['post_id', 'user_id', 'value'];

    public $timestamps = true;
}
