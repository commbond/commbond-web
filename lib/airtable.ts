
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

const getUserLastActionRec = async ({ userRecord, actionRecords }) => {
  const eachAction = await actionRecords.find(async eachAction => {
    const userRecIdArr = eachAction.fields['By Users'] || [];
    if (userRecIdArr.includes(userRecord.id)) {
      return eachAction
    }
  })
  return eachAction
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

const removeUsersOnAction = async ({ selectedActionId, userRecord, existingSupporters }) => {
  const index = existingSupporters.indexOf(userRecord.id);
  if (index == -1) return
  return await base('Actions').update([
    {
      'id': selectedActionId,
      'fields': {
        'By Users': [existingSupporters.splice(index, 1)]
      }
    },
  ])
}



const getActionRecords = async ({ user, selectedActionId }) => {
  // 1. Fetch SelectedAction record 
  const selectedActionRecord = await base('Actions').find(selectedActionId);
  const ideaId = selectedActionRecord.fields['On Idea'][0];
  const existingSupporters = selectedActionRecord.fields['By Users'] || [];

  // 2. Check if user exists, otherwise registers user
  const userRecord = await getUserOrRegister({ user })

  // 3. Fetch all sibling Actions 
  const idea = await getIdea({ id: ideaId })

  // 4. Clear any user's previous selection 
  const lastSelectedAction = await getUserLastActionRec({ userRecord, actionRecords: idea.actionRecords });
  if (lastSelectedAction) {
    await removeUsersOnAction({ selectedActionId: lastSelectedAction.id, userRecord, existingSupporters: lastSelectedAction.fields['By Users'] })
  }
  // 5. Update Actions with user's newly selected Action
  const updatedRecord = await addUsersOnAction({ selectedActionId, userRecord, existingSupporters })
  return {
    updatedIdeaRecord: {
      ...idea.record,
      fields: {
        ...idea.record.fields,
        'Participation Count': updatedRecord && updatedRecord.hasOwnProptery('fields') && updatedRecord.fields['Action Type'] === 'Participate' ? idea.record.fields['Participation Count'] + 1 : idea.record.fields['Participation Count'],
        'Support Count': updatedRecord && updatedRecord.hasOwnProptery('fields') && updatedRecord.fields['Action Type'] !== 'Downvote' ? idea.record.fields['Support Count'] + 1 : idea.record.fields['Support Count'],
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
  getActionRecords
}