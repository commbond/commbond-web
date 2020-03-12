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


  //@future Put database logic in a separte lib module
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

  //@future Separate user-facing view from this module 
  static makeDetailsPageTextContent(ideaRecord, actionRecords) {
    const strActionLines = actionRecords.reduce((acc, eachRec) => {
      if(eachRec.fields['Action Type'] === 'Downvote') {
        return acc;
      }
      return acc + 
`${eachRec.fields['Action Title']} - ${eachRec.fields['Count']} 人
`;
    }, '');

    const strContent = 
`【${ideaRecord.fields['Idea Title']}】
💪已集合 ${ideaRecord.fields['Participate Count']} 名參與者
📍${ideaRecord.fields['Target Location']}
${ideaRecord.fields['Idea Statement']}
    
共有 ${ideaRecord.fields['Support Count']} 名支持者
${BotService.escapeForMarkdownV2(strActionLines)}

\*你呢？幫定唔幫？\*`;

    return strContent;
  }


  /* This decorator handle /start command */
  @TelegramActionHandler({ onStart: true })
  async onStart(ctx: ContextMessageUpdate) {
    const me = await this.telegrafTelegramService.getMe();
    console.log(me);
    const message = 
`歡迎你 come 幫！
你想做咩？

/browseIdeas - 睇今期最 hit ideas！
/submitIdea - 有 idea? 出橋啦`;
    await ctx.reply(BotService.escapeForMarkdownV2(message), {
      parse_mode: 'MarkdownV2',
      // reply_markup: {
      //   one_time_keyboard: true,
      //   resize_keyboard: true,
      //   keyboard: [
      //     [
      //       {
      //         text: 'Browse ideas',
      //       },
      //     ],
      //     [
      //       {
      //         text: 'Submit idea ',
      //       }
      //     ]
      //   ]
      // },
    });
  }

  @TelegramActionHandler({ action: /getIdea/ })
  protected async onGetIdea(ctx: ContextMessageUpdate) {
    const parts = ctx.update.callback_query.data.split(' ');
    const ideaId = parts.length > 1 ? parts[1] : null;
    console.log('getIdea with ID: ' + ideaId);

    // 1. Find Idea by by ID
    const base = BotService.createDb();
    base('Ideas').find(ideaId, function(err, record) {
      if (err) { console.error(err); return; }
      
      //2. Fetch all Actions (with titles and type) of this idea
      const filterStr = record.fields['Actions'].reduce((acc, recID) => {
        return `${acc}RECORD_ID() = '${recID}', `;
      }, 'OR(').slice(0, -2) + ')';

      base('Actions').select({
        view: 'Grid view',
        filterByFormula: filterStr,
        fields: ['Action Title', 'Action Type', 'Count'],
      }).firstPage(function(err, actionRecords) {
          if (err) { console.error(err); return; }
          // console.log(actionRecords);

          const textContent = BotService.makeDetailsPageTextContent(record, actionRecords);
          const actionArr = actionRecords.map((eachAction) => {
            // console.log(eachAction.fields);
            return [{
              text: eachAction.fields['Action Title'],
              callback_data: `respondIdea ${eachAction.id} ${eachAction.fields['Action Title']}`,
            }];
          });

          ctx.replyWithMarkdown(textContent, {
            parse_mode: 'MarkdownV2',
            reply_markup: {
              inline_keyboard: actionArr
            },
          });
      });
      
    });
  }

  @TelegramActionHandler({ action: /respondIdea/ })
  protected async onRespondIdea(ctx: ContextMessageUpdate) {
    const parts = ctx.update.callback_query.data.split(' ');
    console.log(ctx.update.callback_query);
    // console.log(ctx.update.callback_query.from.id);
    console.log('repondIdea: ' + parts[1] + parts[2]);

    //1. Check if user exists, otherwise registers user

    //2. Fetch selected Action record and also its sibling Actions records

    //3. Clear user's previous selection and update the Action record's ByUser field.


  }


  @TelegramActionHandler({ message: '' })
  async onMessage(ctx: ContextMessageUpdate) {
    switch (ctx.message.text ) {
      case '/browseIdeas':
        console.log(ctx.message);
        //Fetch Ideas table
        const base = BotService.createDb();
        base('Ideas').select({
          view: 'Grid view',
          pageSize: 10,
        }).firstPage(function(err, records) {
            if (err) { console.error(err); return; }

            const strRecords = records.reduce((acc, record, idx) => {
              // console.log(record);  
              const strRecord = 
`${idx + 1}\\. 【${record.fields['Idea Title']}】
💪${record.fields['Participate Count']} 人參與
📍${record.fields['Target Location']}
${record.fields['Idea Statement']}

`;
              return acc + strRecord;
            }, '');

            const fullMessage = 
`今期 Top 5 Ideas
${strRecords}想參與或支持？點擊以下的連結查看更多。

你有 idea? 
/submitIdea \\- 出橋啦！
`;

            const actionArr = records.map((record, idx) => {
              return [{
                text: `查看更多 ${idx + 1}.【${record.fields['Idea Title']}】`,
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