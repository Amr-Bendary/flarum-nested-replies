import app from 'flarum/admin/app';

app.initializers.add('itqan-nested-replies', () => {
  app.extensionData
    .for('itqan-nested-replies')
    .registerSetting({
      setting: 'itqan-nested-replies.enabled',
      type: 'boolean',
      label: app.translator.trans('itqan-nested-replies.admin.settings.enabled_label'),
    })
    .registerSetting({
      setting: 'itqan-nested-replies.max_depth',
      type: 'number',
      label: app.translator.trans('itqan-nested-replies.admin.settings.max_depth_label'),
    })
    .registerSetting({
      setting: 'itqan-nested-replies.show_votes',
      type: 'boolean',
      label: app.translator.trans('itqan-nested-replies.admin.settings.show_votes_label'),
    })
    .registerSetting({
      setting: 'itqan-nested-replies.show_reply_tag',
      type: 'boolean',
      label: app.translator.trans('itqan-nested-replies.admin.settings.show_reply_tag_label'),
    })
    .registerSetting({
      setting: 'itqan-nested-replies.show_replied_indicator',
      type: 'boolean',
      label: app.translator.trans('itqan-nested-replies.admin.settings.show_replied_indicator_label'),
    })
    .registerSetting({
      setting: 'itqan-nested-replies.like_color',
      type: 'color',
      label: app.translator.trans('itqan-nested-replies.admin.settings.like_color_label'),
    });
});
