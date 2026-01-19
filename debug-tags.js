/**
 * Debug Tags Script
 *
 * Run this in the browser console to see why tags aren't being detected.
 *
 * Usage:
 * 1. Open the cookbook app
 * 2. Open browser console (F12)
 * 3. Paste this script and run debugTags()
 */

async function debugTags() {
  const snapshot = await firebase.firestore().collection('recipes').get();
  const recipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  console.log(`Total recipes: ${recipes.length}`);

  // Check for saved tags
  const withSavedTags = recipes.filter(r => r.tags && r.tags.length > 0);
  console.log(`Recipes with saved tags: ${withSavedTags.length}`);
  if (withSavedTags.length > 0) {
    console.log('Sample:', withSavedTags.slice(0, 3).map(r => ({ name: r.name, tags: r.tags })));
  }

  // Check for transcriptions
  const withTranscription = recipes.filter(r => r.content?.transcription);
  console.log(`Recipes with transcription: ${withTranscription.length}`);

  // Check for text content
  const withText = recipes.filter(r => r.content?.text);
  console.log(`Recipes with text content: ${withText.length}`);

  // Check for notes
  const withNotes = recipes.filter(r => r.notes);
  console.log(`Recipes with notes: ${withNotes.length}`);

  // Check for descriptive names (not "מתכון מאינסטגרם")
  const withGoodNames = recipes.filter(r => r.name && !r.name.includes('מתכון מאינסטגרם') && !r.name.includes('סרטון מפייסבוק'));
  console.log(`Recipes with descriptive names: ${withGoodNames.length}`);

  // Test auto-tagging on a few recipes
  console.log('\n--- Auto-tag detection test ---');

  const keywords = {
    vegetarian: ['צמחוני', 'ירקות', 'גבינה', 'ביצה', 'חלבי', 'גבינות', 'טופו', 'פטריות'],
    healthy: ['בריא', 'קינואה', 'עדשים', 'סלט', 'ירקות', 'דל קלוריות'],
    quick: ['מהיר', 'קל', '10 דקות', '15 דקות', 'פשוט'],
    'kid-friendly': ['ילדים', 'תינוק']
  };

  const tagCounts = {};
  Object.keys(keywords).forEach(tag => tagCounts[tag] = 0);
  tagCounts['kid-friendly-category'] = 0;

  recipes.forEach(recipe => {
    const name = (recipe.name || '').toLowerCase();
    const text = (recipe.content?.text || '').toLowerCase();
    const transcription = (recipe.content?.transcription || '').toLowerCase();
    const notes = (recipe.notes || '').toLowerCase();
    const combined = `${name} ${text} ${transcription} ${notes}`;

    Object.entries(keywords).forEach(([tag, words]) => {
      if (words.some(w => combined.includes(w))) {
        tagCounts[tag]++;
      }
    });

    // Check baby category
    if (recipe.mainCategory === 'baby' || recipe.category === 'baby' ||
        recipe.category === 'baby-meals' || recipe.category === 'baby-snacks') {
      tagCounts['kid-friendly-category']++;
    }
  });

  console.log('Keyword matches found:');
  Object.entries(tagCounts).forEach(([tag, count]) => {
    console.log(`  ${tag}: ${count}`);
  });

  // Show some examples that should match
  console.log('\n--- Sample recipes with potential matches ---');
  const samples = recipes.filter(r => {
    const combined = `${r.name} ${r.content?.text || ''} ${r.content?.transcription || ''} ${r.notes || ''}`.toLowerCase();
    return combined.includes('גבינה') || combined.includes('סלט') || combined.includes('ירקות');
  }).slice(0, 5);

  samples.forEach(r => {
    console.log(`- ${r.name}`);
    if (r.content?.transcription) console.log(`  transcription: ${r.content.transcription.substring(0, 100)}...`);
    if (r.notes) console.log(`  notes: ${r.notes}`);
  });

  return { recipes: recipes.length, withSavedTags: withSavedTags.length, withTranscription: withTranscription.length };
}

console.log('Debug Tags Script loaded. Run debugTags() to analyze.');
