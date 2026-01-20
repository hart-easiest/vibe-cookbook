// Sync recipes.json from Firebase Firestore REST API
const https = require('https');
const fs = require('fs');

const PROJECT_ID = 'vibe-cookbook';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/recipes`;

function parseFirestoreValue(value) {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.integerValue !== undefined) return parseInt(value.integerValue);
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.booleanValue !== undefined) return value.booleanValue;
  if (value.nullValue !== undefined) return null;
  if (value.arrayValue) {
    return (value.arrayValue.values || []).map(parseFirestoreValue);
  }
  if (value.mapValue) {
    const result = {};
    for (const [k, v] of Object.entries(value.mapValue.fields || {})) {
      result[k] = parseFirestoreValue(v);
    }
    return result;
  }
  return null;
}

function parseDocument(doc) {
  const recipe = { id: doc.name.split('/').pop() };
  for (const [key, value] of Object.entries(doc.fields || {})) {
    recipe[key] = parseFirestoreValue(value);
  }
  return recipe;
}

async function fetchAll() {
  let recipes = [];
  let pageToken = null;

  do {
    const url = pageToken
      ? `${BASE_URL}?pageSize=300&pageToken=${pageToken}`
      : `${BASE_URL}?pageSize=300`;

    const data = await new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve(JSON.parse(body)));
        res.on('error', reject);
      });
    });

    if (data.documents) {
      recipes = recipes.concat(data.documents.map(parseDocument));
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return recipes;
}

fetchAll().then(recipes => {
  // Sort by date descending
  recipes.sort((a, b) => new Date(b.date) - new Date(a.date));

  const output = { recipes };
  fs.writeFileSync('recipes.json', JSON.stringify(output, null, 2));

  const withTal = recipes.filter(r => r.tags && r.tags.includes('tal')).length;
  const instagramNamed = recipes.filter(r => r.name && r.name.includes('מתכון מאינסטגרם')).length;

  console.log('Synced ' + recipes.length + ' recipes to recipes.json');
  console.log('With tal tag: ' + withTal);
  console.log('Named Instagram: ' + instagramNamed);
}).catch(console.error);
