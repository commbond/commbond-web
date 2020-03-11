import { Injectable } from '@nestjs/common';
import {
  TelegrafTelegramService,
  TelegramActionHandler,
} from 'nestjs-telegraf';
import { ContextMessageUpdate } from 'telegraf';
var Airtable = require('airtable');

@Injectable()
export class BotService {
  constructor(
    private readonly telegrafTelegramService: TelegrafTelegramService,
    // private airtableBase, 
  ) { }

  // Not sure how to handle dependency injection here.. /Gigi
  static createDb() {
    const airtableBase = new Airtable({apiKey: process.env.AIRTABLE_API_KEY}).base('appUW06bs08YxzVDM');
    return airtableBase;
  }

  static escapeForMarkdownV2(str) {
    if(typeof str !== 'string' && !(str instanceof String)) {
      return '';
    }
    return str.replace(/[\_\*\[\]\(\)\~\`\>\#\+\-\=\|\{\}\.\!]/g,'\\$&');
  }


  /* This decorator handle /start command */
  @TelegramActionHandler({ onStart: true })
  async onStart(ctx: ContextMessageUpdate) {
    const me = await this.telegrafTelegramService.getMe();
    console.log(me);
    const message = 
`Welcome to CommBond!
What would you like to do?

/browseIdeas - Browse recent hottest ideas
/submitIdeas - You have an idea? Throw it out!`;
    await ctx.reply(BotService.escapeForMarkdownV2(message), {
      reply_markup: {
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
      parse_mode: 'MarkdownV2',
    });
  }

  @TelegramActionHandler({ action: /getIdea/ })
  protected async onGetIdea(ctx: ContextMessageUpdate) {
    const parts = ctx.update.callback_query.data.split(' ');
    const ideaId = parts.length > 1 ? parts[1] : null;
    console.log('getIdea with ID: ' + ideaId);

    const base = BotService.createDb();
    base('Ideas').find(ideaId, function(err, record) {
      if (err) { console.error(err); return; }
      
      const fullMessage = 
`【${record.fields['Idea Title']}】
💪${record.fields['Support Count']}個支持
📍${record.fields['Target Area']}
${record.fields['Idea Statement']}

支持方法：
${BotService.escapeForMarkdownV2(record.fields['Allowed Actions'])}
`;
      //FORMAT ARRAY HERE
      const actionArr = record.fields['Allowed Actions'].split(/\r?\n/).map((eachLine, idx) => {
        return [{
          text: eachLine,
          callback_data: `respondIdea ${idx} ${eachLine}`,
        }];
      });

      ctx.replyWithMarkdown(fullMessage, {
        parse_mode: 'MarkdownV2',
        reply_markup: {
          inline_keyboard: actionArr
        },
      });
    });
  }

  @TelegramActionHandler({ action: /respondIdea/ })
  protected async onRespondIdea(ctx: ContextMessageUpdate) {
    console.log(ctx.update.callback_query.data);
    const parts = ctx.update.callback_query.data.split(' ');
    console.log('repondIdea with idx: ' + parts[1] + parts[2]);

  }


  @TelegramActionHandler({ message: '' })
  async onMessage(ctx: ContextMessageUpdate) {
    switch (ctx.message.text ) {
      case '/browseIdeas':
        console.log(ctx.message);
        //Fetch Ideas table
        const base = BotService.createDb();
        base('Ideas').select({
          view: 'Grid view'
        }).firstPage(function(err, records) {
            if (err) { console.error(err); return; }

            const strRecords = records.reduce((acc, record, idx) => {
              // console.log(record);  
              const strRecord = 
`${idx + 1}\\. 【${record.fields['Idea Title']}】
💪${record.fields['Support Count']}個支持
📍${record.fields['Target Area']}
${record.fields['Idea Statement']}

`;
              return acc + strRecord;
            }, '');

            const fullMessage = 
`今期 Top 5 Ideas
${strRecords}想參與或支持？Click 以下的連結查看更多。

你有 idea? 
/submitIdea \\- 出橋啦！
`;

            const actionArr = records.map((record, idx) => {
              return [{
                text: `查看更多 ${idx + 1}. 【${record.fields['Idea Title']}】`,
                callback_data: `getIdea ${record.id}`,
              }];
            });

            ctx.replyWithMarkdown(fullMessage, {
              parse_mode: 'MarkdownV2',
              reply_markup: {
                inline_keyboard: actionArr
              },
            });
        });
        break;
      case '/submitIdea':
      case '/submitIdeas':
        await ctx.reply(`Submit your idea here: https://airtable.com/shrYwXgCML9aN2dI3`);
        break;
      default:
        await ctx.reply(`You say "${ctx.message.text}".`)

    }
  }
}