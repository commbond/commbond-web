import { Injectable } from '@nestjs/common';
import {
  TelegrafTelegramService,
  TelegramActionHandler,
} from 'nestjs-telegraf';
import { ContextMessageUpdate } from 'telegraf';

@Injectable()
export class BotService {
  constructor(
    private readonly telegrafTelegramService: TelegrafTelegramService,
  ) { }

  /* This decorator handle /start command */
  @TelegramActionHandler({ onStart: true })
  async onStart(ctx: ContextMessageUpdate) {
    const me = await this.telegrafTelegramService.getMe();
    console.log(me);
    await ctx.replyWithMarkdown(`Welcome to CommBond\!\nWhat would you like to do\?\n\n/browseIdeas - Browse recent hottest ideas\n/submitIdeas - You have an idea? Throw it out!`, {
      reply_markup: {
        // inline_keyboard: [
        //   [
        //     {
        //       text: 'Browse ideas',
        //       callback_data: 'browseIdeas',
        //     },
        //     {
        //       text: 'Submit ideas',
        //       callback_data: 'submitIdeas',
        //     },
        //   ],
        // ],
        one_time_keyboard: true,
        resize_keyboard: true,
        keyboard: [
          [
            {
              text: 'Browse ideas',
            },
          ],
          [
            {
              text: 'Submit ideas',
            }
          ]
        ]
      },
      parse_mode: 'Markdown',
    });
  }

  @TelegramActionHandler({ action: 'browseIdeas' })
  protected async onAction(ctx: ContextMessageUpdate) {
    console.log('Action: browseIdeas');
  }

  @TelegramActionHandler({ message: '' })
  async onMessage(ctx: ContextMessageUpdate) {
    await ctx.reply(`You say "${ctx.message.text}".`)
  }
}