const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const axios = require('axios');
const app = express();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SB_URL, process.env.SB_KEY, { auth: { persistSession: false} });

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

/* ----- DB Qrs ----- */
async function createUser(user) {
  const { data, error } = await supabase
      .from('users')
      .insert([ user ]);

    if (error) {
      throw new Error('Error creating user : ', error);
    } else {
      return data
    }
};

async function updateUser(id, update) {
  const { data, error } = await supabase
    .from('users')
    .update( update )
    .eq('uid', id);

    if (error) {
      throw new Error('Error updating user : ', error);
    } else {
      return data
    }
};

async function userDb(type) {
  const { data, error } = await supabase
    .from('tokens')
    .select('*')
    .eq('type', type);

  if (error) {
    console.error('Error checking user:', error);
  } else {
    return data
  }
};
const getoken = async () => {
  const tokens = await userDb("openai");
  var random = Math.floor(Math.random() * tokens.length);
  return tokens[random].token
}

const headers = {
  'accept-encoding': 'gzip',
  'authorization': `Bearer ${getoken()}`,
  'connection': 'Keep-Alive',
  'content-type': 'application/json; charset=UTF-8',
  'host': 'api.openai.com',
  'user-agent': 'okhttp/4.10.0'
};

app.get('/', (req, res) => {
  res.render('index');
});

app.post('/add', (req, res) => {
  const newRowData = req.body;
  const tableData = loadTableData();
  tableData.push(newRowData);
  saveTableData(tableData);
  res.json({ success: true, newRowData });
});

app.post('/remove/:index', (req, res) => {
  const { index } = req.params;
  const tableData = loadTableData();
  if (index >= 0 && index < tableData.length) {
    tableData.splice(index, 1);
    saveTableData(tableData);
    res.json({ success: true });
  } else {
    res.json({ success: false, message: 'Invalid index' });
  }
});

app.post('/openai/chat', async (req, res) => {
  const response = await axios.post('https://api.openai.com/v1/chat/completions', req.body, { headers });
  res.json(response.data);
});

app.listen(3000, () => {
  console.log(`Server is running on 3000`);
});
