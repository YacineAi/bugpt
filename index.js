// app.js
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

// Load data from JSON file
const dataPath = './data.json';

app.get('/', (req, res) => {
  const tableData = loadTableData();
  res.render('index', { tableData });
});

app.post('/add', (req, res) => {
  const newRowData = req.body;
  const tableData = loadTableData();
  tableData.push(newRowData);
  saveTableData(tableData);
  res.redirect('/');
});

app.post('/remove/:index', (req, res) => {
  const { index } = req.params;
  const tableData = loadTableData();
  if (index >= 0 && index < tableData.length) {
    tableData.splice(index, 1);
    saveTableData(tableData);
  }
  res.redirect('/');
});

// Helper functions to read and write data to JSON file
function loadTableData() {
  try {
    const data = fs.readFileSync(dataPath);
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading data from JSON file:', err);
    return [];
  }
}

function saveTableData(tableData) {
  try {
    fs.writeFileSync(dataPath, JSON.stringify(tableData, null, 2));
  } catch (err) {
    console.error('Error writing data to JSON file:', err);
  }
}

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
