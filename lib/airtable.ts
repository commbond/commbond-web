
import Airtable from 'airtable';
require('dotenv').config();

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base('appUW06bs08YxzVDM')

const getIdea = async ({ id }) => {
  try {
    // 1. Find Idea by by ID   
    const record = await base('Ideas').find(id)
    // 2. Fetch all Actions (with titles and type) of this idea
    const filterStr = record.fields['Actions'].reduce((acc, recID) => {
      return `${acc}RECORD_ID() = '${recID}', `;
    }, 'OR(').slice(0, -2) + ')';

    const actionRecords = await base('Actions').select({
      view: 'Grid view',
      filterByFormula: filterStr,
      fields: ['Action Title', 'Action Type', 'Count', 'By Users'],
    }).firstPage();
    return {
      record,
      actionRecords
    }
  } catch (err) {
    console.log(err);
  }
  return {
    record: [] as any,
    actionRecords: [] as any,
  }
}

const getAllIdeas = async () => {
  try {
    const records = await base('Ideas').select({
      view: 'Grid view',
      pageSize: 5,
      filterByFormula: 'AND({Approval} = "Approved")',
      sort: [{ field: "Support Count", direction: "desc" }],
    }).firstPage();
    return {
      records
    }
  } catch (err) {
    console.log(err);
  }
  return {
    records: []
  }
}

const getUserOrRegister = async ({ user }) => {
  const userRecs = await base('Users').select({
    view: 'Grid view',
    filterByFormula: `{User Id} = '${user.id}'`, //use user id here as username might change
  }).firstPage();
  return userRecs.length === 0 ?
    await base('Users').create({
      "Username": user.username,
      "User Id": String(user.id),
    }, { typecast: true })
    : userRecs[0]
}

const findUserLastAction = async ({ userRecord, actionRecords }) => {
  return actionRecords.find(eachAction => {
    const userRecIdArr = eachAction.fields['By Users'] || [];
    return userRecIdArr.includes(userRecord.id);
      
  });
};

const addUsersOnAction = async ({ selectedActionId, userRecord, existingSupporters }) => {
  if (existingSupporters.includes(userRecord.id)) return
  return await base('Actions').update([
    {
      'id': selectedActionId,
      'fields': {
        'By Users': [...existingSupporters, userRecord.id]
      }
    },
  ])
}

const unselectAction = async ({ lastSelectedActionRec, userRecord }) => {
  const supporters = lastSelectedActionRec.fields['By Users'];
  const index = supporters.indexOf(userRecord.id);
  if (index == -1) return
  supporters.splice(index, 1);
  return await base('Actions').update([
    {
      'id': lastSelectedActionRec.id,
      'fields': {
        'By Users': supporters
      }
    },
  ])
}

const makeAction = async ({ user, selectedActionId }) => {
  // 1. Fetch SelectedAction record 
  const selectedActionRecord = await base('Actions').find(selectedActionId);
  const ideaId = selectedActionRecord.fields['On Idea'][0];
  const existingSupporters = selectedActionRecord.fields['By Users'] || [];

  // 2. Check if user exists, otherwise registers user
  const userRecord = await getUserOrRegister({ user })

  // 3. Fetch all sibling Actions 
  const idea = await getIdea({ id: ideaId })

  // 4. Clear any user's previous selection 
  const lastSelectedAction = await findUserLastAction({ userRecord, actionRecords: idea.actionRecords });
  // console.log(lastSelectedAction);
  if (lastSelectedAction) {
    await unselectAction({ lastSelectedActionRec: lastSelectedAction, userRecord });
  }
  // 5. Update Actions with user's newly selected Action
  const updatedRecord = await addUsersOnAction({ selectedActionId, userRecord, existingSupporters })
  return {
    updatedIdeaRecord: {
      ...idea.record,
      fields: {
        ...idea.record.fields,
        'Participation Count': updatedRecord &&  updatedRecord.hasOwnProptery('fields') && updatedRecord.fields['Action Type'] === 'Participate' ? idea.record.fields['Participation Count'] + 1 : idea.record.fields['Participation Count'],
        'Support Count': updatedRecord &&  updatedRecord.hasOwnProptery('fields') && updatedRecord.fields['Action Type'] !== 'Downvote' ? idea.record.fields['Support Count'] + 1 : idea.record.fields['Support Count'],
      }
    },
    updatedActionRecords: idea.actionRecords.map((actionRec) => {
      if (updatedRecord && actionRec.id === updatedRecord.id) {
        return updatedRecord;
      }
      return actionRec;
    })
  }
}

export default {
  base,
  getIdea,
  getAllIdeas,
  makeAction
}