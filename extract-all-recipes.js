/**
 * Extract All Recipes from Links
 *
 * This script extracts recipe text from all link-type recipes that don't have transcriptions.
 * Run this script in the browser console while on the cookbook app page.
 *
 * Usage:
 * 1. Open the cookbook app in your browser
 * 2. Sign in with an authorized account
 * 3. Open the browser console (F12 -> Console)
 * 4. Copy and paste this entire script
 * 5. Run: extractAllRecipes()
 */

async function extractAllRecipes() {
  // Check if user is signed in
  if (!firebase.auth().currentUser) {
    console.error('Please sign in first!');
    return;
  }

  // Get all recipes from Firebase
  const snapshot = await firebase.firestore().collection('recipes').get();
  const recipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Filter to link-type recipes without transcription (excluding Instagram/YouTube/TikTok/Facebook)
  const linkRecipes = recipes.filter(r => {
    if (r.type !== 'link' && r.type !== 'video') return false;
    if (!r.content?.url) return false;
    if (r.content?.transcription) return false;

    const url = r.content.url;
    // Skip social media - they don't have extractable recipes
    if (url.includes('instagram.com')) return false;
    if (url.includes('youtube.com')) return false;
    if (url.includes('youtu.be')) return false;
    if (url.includes('tiktok.com')) return false;
    if (url.includes('facebook.com')) return false;

    return true;
  });

  console.log(`Found ${linkRecipes.length} link recipes without transcription`);
  console.log('URLs to process:');
  linkRecipes.forEach((r, i) => console.log(`${i + 1}. ${r.name}: ${r.content.url}`));

  let extracted = 0;
  let failed = 0;
  const results = [];

  for (const recipe of linkRecipes) {
    console.log(`\n[${extracted + failed + 1}/${linkRecipes.length}] Processing: ${recipe.name}`);
    console.log(`URL: ${recipe.content.url}`);

    try {
      const text = await extractRecipeFromUrl(recipe.content.url);

      if (text && text.trim().length > 50) {
        // Save to Firebase
        await firebase.firestore().collection('recipes').doc(recipe.id).update({
          'content.transcription': text
        });

        console.log(`✓ Extracted ${text.length} characters`);
        extracted++;
        results.push({ name: recipe.name, status: 'success', chars: text.length });
      } else {
        console.log(`✗ Could not extract content (too short or empty)`);
        failed++;
        results.push({ name: recipe.name, status: 'failed', reason: 'too short' });
      }
    } catch (error) {
      console.log(`✗ Error: ${error.message}`);
      failed++;
      results.push({ name: recipe.name, status: 'failed', reason: error.message });
    }

    // Wait between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n=== COMPLETE ===`);
  console.log(`Extracted: ${extracted}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${linkRecipes.length}`);

  console.log('\n=== RESULTS ===');
  results.forEach(r => {
    const status = r.status === 'success' ? '✓' : '✗';
    console.log(`${status} ${r.name}: ${r.status === 'success' ? r.chars + ' chars' : r.reason}`);
  });

  // Clear local cache so changes are visible
  localStorage.removeItem('recipes_cache');
  localStorage.removeItem('recipes_cache_time');
  console.log('\nLocal cache cleared. Refresh the page to see changes.');

  return { extracted, failed, total: linkRecipes.length, results };
}

async function extractRecipeFromUrl(url) {
  // Use a CORS proxy to fetch the page
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  const response = await fetch(proxyUrl);
  const data = await response.json();

  if (!data.contents) {
    throw new Error('Failed to fetch page');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(data.contents, 'text/html');

  // Try JSON-LD structured data first
  const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]');
  for (const script of jsonLdScripts) {
    try {
      const jsonData = JSON.parse(script.textContent);
      const recipeData = findRecipe(jsonData);
      if (recipeData) {
        return formatRecipe(recipeData);
      }
    } catch (e) {
      // Continue
    }
  }

  // Try common recipe selectors
  const selectors = [
    '.wprm-recipe-container',
    '.recipe-content',
    '.recipe-container',
    '[itemtype*="Recipe"]',
    '.tasty-recipes',
    '.mv-recipe',
    '.entry-content'
  ];

  for (const selector of selectors) {
    const element = doc.querySelector(selector);
    if (element) {
      const text = cleanText(element.innerText || element.textContent);
      if (text.length > 100) return text;
    }
  }

  // Try to extract ingredients and instructions separately
  const ingredients = [];
  const instructions = [];

  doc.querySelectorAll('[class*="ingredient"], li[itemprop="recipeIngredient"]').forEach(el => {
    const text = (el.innerText || el.textContent).trim();
    if (text && text.length > 2 && text.length < 200) ingredients.push(text);
  });

  doc.querySelectorAll('[class*="instruction"], [class*="direction"], [class*="step"], li[itemprop="recipeInstructions"]').forEach(el => {
    const text = (el.innerText || el.textContent).trim();
    if (text && text.length > 10) instructions.push(text);
  });

  if (ingredients.length > 0 || instructions.length > 0) {
    let result = '';
    if (ingredients.length) result += 'מרכיבים:\n' + ingredients.join('\n') + '\n\n';
    if (instructions.length) result += 'הוראות הכנה:\n' + instructions.join('\n');
    return result;
  }

  return '';
}

function findRecipe(data) {
  if (!data) return null;
  if (Array.isArray(data)) {
    for (const item of data) {
      const result = findRecipe(item);
      if (result) return result;
    }
    return null;
  }
  if (typeof data === 'object') {
    if (data['@type'] === 'Recipe' || (Array.isArray(data['@type']) && data['@type'].includes('Recipe'))) {
      return data;
    }
    if (data['@graph']) return findRecipe(data['@graph']);
  }
  return null;
}

function formatRecipe(recipe) {
  let text = '';

  if (recipe.description) text += recipe.description + '\n\n';

  // Times
  const times = [];
  if (recipe.prepTime) times.push(`זמן הכנה: ${formatDuration(recipe.prepTime)}`);
  if (recipe.cookTime) times.push(`זמן בישול: ${formatDuration(recipe.cookTime)}`);
  if (recipe.totalTime) times.push(`זמן כולל: ${formatDuration(recipe.totalTime)}`);
  if (times.length > 0) text += times.join(' | ') + '\n\n';

  // Servings
  if (recipe.recipeYield) {
    text += `מנות: ${Array.isArray(recipe.recipeYield) ? recipe.recipeYield[0] : recipe.recipeYield}\n\n`;
  }

  if (recipe.recipeIngredient?.length > 0) {
    text += 'מרכיבים:\n';
    recipe.recipeIngredient.forEach(ing => text += `• ${ing}\n`);
    text += '\n';
  }

  if (recipe.recipeInstructions) {
    text += 'הוראות הכנה:\n';
    const instructions = Array.isArray(recipe.recipeInstructions) ? recipe.recipeInstructions : [recipe.recipeInstructions];
    instructions.forEach((step, idx) => {
      if (typeof step === 'string') {
        text += `${idx + 1}. ${step}\n`;
      } else if (step.text) {
        text += `${idx + 1}. ${step.text}\n`;
      } else if (step['@type'] === 'HowToSection' && step.itemListElement) {
        text += `\n${step.name || ''}:\n`;
        step.itemListElement.forEach((subStep, subIdx) => {
          const stepText = typeof subStep === 'string' ? subStep : subStep.text;
          if (stepText) text += `${subIdx + 1}. ${stepText}\n`;
        });
      }
    });
  }

  return text.trim();
}

function formatDuration(duration) {
  if (!duration) return '';
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return duration;
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const parts = [];
  if (hours > 0) parts.push(`${hours} שעות`);
  if (minutes > 0) parts.push(`${minutes} דקות`);
  return parts.join(' ו-') || duration;
}

function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .replace(/Share.*?Facebook|Tweet|Pinterest|Print|Email/gi, '')
    .replace(/\d+ תגובות?/g, '')
    .trim();
}

// List recipes that need extraction
async function listRecipesNeedingExtraction() {
  const snapshot = await firebase.firestore().collection('recipes').get();
  const recipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const linkRecipes = recipes.filter(r => {
    if (r.type !== 'link' && r.type !== 'video') return false;
    if (!r.content?.url) return false;
    if (r.content?.transcription) return false;

    const url = r.content.url;
    if (url.includes('instagram.com')) return false;
    if (url.includes('youtube.com')) return false;
    if (url.includes('youtu.be')) return false;
    if (url.includes('tiktok.com')) return false;
    if (url.includes('facebook.com')) return false;

    return true;
  });

  console.log(`Found ${linkRecipes.length} link recipes needing extraction:`);
  linkRecipes.forEach((r, i) => {
    console.log(`${i + 1}. ${r.name}`);
    console.log(`   URL: ${r.content.url}`);
  });

  return linkRecipes;
}

// Instructions
console.log('Recipe Extraction Script Loaded!');
console.log('Run listRecipesNeedingExtraction() to see which recipes need extraction');
console.log('Run extractAllRecipes() to extract all link recipes');
