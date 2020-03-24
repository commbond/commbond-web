/* eslint-disable @typescript-eslint/camelcase */
import { Injectable } from '@nestjs/common';
import {
  TelegrafTelegramService,
  TelegramActionHandler,
} from 'nestjs-telegraf';
import { ContextMessageUpdate } from 'telegraf';

import Airtable from '../../lib/airtable';
import ZHMsg from '../../lib/locale-zh.json';

// @future todo: Error handling 

@Injectable()
export class BotService {
  constructor(
    private readonly telegrafTelegramService: TelegrafTelegramService,
  ) { }

  //@future Put this under a utils lib
  static escapeForMarkdownV2(str) {
    if (typeof str !== 'string' && !(str instanceof String)) {
      return '';
    }
    return str.replace(/[\_\*\[\]\(\)\~\`\>\#\+\-\=\|\{\}\.\!]/g, '\\$&');
  }

  //@future Put these UI-relating stuff under a UI module
  protected replyDefaultMenu(ctx: ContextMessageUpdate, isGreeting?: boolean) {
    const message = `${isGreeting ? ZHMsg.greeting : ZHMsg.unknown} ${ZHMsg.menu}`;
    ctx.reply(BotService.escapeForMarkdownV2(message), {
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
      reply_markup: BotService.makeMainMenuKeyboard(),
    });

  }

  protected replyHelpMenu(ctx: ContextMessageUpdate) {
    const message = `${ZHMsg.helpMsg} ${ZHMsg.menu} ${ZHMsg.contact}`;
    ctx.reply(BotService.escapeForMarkdownV2(message), {
      parse_mode: 'MarkdownV2',
      reply_markup: BotService.makeMainMenuKeyboard(),
    });
  }

  protected replyIdeaListing(ctx: ContextMessageUpdate, records) {
    const strRecords = records.reduce((acc, record, idx) => {
      const strRecord =
        `${idx + 1}\\. 【${BotService.escapeForMarkdownV2(record.fields['Idea Title'])}】
💪${record.fields['Participation Count']} 人參與
📍${BotService.escapeForMarkdownV2(record.fields['Target Location'])}
${BotService.makeIdeaStatement(record.fields)}

`;
      return acc + strRecord;
    }, '');

    const fullMessage =
      `今期 Top Ideas
${strRecords}想參與或支持？點擊以下的連結查看更多。

你有 idea? 
/submitidea \\- 出橋啦！
`;

    const actionArr = records.map((record, idx) => {
      return [{
        text: `查看詳情 ${idx + 1}.【${BotService.escapeForMarkdownV2(record.fields['Idea Title'])}】`,
        callback_data: `/getidea ${record.id}`,
      }];
    });

    ctx.replyWithMarkdown(fullMessage, {
      parse_mode: 'MarkdownV2',
      reply_markup: {
        inline_keyboard: actionArr
      },
    });

    ctx.updateType === 'callback_query' && ctx.answerCbQuery();
  }

  static makeMainMenuKeyboard(prepend?) {
    const keyboard = [
      ...prepend,
      [{
        text: '睇今期 Top Ideas！',
        callback_data: '/browseideas',
      }],
      [{
        text: '有 Idea? 出橋啦',
        callback_data: '/submitidea',
      }],
    ];
    return { inline_keyboard: keyboard };
  }

  static makeDetailsPageTextContent(ideaRecord, actionRecords, selectedActionId?, userRecord?) {
    let selectedActionType;
    const strActionLines = actionRecords.reduce((acc, eachRec) => {
      const isSelected = selectedActionId === eachRec.id;
      if (isSelected) {
        selectedActionType = eachRec.fields['Action Type']
      }

      if (eachRec.fields['Action Type'] === 'Downvote') {
        return acc;
      }
      return acc + (isSelected ? '*' : '') + `\n${BotService.escapeForMarkdownV2(eachRec.fields['Action Title'])} \\- ${eachRec.fields['Count']} 人` + (isSelected ? ' \\(已選\\)*' : '');
    }, '');

    const strContent =
      `【${BotService.escapeForMarkdownV2(ideaRecord.fields['Idea Title'])}】
💪已集合 ${ideaRecord.fields['Participation Count']} 名參與者
📍${BotService.escapeForMarkdownV2(ideaRecord.fields['Target Location'])}

${BotService.makeIdeaStatement(ideaRecord.fields)}`
      + (ideaRecord.fields['Event Date'] ? '\n\n日期：' + BotService.escapeForMarkdownV2(ideaRecord.fields['Event Date']) : '')
      + (ideaRecord.fields['Event Time'] ? '\n時間：' + BotService.escapeForMarkdownV2(ideaRecord.fields['Event Time']) : '')
      + (ideaRecord.fields['Event Location'] ? '\n地點：' + BotService.escapeForMarkdownV2(ideaRecord.fields['Event Location']) : '')
      +
      `

共有 ${ideaRecord.fields['Support Count']} 名支持者${strActionLines}`
      + (ideaRecord.fields['Actions Details'] ? '\n\n💪參與行動詳釋：\n' + BotService.escapeForMarkdownV2(ideaRecord.fields['Actions Details']) : '')
      + (ideaRecord.fields['Other Details'] ? '\n\n其他詳情：\n' + BotService.escapeForMarkdownV2(ideaRecord.fields['Other Details']) : '')
      + (ideaRecord.fields['Future Extension'] ? '\n\n將來延伸：\n' + BotService.escapeForMarkdownV2(ideaRecord.fields['Future Extension']) : '')
      +
      '\n\n\*' 
      + (!selectedActionType ? '你呢？幫定唔幫？'
          :
          selectedActionType === 'Participate' ? '多謝參與！有其他問題或意見？請填form\: '
            :
            selectedActionType === 'Conditionally participate' ? '參與條件是？請填form\: '
              :
              selectedActionType === 'Upvote' ? '多謝支持！記住轉介給有關朋友喇！\n有其他問題或意見？請填form\: '
                :
                '多謝回應！不支持原因是？請填form: ')
      + '\*'
      + (selectedActionType ? BotService.escapeForMarkdownV2(`https://airtable.com/shrvE6uhIe32ydaz9?prefill_By+User=${userRecord.id}&prefill_With+Action=${selectedActionId}`)  : '')
      + (selectedActionType === 'Conditionally participate' ? '（如果詳情有改，我們會通知你）' : '')
      ;


    return strContent;
  }


  static makeIdeaStatement(ideaFields) {
    return `我們要 *${BotService.escapeForMarkdownV2(ideaFields['Idea - What'])}* ，利用 *${BotService.escapeForMarkdownV2(ideaFields['Idea - How'])}* ，令 *${BotService.escapeForMarkdownV2(ideaFields['Idea - Who'])}* 可以 *${BotService.escapeForMarkdownV2(ideaFields['Idea - Why'])}*。`;
  }


  static makeDetailsPageKeyboard(actionRecords, selectedActionId?) {
    const actionArr = actionRecords.map((eachAction) => {

      return [{
        text: eachAction.fields['Action Title'] + (eachAction.id === selectedActionId ? ' (已選取)' : ''), //@todo: mark (已選取) if already selected by user
        callback_data: `/respondidea ${eachAction.id}`,
      }];
    });

    return { inline_keyboard: actionArr };
  }

  static makeLoadingKeyboard() {
    const key = [{
      text: 'Loading⋯ (請稍候)',
      callback_data: 'empty',
    }];
    return { inline_keyboard: [key] };
  }


  /* This decorator handle /start command */
  @TelegramActionHandler({ onStart: true })
  async onStart(ctx: ContextMessageUpdate) {
    // const me = await this.telegrafTelegramService.getMe();
    // console.log(me);
    await this.replyDefaultMenu(ctx, true);
  }

  @TelegramActionHandler({ action: /^\/browseideas/ })
  protected async onBrowseIdeas(ctx: ContextMessageUpdate) {
    const { records } = await Airtable.getAllIdeas();
    this.replyIdeaListing(ctx, records);
  }

  @TelegramActionHandler({ action: /^\/submitidea/ })
  protected async onSubmitIdea(ctx: ContextMessageUpdate) {
    const user = ctx.update.message ? ctx.update.message.from : ctx.update.callback_query.from;
    const userRecord = await Airtable.getUserOrRegister({ user });

    await ctx.replyWithMarkdown(BotService.escapeForMarkdownV2(
      ZHMsg.action.submitidea.thankYouMsg+ `?prefill_Initiated+By=${userRecord.id}`), {
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [[{
          text: '出橋',
          url: `https://airtable.com/shrYwXgCML9aN2dI3?prefill_Initiated+By=${userRecord.id}`,
        }]]
      },
    });
    await ctx.updateType === 'callback_query' && ctx.answerCbQuery();
  }

  @TelegramActionHandler({ action: /^\/getidea/ })
  protected async onGetIdea(ctx: ContextMessageUpdate) {
    const parts = ctx.update.callback_query.data.split(' ');
    const ideaId = parts.length > 1 ? parts[1] : null;
    console.log('getidea with ID: ' + ideaId);

    // return idea record and action records 
    const res = await Airtable.getIdea({ id: ideaId });
    ctx.replyWithMarkdown(BotService.makeDetailsPageTextContent(res.record, res.actionRecords), {
      parse_mode: 'MarkdownV2',
      //@todo, add param lastSelectedActionId
      reply_markup: BotService.makeDetailsPageKeyboard(res.actionRecords)
    });

    ctx.updateType === 'callback_query' && ctx.answerCbQuery();
  }

  @TelegramActionHandler({ action: /^\/respondidea/ })
  protected async onRespondIdea(ctx: ContextMessageUpdate) {
    const callbackDataParts = ctx.update.callback_query.data.split(' ');

    const selectedActionId = callbackDataParts[1];
    // console.log("ctx callback_query :");
    // console.log(ctx.update.callback_query);
    const user = ctx.update.callback_query.from;

    ctx.editMessageReplyMarkup(BotService.makeLoadingKeyboard());

    const { updatedIdeaRecord, updatedActionRecords, updatedRecord, userRecord } = await Airtable.makeAction({ user, selectedActionId })

    //6. Update displayed record with newly added count (use editMessage https://core.telegram.org/bots/api#editmessagetext)
    ctx.editMessageText(BotService.makeDetailsPageTextContent(updatedIdeaRecord, updatedActionRecords, selectedActionId, userRecord), {
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
      reply_markup: BotService.makeMainMenuKeyboard([[{
        text: updatedRecord.fields['Action Type'] === 'Conditionally participate' ? '參與條件是⋯' 
          :
          (updatedRecord.fields['Action Type'] === 'Downvote' ? '不支持原因是⋯'
            : 
            '提交問題或意見'),
        url: `https://airtable.com/shrvE6uhIe32ydaz9?prefill_By+User=${userRecord.id}&prefill_With+Action=${selectedActionId}`,
      }]]),
    });

  }


  @TelegramActionHandler({ message: '' })
  async onMessage(ctx: ContextMessageUpdate) {
    switch (ctx.message.text) {
      case '/browseideas':
        this.onBrowseIdeas(ctx);
        break;
      case '/submitidea':
      case '/submitideas':
        this.onSubmitIdea(ctx);
        break;
      case '/help':
        await this.replyHelpMenu(ctx);
        break;
      default:
        await this.replyDefaultMenu(ctx);

    }
  }
}