import { ContextMessageUpdate } from 'telegraf';
import Airtable from '../../lib/airtable';
import { escapeForMarkdownV2, makeMainMenuReplyMarkup, makeLoadingReplyMarkup, sendMessage } from '../../lib/utils';

async function HandleBrowseIdeas(ctx: ContextMessageUpdate) {
  const { records } = await Airtable.getAllIdeas();

  await sendMessage(ctx, makeListingPageTextContent(records), makeListingPageKeyboard(records));
}

async function HandleGetIdea(ctx: ContextMessageUpdate) {
  const parts = ctx.update.callback_query.data.split(' ');
  const ideaId = parts.length > 1 ? parts[1] : null;
  console.log('GET_IDEA with ID: ' + ideaId);

  // return idea record and action records 
  const result = await Airtable.getIdea({ id: ideaId });

  //@todo, add param lastSelectedActionId
  await sendMessage(ctx, makeDetailsPageTextContent(result.record, result.actionRecords), makeDetailsPageKeyboard(result.actionRecords));
}

async function HandleRespondIdea(ctx: ContextMessageUpdate) {
  const callbackDataParts = ctx.update.callback_query.data.split(' ');

  const selectedActionId = callbackDataParts[1];
  // console.log("ctx callback_query :");
  // console.log(ctx.update.callback_query);
  const user = ctx.update.callback_query.from;

  ctx.editMessageReplyMarkup(makeLoadingReplyMarkup());

  const { updatedIdeaRecord, updatedActionRecords, updatedRecord, userRecord } = await Airtable.makeAction({ user, selectedActionId })

  //6. Update displayed record with newly added count (use editMessage https://core.telegram.org/bots/api#editmessagetext)
  ctx.editMessageText(makeDetailsPageTextContent(updatedIdeaRecord, updatedActionRecords, selectedActionId, userRecord), {
    parse_mode: 'MarkdownV2',
    disable_web_page_preview: true,
    reply_markup: makeMainMenuReplyMarkup([[{
      text: updatedRecord && updatedRecord.fields['Action Type'] === 'Conditionally participate' ? '參與條件是⋯'
        :
        (updatedRecord && updatedRecord.fields['Action Type'] === 'Downvote' ? '不支持原因是⋯'
          :
          '提交問題或意見'),
      url: `https://airtable.com/shrvE6uhIe32ydaz9?prefill_By+User=${userRecord.id}&prefill_With+Action=${selectedActionId}`,
    }]]),
  });
}


function makeIdeaStatement(ideaFields) {
  return `我們要 *${escapeForMarkdownV2(ideaFields['Idea - What'])}* ，利用 *${escapeForMarkdownV2(ideaFields['Idea - How'])}* ，令 *${escapeForMarkdownV2(ideaFields['Idea - Who'])}* 可以 *${escapeForMarkdownV2(ideaFields['Idea - Why'])}*。`;
}

function makeListingPageTextContent(records) {
  const strRecords = records.reduce((acc, record, idx) => {
    const strRecord =
      `${idx + 1}\\. 【${escapeForMarkdownV2(record.fields['Idea Title'])}】
💪${record.fields['Participation Count']} 人參與
📍${escapeForMarkdownV2(record.fields['Target Location'])}
${makeIdeaStatement(record.fields)}

`;
    return acc + strRecord;
  }, '');

  const fullMessage =
    `今期 Top Ideas
${strRecords}想參與或支持？點擊以下的連結查看更多。

你有 idea? 
/submitidea － 出橋啦！
`;

  return fullMessage;
}

function makeListingPageKeyboard(records) {
  const actionArr = records.map((record, idx) => {
    return [{
      text: `查看詳情 ${idx + 1}.【${escapeForMarkdownV2(record.fields['Idea Title'])}】`,
      callback_data: `GET_IDEA ${record.id}`,
    }];
  });

  return {
    inline_keyboard: actionArr
  };
}

function makeDetailsPageTextContent(ideaRecord, actionRecords, selectedActionId?, userRecord?) {
  let selectedActionType;
  const strActionLines = actionRecords.reduce((acc, eachRec) => {
    const isSelected = selectedActionId === eachRec.id;
    if (isSelected) {
      selectedActionType = eachRec.fields['Action Type']
    }

    if (eachRec.fields['Action Type'] === 'Downvote') {
      return acc;
    }
    return acc + (isSelected ? '*' : '') + `\n${escapeForMarkdownV2(eachRec.fields['Action Title'])} － ${eachRec.fields['Count']} 人` + (isSelected ? ' \\(已選\\)*' : '');
  }, '');

  const strContent =
    `【${escapeForMarkdownV2(ideaRecord.fields['Idea Title'])}】
💪已集合 ${ideaRecord.fields['Participation Count']} 名參與者
📍${escapeForMarkdownV2(ideaRecord.fields['Target Location'])}

${makeIdeaStatement(ideaRecord.fields)}`
    + (ideaRecord.fields['Event Date'] ? '\n\n日期：' + escapeForMarkdownV2(ideaRecord.fields['Event Date']) : '')
    + (ideaRecord.fields['Event Time'] ? '\n時間：' + escapeForMarkdownV2(ideaRecord.fields['Event Time']) : '')
    + (ideaRecord.fields['Event Location'] ? '\n地點：' + escapeForMarkdownV2(ideaRecord.fields['Event Location']) : '')
    +
    `

共有 ${ideaRecord.fields['Support Count']} 名支持者${strActionLines}`
    + (ideaRecord.fields['Actions Details'] ? '\n\n💪參與行動詳釋：\n' + escapeForMarkdownV2(ideaRecord.fields['Actions Details']) : '')
    + (ideaRecord.fields['Other Details'] ? '\n\n其他詳情：\n' + escapeForMarkdownV2(ideaRecord.fields['Other Details']) : '')
    + (ideaRecord.fields['Future Extension'] ? '\n\n將來延伸：\n' + escapeForMarkdownV2(ideaRecord.fields['Future Extension']) : '')
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
    + (selectedActionType ? escapeForMarkdownV2(`https://airtable.com/shrvE6uhIe32ydaz9?prefill_By+User=${userRecord.id}&prefill_With+Action=${selectedActionId}`) : '')
    + (selectedActionType === 'Conditionally participate' ? '（如果詳情有改，我們會通知你）' : '')
    ;


  return strContent;
}

function makeDetailsPageKeyboard(actionRecords, selectedActionId?) {
  const actionArr = actionRecords.map((eachAction) => {

    return [{
      text: eachAction.fields['Action Title'] + (eachAction.id === selectedActionId ? ' (已選取)' : ''), //@todo: mark (已選取) if already selected by user
      callback_data: `RESPOND_IDEA ${eachAction.id}`,
    }];
  });

  return { inline_keyboard: actionArr };
}

export default {
  HandleBrowseIdeas,
  HandleGetIdea,
  HandleRespondIdea,

}