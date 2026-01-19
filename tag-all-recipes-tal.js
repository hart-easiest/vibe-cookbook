/**
 * Tag All Existing Recipes as "Tal"
 *
 * This script adds the "tal" tag to all existing recipes in Firebase.
 * Run this script in the browser console while on the cookbook app page.
 *
 * Usage:
 * 1. Open the cookbook app in your browser
 * 2. Sign in with an authorized account
 * 3. Open the browser console (F12 -> Console)
 * 4. Copy and paste this entire script
 * 5. Run: tagAllRecipesAsTal()
 */

async function tagAllRecipesAsTal() {
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
  let alreadyTagged = 0;
  let failed = 0;

  for (const recipe of recipes) {
    console.log(`Processing: ${recipe.name} (${recipe.id})`);

    try {
      // Get existing tags or empty array
      const existingTags = recipe.tags || [];

      // Check if already has 'tal' tag
      if (existingTags.includes('tal')) {
        console.log(`  - Already has 'tal' tag, skipping`);
        alreadyTagged++;
        continue;
      }

      // Add 'tal' tag at the beginning
      const newTags = ['tal', ...existingTags];

      // Update in Firebase
      await firebase.firestore().collection('recipes').doc(recipe.id).update({
        tags: newTags
      });

      console.log(`  + Added 'tal' tag`);
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
  console.log(`Already tagged: ${alreadyTagged}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${recipes.length}`);

  // Clear local cache so changes are visible
  localStorage.removeItem('recipes_cache');
  localStorage.removeItem('recipes_cache_time');
  console.log('\nLocal cache cleared. Refresh the page to see changes.');

  return { updated, alreadyTagged, failed, total: recipes.length };
}

// Instructions
console.log('Tag All Recipes Script Loaded!');
console.log('Run tagAllRecipesAsTal() to add the "tal" tag to all existing recipes');
