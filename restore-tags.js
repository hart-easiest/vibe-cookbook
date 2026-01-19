/**
 * Restore Tags Script
 *
 * This script re-applies auto-tagging to all recipes AND adds the "tal" tag.
 * It preserves the auto-detected tags (vegetarian, healthy, kid-friendly, etc.)
 * that were lost when tag-all-recipes-tal.js ran.
 *
 * Run this script in the browser console while on the cookbook app page.
 *
 * Usage:
 * 1. Open the cookbook app in your browser
 * 2. Sign in with an authorized account
 * 3. Open the browser console (F12 -> Console)
 * 4. Copy and paste this entire script
 * 5. Run: restoreTags()
 */

// Auto-tag function (copied from app.js)
function autoTagRecipe(recipe) {
  const tags = [];
  const name = (recipe.name || '').toLowerCase();
  const text = (recipe.content?.text || '').toLowerCase();
  const transcription = (recipe.content?.transcription || '').toLowerCase();
  const notes = (recipe.notes || '').toLowerCase();
  const combined = `${name} ${text} ${transcription} ${notes}`;

  // Vegetarian indicators
  const vegetarianKeywords = ['צמחוני', 'ירקות', 'גבינה', 'ביצה', 'חלבי', 'גבינות', 'טופו', 'פטריות'];
  const meatKeywords = ['עוף', 'בשר', 'פרגית', 'סלמון', 'דג', 'הודו', 'אסאדו', 'שניצל', 'קציצות בשר', 'בולונז'];

  const hasMeat = meatKeywords.some(k => combined.includes(k));
  const hasVegetarian = vegetarianKeywords.some(k => combined.includes(k));

  if (!hasMeat && hasVegetarian) tags.push('vegetarian');

  // Vegan indicators
  const veganKeywords = ['טבעוני', 'vegan', 'ללא מוצרי חלב', 'שמנת צמחית', 'חלב שקדים', 'חלב קוקוס'];
  if (veganKeywords.some(k => combined.includes(k))) tags.push('vegan');

  // Gluten-free
  const glutenFreeKeywords = ['ללא גלוטן', 'gluten free', 'gluten-free', 'שיבולת שועל ללא גלוטן'];
  if (glutenFreeKeywords.some(k => combined.includes(k))) tags.push('gluten-free');

  // Parve (dairy-free but not vegan)
  const parveKeywords = ['פרווה', 'parve', 'pareve'];
  if (parveKeywords.some(k => combined.includes(k))) tags.push('parve');

  // Kid-friendly (baby food category or mentions kids)
  if (recipe.mainCategory === 'baby' || recipe.category === 'baby' || recipe.category === 'baby-meals' || recipe.category === 'baby-snacks' || combined.includes('ילדים') || combined.includes('תינוק')) {
    tags.push('kid-friendly');
  }

  // Quick recipes
  const quickKeywords = ['מהיר', 'קל', '10 דקות', '15 דקות', 'פשוט'];
  if (quickKeywords.some(k => combined.includes(k))) tags.push('quick');

  // Healthy
  const healthyKeywords = ['בריא', 'קינואה', 'עדשים', 'סלט', 'ירקות', 'דל קלוריות'];
  if (healthyKeywords.some(k => combined.includes(k)) && !combined.includes('שוקולד')) {
    tags.push('healthy');
  }

  return tags;
}

async function restoreTags() {
  // Check if user is signed in
  if (!firebase.auth().currentUser) {
    console.error('Please sign in first!');
    return;
  }

  // Get all recipes from Firebase
  const snapshot = await firebase.firestore().collection('recipes').get();
  const recipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  console.log(`Found ${recipes.length} recipes total`);

  let updated = 0;
  let unchanged = 0;
  let failed = 0;

  for (const recipe of recipes) {
    console.log(`Processing: ${recipe.name} (${recipe.id})`);

    try {
      // Generate auto tags based on recipe content
      const autoTags = autoTagRecipe(recipe);

      // Start with 'tal' tag, then add auto-detected tags
      const newTags = ['tal', ...autoTags];

      // Remove duplicates (in case 'tal' was in autoTags somehow)
      const uniqueTags = [...new Set(newTags)];

      // Check if tags have changed
      const currentTags = recipe.tags || [];
      const tagsChanged = JSON.stringify(uniqueTags.sort()) !== JSON.stringify(currentTags.sort());

      if (!tagsChanged) {
        console.log(`  - Tags unchanged, skipping`);
        unchanged++;
        continue;
      }

      console.log(`  Old tags: [${currentTags.join(', ')}]`);
      console.log(`  New tags: [${uniqueTags.join(', ')}]`);

      // Update in Firebase
      await firebase.firestore().collection('recipes').doc(recipe.id).update({
        tags: uniqueTags
      });

      console.log(`  + Updated tags`);
      updated++;
    } catch (error) {
      console.log(`  x Error: ${error.message}`);
      failed++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n=== COMPLETE ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Unchanged: ${unchanged}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${recipes.length}`);

  // Clear local cache so changes are visible
  localStorage.removeItem('recipes_cache');
  localStorage.removeItem('recipes_cache_time');
  console.log('\nLocal cache cleared. Refresh the page to see changes.');

  return { updated, unchanged, failed, total: recipes.length };
}

// Instructions
console.log('Restore Tags Script Loaded!');
console.log('Run restoreTags() to restore auto-detected tags AND add the "tal" tag to all recipes');
