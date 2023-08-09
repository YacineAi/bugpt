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
      .from('tokens')
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

async function addDb(token) {
  const { data, error } = await supabase
    .from('tokens')
    .select('*')
    .eq('token', token);
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

function countStatusValues(data) {
  let trueCount = 0;
  let falseCount = 0;

  for (const item of data) {
    if (item.status === true) {
      trueCount++;
    } else if (item.status === false) {
      falseCount++;
    }
  }

  return { trueCount, falseCount };
}

async function fetchData() {
  const { data, error } = await supabase
    .from('tokens')
    .select('*');

  if (error) {
    console.error('Error fetching data:', error);
    return [];
  }
  const maskedData = data.map(item => {
    if (item.token && item.token.length > 7) {
      const firstPart = item.token.substring(0, 5);
      const lastPart = item.token.substring(item.token.length - 2);
      const middleLength = Math.min(item.token.length - 7, 17 - firstPart.length - lastPart.length);
      const maskedMiddle = '*'.repeat(middleLength);
      item.token = firstPart + maskedMiddle + lastPart;
    }
    return item;
  });

  return maskedData;
}
app.get('/', async (req, res) => {
  const data = await fetchData();
  const counts = countStatusValues(data);
  res.render('index', { counts, data, req });
});

app.post('/openai/chat', async (req, res) => {
  var body = req.body
  var rechat = async function (body) {
  const { headers, token } = await createHeaders();
  //console.log(body)
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

app.post('/openai/token', async (req, res) => {
  const token = await addDb(req.body.token);
  if (token[0]) { // token here
    res.json({status : "inDB"})
  } else {
    await createUser({token: req.body.token, type: "openai" })
            .then((data, error) => {
              res.json({status : "Done"})
            });
  } 
});

app.listen(3000, () => {
  console.log(`Server is running on 3000`);
});