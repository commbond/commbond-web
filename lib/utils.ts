import { ContextMessageUpdate } from 'telegraf';

function escapeForMarkdownV2(str) {
  if (typeof str !== 'string' && !(str instanceof String)) {
    return '';
  }
  return str.replace(/[\_\*\[\]\(\)\~\`\>\#\+\-\=\|\{\}\.\!]/g, '\\$&');
}

async function sendMessage(ctx: ContextMessageUpdate, textContent: string, replyMarkup: any) {
  await ctx.replyWithMarkdown(textContent, {
    parse_mode: 'MarkdownV2',
    disable_web_page_preview: true,
    reply_markup: replyMarkup,
  });

  ctx.updateType === 'callback_query' && await ctx.answerCbQuery();

}

async function editMessage(ctx: ContextMessageUpdate, textContent: string, replyMarkup: any) {
  await ctx.editMessageText(textContent, {
    parse_mode: 'MarkdownV2',
    disable_web_page_preview: true,
    reply_markup: replyMarkup,
  });

  ctx.updateType === 'callback_query' && await ctx.answerCbQuery();

}

function makeMainMenuReplyMarkup(prepend?) {

  const prependKeyboard = prepend ? [prepend] : [];
  const keyboard = prependKeyboard.concat([
    [{
      text: '睇今期 Top Ideas！',
      callback_data: 'BROWSE_IDEAS',
    }],
    [{
      text: '有 Idea? 出橋啦',
      callback_data: 'SUBMIT_IDEA',
    }],
  ]);

  return { inline_keyboard: keyboard };
}

function makeLoadingReplyMarkup() {
  const key = [{
    text: 'Loading⋯ (請稍候)',
    callback_data: 'NOTHING',
  }];
  return { inline_keyboard: [key] };
}

export {
  escapeForMarkdownV2,
  sendMessage,
  editMessage,
  makeMainMenuReplyMarkup,
  makeLoadingReplyMarkup,
}

