
import Airtable from 'airtable';
// import AirtablePlus from 'airtable-plus';
require('dotenv').config();

console.log(process.env);
// const base = new Airtable({
//   baseID: 'appUW06bs08YxzVDM',
//   apiKey: process.env.AIRTABLE_API_KEY,
//   // tableName: 'Table 1',
// });

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base('appUW06bs08YxzVDM')

const findIdea = async ({ id }) => {
  try {
    // 1. Find Idea by by ID   
    const record = await base('Ideas').find(id)
    //2. Fetch all Actions (with titles and type) of this idea
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
    record: [],
    actionRecords: []
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

export default {
  base,
  findIdea,
  getAllIdeas
}