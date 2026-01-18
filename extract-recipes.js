/**
 * Recipe Extraction Script
 *
 * This script extracts recipe text from external website links and saves them to Firebase.
 * Run this script in the browser console while on the cookbook app page.
 *
 * Usage:
 * 1. Open the cookbook app in your browser
 * 2. Sign in with an authorized account
 * 3. Open the browser console (F12 -> Console)
 * 4. Copy and paste this entire script
 * 5. Run: extractAllLinkRecipes()
 */

async function extractAllLinkRecipes() {
  // Get all recipes from Firebase
  const snapshot = await firebase.firestore().collection('recipes').get();
  const recipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Filter to only link-type recipes without transcription
  const linkRecipes = recipes.filter(r =>
    r.type === 'link' &&
    r.content?.url &&
    !r.content?.transcription
  );

  console.log(`Found ${linkRecipes.length} link recipes without transcription`);

  let extracted = 0;
  let failed = 0;

  for (const recipe of linkRecipes) {
    console.log(`\nProcessing: ${recipe.name} (${recipe.id})`);
    console.log(`URL: ${recipe.content.url}`);

    try {
      const text = await extractRecipeText(recipe.content.url);

      if (text && text.length > 50) {
        // Save to Firebase
        await firebase.firestore().collection('recipes').doc(recipe.id).update({
          'content.transcription': text
        });

        console.log(`✓ Extracted ${text.length} characters`);
        extracted++;
      } else {
        console.log(`✗ Could not extract content (too short or empty)`);
        failed++;
      }
    } catch (error) {
      console.log(`✗ Error: ${error.message}`);
      failed++;
    }

    // Wait between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log(`\n=== COMPLETE ===`);
  console.log(`Extracted: ${extracted}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${linkRecipes.length}`);

  return { extracted, failed, total: linkRecipes.length };
}

async function extractRecipeText(url) {
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

  doc.querySelectorAll('[class*="instruction"], [class*="direction"], li[itemprop="recipeInstructions"]').forEach(el => {
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

  if (recipe.recipeIngredient?.length > 0) {
    text += 'מרכיבים:\n';
    recipe.recipeIngredient.forEach(ing => text += `• ${ing}\n`);
    text += '\n';
  }

  if (recipe.recipeInstructions) {
    text += 'הוראות הכנה:\n';
    const instructions = Array.isArray(recipe.recipeInstructions) ? recipe.recipeInstructions : [recipe.recipeInstructions];
    instructions.forEach((step, idx) => {
      const stepText = typeof step === 'string' ? step : step.text;
      if (stepText) text += `${idx + 1}. ${stepText}\n`;
    });
  }

  return text.trim();
}

function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .replace(/Share.*?Facebook|Tweet|Pinterest|Print|Email/gi, '')
    .trim();
}

// Instructions
console.log('Recipe Extraction Script Loaded!');
console.log('Run extractAllLinkRecipes() to extract all link recipes');
console.log('Or use extractRecipeText(url) to extract a single URL');
