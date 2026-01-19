/**
 * Batch Recipe Extraction Script
 *
 * This script extracts recipe content from external website links
 * and saves them to Firebase.
 *
 * Usage:
 * 1. Open the cookbook app in browser
 * 2. Sign in with authorized account
 * 3. Open browser console (F12)
 * 4. Copy and paste this script
 * 5. Run: batchExtract(20) to process 20 recipes at a time
 */

window.findRecipeData = function(data) {
  if (!data) return null;
  if (Array.isArray(data)) {
    for (var i = 0; i < data.length; i++) {
      var r = window.findRecipeData(data[i]);
      if (r) return r;
    }
    return null;
  }
  if (typeof data === 'object') {
    var type = data['@type'];
    if (type === 'Recipe' || (Array.isArray(type) && type.includes('Recipe'))) return data;
    if (data['@graph']) return window.findRecipeData(data['@graph']);
  }
  return null;
};

window.formatRecipeData = function(r) {
  var t = '';
  if (r.description) t += r.description + '\n\n';
  if (r.recipeYield) {
    var y = Array.isArray(r.recipeYield) ? r.recipeYield[0] : r.recipeYield;
    t += 'Yield: ' + y + '\n\n';
  }
  if (r.recipeIngredient && r.recipeIngredient.length) {
    t += 'Ingredients:\n';
    for (var i = 0; i < r.recipeIngredient.length; i++) {
      t += '- ' + r.recipeIngredient[i] + '\n';
    }
    t += '\n';
  }
  if (r.recipeInstructions) {
    t += 'Instructions:\n';
    var inst = Array.isArray(r.recipeInstructions) ? r.recipeInstructions : [r.recipeInstructions];
    for (var j = 0; j < inst.length; j++) {
      var s = inst[j];
      if (typeof s === 'string') t += (j+1) + '. ' + s + '\n';
      else if (s.text) t += (j+1) + '. ' + s.text + '\n';
    }
  }
  return t.trim();
};

window.extractFromHtml = function(html, url) {
  var parser = new DOMParser();
  var doc = parser.parseFromString(html, 'text/html');

  // Try JSON-LD first
  var scripts = doc.querySelectorAll('script[type="application/ld+json"]');
  for (var i = 0; i < scripts.length; i++) {
    try {
      var data = JSON.parse(scripts[i].textContent);
      var recipeData = window.findRecipeData(data);
      if (recipeData) {
        var text = window.formatRecipeData(recipeData);
        if (text && text.length > 50) return text;
      }
    } catch(e) {}
  }

  // Try common selectors
  var selectors = [
    '.wprm-recipe-container',
    '.recipe-content',
    '[itemtype*="Recipe"]',
    '.tasty-recipes',
    'article .recipe'
  ];

  for (var j = 0; j < selectors.length; j++) {
    var el = doc.querySelector(selectors[j]);
    if (el) {
      var text = (el.innerText || el.textContent).trim();
      if (text.length > 100) return text;
    }
  }

  // Fallback: ingredients and instructions
  var ingredients = [];
  var instructions = [];

  doc.querySelectorAll('[class*="ingredient"], li[itemprop="recipeIngredient"]').forEach(function(el) {
    var t = (el.innerText || el.textContent).trim();
    if (t && t.length > 2 && t.length < 200) ingredients.push(t);
  });

  doc.querySelectorAll('[class*="instruction"], [class*="step"], li[itemprop="recipeInstructions"]').forEach(function(el) {
    var t = (el.innerText || el.textContent).trim();
    if (t && t.length > 10) instructions.push(t);
  });

  if (ingredients.length > 0 || instructions.length > 0) {
    var result = '';
    if (ingredients.length > 0) result = 'Ingredients:\n' + ingredients.join('\n') + '\n\n';
    if (instructions.length > 0) result += 'Instructions:\n' + instructions.join('\n');
    return result;
  }

  return null;
};

window.batchExtract = async function(limit) {
  limit = limit || 10;

  if (!firebase.auth().currentUser) {
    console.error('Please sign in first!');
    return;
  }

  var db = firebase.firestore();
  var snapshot = await db.collection('recipes').get();
  var recipes = snapshot.docs.map(function(doc) { return Object.assign({ id: doc.id }, doc.data()); });

  var needsExtraction = recipes.filter(function(r) {
    return !r.content.text && !r.content.transcription && r.content.url &&
      r.content.url.indexOf('instagram.com') === -1 &&
      r.content.url.indexOf('facebook.com') === -1 &&
      r.content.url.indexOf('youtube.') === -1 &&
      r.content.url.indexOf('youtu.be') === -1 &&
      r.content.url.indexOf('tiktok.com') === -1;
  });

  console.log('Need to extract:', needsExtraction.length, 'recipes');
  console.log('Processing first', limit, 'recipes...');

  var success = 0, failed = 0;
  var results = [];

  for (var i = 0; i < Math.min(limit, needsExtraction.length); i++) {
    var recipe = needsExtraction[i];
    console.log((i+1) + '/' + limit + ' Processing:', recipe.name);

    try {
      var response = await fetch('https://corsproxy.io/?' + encodeURIComponent(recipe.content.url));
      var html = await response.text();
      var text = window.extractFromHtml(html, recipe.content.url);

      if (text && text.length > 50) {
        await db.collection('recipes').doc(recipe.id).update({ 'content.text': text });
        success++;
        results.push({ name: recipe.name, status: 'success', len: text.length });
        console.log('  Success:', text.length, 'chars');
      } else {
        failed++;
        results.push({ name: recipe.name, status: 'no_recipe_found' });
        console.log('  No recipe content found');
      }
    } catch(e) {
      failed++;
      results.push({ name: recipe.name, status: 'error', msg: e.message });
      console.log('  Error:', e.message);
    }

    // Rate limiting
    await new Promise(function(r) { setTimeout(r, 1000); });
  }

  // Clear cache
  localStorage.removeItem('recipes_cache');
  localStorage.removeItem('recipes_cache_time');

  console.log('\n=== COMPLETE ===');
  console.log('Success:', success);
  console.log('Failed:', failed);
  console.log('Remaining:', needsExtraction.length - limit);

  return { success: success, failed: failed, remaining: needsExtraction.length - limit, results: results };
};

console.log('Batch extraction script loaded!');
console.log('Run: batchExtract(20) to extract recipes from 20 website links');
