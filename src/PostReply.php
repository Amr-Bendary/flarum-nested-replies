<?php

namespace Mtareq\NestedReplies;

use Flarum\Database\AbstractModel;
use Flarum\Post\Post;

class PostReply extends AbstractModel
{
    protected $table = 'mtareq_nested_replies_parents';

    protected $fillable = ['post_id', 'parent_post_id'];

    public $timestamps = true;

    public function post()
    {
        return $this->belongsTo(Post::class, 'post_id');
    }

    public function parent()
    {
        return $this->belongsTo(Post::class, 'parent_post_id');
    }
}
