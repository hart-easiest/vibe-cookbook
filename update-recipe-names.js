// Script to update recipe names from "מתכון מאינסטגרם" to proper names
// Run this in the browser console while on the cookbook app page

const recipeUpdates = [
  // Known recipes from CLAUDE.md Batch 2
  {
    id: "1",
    name: "לחמניות קורנפלור ממולאות בשר",
    category: "yeast"
  },
  {
    id: "4",
    name: "לחמניות שום ממולאות במוצרלה",
    category: "yeast"
  },
  {
    id: "5",
    name: "אסאדו ותפוחי אדמה ברוטב סילאן",
    category: "main"
  },
  {
    id: "90",
    name: "סטייק כרובית מליון דולר",
    category: "main"
  },
  {
    id: "113",
    name: "האורז שמתחת לעוף",
    category: "main"
  },
  {
    id: "115",
    name: "פילה סלמון עסיסי בטאבון",
    category: "main"
  },
  {
    id: "128",
    name: "סמאש בורגר טורטייה",
    category: "main"
  },
  {
    id: "133",
    name: "סלמון בטריאקי מהטאבון",
    category: "main"
  },
  {
    id: "134",
    name: "רוזלך שוקולד",
    category: "yeast"
  },
  {
    id: "140",
    name: "חטיף בייגלה ושוקולד",
    category: "desserts"
  },
  {
    id: "148",
    name: "סיר קינואה עם ירקות וחלבון",
    category: "salads"
  },
  // Updated recipe 57 name (from CLAUDE.md Batch 1 it has transcription)
  {
    id: "57",
    name: "סיר פרגיות עם ירקות",
    category: "main"
  }
];

// Recipes that still need manual identification - check the Instagram links
const unknownRecipes = [
  { id: "2", url: "https://www.instagram.com/p/CJ3z4DzFKF4/" },
  { id: "8", url: "https://www.instagram.com/p/CKQf-gHDE8J/" },
  { id: "9", url: "https://www.instagram.com/p/CKmMMYZjwES/" },
  { id: "10", url: "https://www.instagram.com/p/CKjimyUgO6k/" },
  { id: "15", url: "https://www.instagram.com/p/CLmBEDEFKYP/" },
  { id: "21", url: "https://www.instagram.com/p/CNHMV5hjE1V/" },
  { id: "24", url: "https://www.instagram.com/reel/COxr9HigA8i/" },
  { id: "37", url: "https://www.instagram.com/p/CSUaywVIoTn/" },
  { id: "66", url: "https://www.instagram.com/reel/Cu4CQgWAVk-/" },
  { id: "114", url: "https://www.instagram.com/reel/DJbgk0ntLpy/" },
  { id: "149", url: "https://www.instagram.com/reel/DRe5XvqDYKX/" },
  { id: "150", url: "https://www.instagram.com/reel/DReG3VriJPS/" }
];

// Function to update Firebase
async function updateRecipeNames() {
  const db = firebase.firestore();
  let updated = 0;
  let failed = 0;

  console.log("=== Updating Known Recipe Names ===\n");

  for (const item of recipeUpdates) {
    try {
      const updateData = { name: item.name };
      if (item.category) {
        updateData.category = item.category;
      }
      await db.collection('recipes').doc(item.id).update(updateData);
      console.log(`✓ Updated recipe ${item.id}: ${item.name}`);
      updated++;
    } catch (error) {
      console.error(`✗ Failed to update recipe ${item.id}:`, error.message);
      failed++;
    }
  }

  console.log(`\n=== Update Complete ===`);
  console.log(`Updated: ${updated}`);
  console.log(`Failed: ${failed}`);

  console.log(`\n=== Recipes That Need Manual Identification ===`);
  console.log(`Check these Instagram links and update manually:\n`);
  for (const item of unknownRecipes) {
    console.log(`ID ${item.id}: ${item.url}`);
  }

  console.log(`\nRefresh the page to see changes.`);
}

// Run the update
updateRecipeNames();
