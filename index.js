const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const axios = require('axios');
const app = express();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SB_URL, process.env.SB_KEY, { auth: { persistSession: false} });
app.set('view engine', 'ejs');
app.use(bodyParser.json());
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
    .from('tokens')
    .update( update )
    .eq('token', id);

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
    .eq('status', type);

  if (error) {
    console.error('Error checking user:', error);
  } else {
    return data
  }
};
const getoken = async () => {
  const tokens = await userDb("true");
  var random = Math.floor(Math.random() * tokens.length);
  return tokens[random].token
}

const createHeaders = async () => {
  const token = await getoken();
  const headers = {
    'accept-encoding': 'gzip',
    'authorization': `Bearer ${token}`,
    'connection': 'Keep-Alive',
    'content-type': 'application/json; charset=UTF-8',
    'host': 'api.openai.com',
    'user-agent': 'okhttp/4.10.0'
  };
  
  return { headers, token };
};

app.get('/', (req, res) => {
  res.render('index');
});

app.post('/openai/chat', async (req, res) => {
  var body = req.body
  var rechat = async function (body) {
  const { headers, token } = await createHeaders();
  console.log(body)
  try {
    const response = await axios.post('https://api.openai.com/v1/chat/completions', body, { headers });
    res.json(response.data);
  } catch (error) {
    console.log(error.response.status)
    if (error.response.status == 429) {
      console.log(token)
      await updateUser(token, {status: false})
          .then((data, error) => {
            if (error) { console.error(error) }
            console.log("DB Cleaned")
            rechat(body);
          });
    }
  }
  };
  rechat(body);
});

app.listen(3000, () => {
  console.log(`Server is running on 3000`);
});