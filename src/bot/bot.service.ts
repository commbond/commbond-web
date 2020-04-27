/* eslint-disable @typescript-eslint/camelcase */
import { Injectable } from '@nestjs/common';
import {
  TelegrafTelegramService,
  TelegramActionHandler,
} from 'nestjs-telegraf';
import { ContextMessageUpdate } from 'telegraf';

import Ideas from './ideas';
import { escapeForMarkdownV2, makeMainMenuReplyMarkup, sendMessage } from '../../lib/utils';
import Airtable from '../../lib/airtable';
import ZHMsg from '../../lib/locale-zh.json';

// @future todo: Error handling 

@Injectable()
export class BotService {
  constructor(
    private readonly telegrafTelegramService: TelegrafTelegramService,
  ) { }

  /* This decorator handle /start command */
  @TelegramActionHandler({ onStart: true })
  async HandleStart(ctx: ContextMessageUpdate) {
    // const me = await this.telegrafTelegramService.getMe();

    const commandParts = ctx.message.text.split(' ');
    if (commandParts.length > 1) {
      //has Deep linking
      const ideaId = commandParts[1];
      await Ideas.HandleGetIdea(ctx, ideaId);
    } else {
      await this.ReplyDefaultMenu(ctx, `${ZHMsg.greeting} ${ZHMsg.menu}`);
    }

  }

  @TelegramActionHandler({ action: /^BROWSE_IDEAS/ })
  protected async HandleBrowseIdeas(ctx: ContextMessageUpdate) {
    await Ideas.HandleBrowseIdeas(ctx);
  }

  @TelegramActionHandler({ action: /^GET_IDEA/ })
  protected async HandleGetIdea(ctx: ContextMessageUpdate) {
    const parts = ctx.update.callback_query.data.split(' ');
    const ideaId = parts.length > 1 ? parts[1] : null;
    await Ideas.HandleGetIdea(ctx, ideaId);
  }

  @TelegramActionHandler({ action: /^RESPOND_IDEA/ })
  protected async HandleRespondIdea(ctx: ContextMessageUpdate) {
    await Ideas.HandleRespondIdea(ctx);
  }

  @TelegramActionHandler({ action: /^SUBMIT_IDEA/ })
  protected async HandleSubmitIdea(ctx: ContextMessageUpdate) {
    const user = ctx.update.message ? ctx.update.message.from : ctx.update.callback_query.from;
    const userRecord = await Airtable.getUserOrRegister({ user });

    await sendMessage(ctx, this.makeSubmitTextContent(userRecord.id), this.makeSubmitReplyMarkup(userRecord.id));
  }

  @TelegramActionHandler({ message: '' })
  async HandleMessage(ctx: ContextMessageUpdate) {
    switch (ctx.message.text) {
      case '/browse_ideas':
        await this.HandleBrowseIdeas(ctx);
        break;
      case '/submit_idea':
        await this.HandleSubmitIdea(ctx);
        break;
      case '/help':
        await this.HandleHelp(ctx);
        break;
      default:
        await this.HandleUnknown(ctx);

    }
  }

  protected async HandleHelp(ctx: ContextMessageUpdate) {
    const message = `${ZHMsg.helpMsg} ${ZHMsg.menu} ${ZHMsg.contact}`;
    await ctx.reply(escapeForMarkdownV2(message), {
      parse_mode: 'MarkdownV2',
      reply_markup: makeMainMenuReplyMarkup(),
    });
  }

  protected async HandleUnknown(ctx: ContextMessageUpdate) {
    const message = `${ZHMsg.unknown} ${ZHMsg.menu}`;
    await this.ReplyDefaultMenu(ctx, message);
  }

  protected async ReplyDefaultMenu(ctx: ContextMessageUpdate, message: string) {
    await ctx.reply(escapeForMarkdownV2(message), {
      parse_mode: 'MarkdownV2',
      disable_web_page_preview: true,
      reply_markup: makeMainMenuReplyMarkup(),
    });
  }

  private makeSubmitTextContent(userRecordId) {
    return escapeForMarkdownV2(ZHMsg.action.submitidea.thankYouMsg + `?prefill_Initiated+By=${userRecordId}`);
  }

  private makeSubmitReplyMarkup(userRecordId) {
    return {
      inline_keyboard: [[{
        text: '出橋',
        url: `https://airtable.com/shrYwXgCML9aN2dI3?prefill_Initiated+By=${userRecordId}`,
      }]]
    };

  }


}