# Tal's Cookbook App

A beautiful Hebrew recipe cookbook web app that displays recipes from various sources including Instagram, YouTube, Facebook, and text entries.

## Links

- **Live App**: https://hart-easiest.github.io/vibe-cookbook/
- **GitHub Repo**: https://github.com/hart-easiest/vibe-cookbook
- **Firebase Console**: https://console.firebase.google.com/project/vibe-cookbook

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Database**: Firebase Firestore
- **Hosting**: GitHub Pages
- **PWA**: iOS home screen pinnable with app-like experience
- **RTL Support**: Full Hebrew right-to-left layout

## Project Structure

```
/Tal Cooking/
├── index.html          # Main app HTML with modals
├── styles.css          # RTL-aware responsive styling
├── app.js              # App logic, Firebase integration, UI
├── recipes.json        # Original recipe data (backup)
├── update-descriptions.js  # Script to batch update Firebase
└── CLAUDE.md           # This file
```

## Features

- Category-based filtering (desserts, cookies, main dishes, baby food, etc.)
- Search functionality across recipe names, notes, and transcriptions
- Video embedding for Instagram, YouTube, TikTok, and Facebook
- Add new recipes via URL or text
- Delete recipes
- Manual transcription editing for video recipes
- Settings modal for OpenAI API key storage
- Toast notifications
- Responsive mobile-first design

## Firebase Configuration

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyCvhVhLRLLjCvWWv0zpe7f5uqNQNVfqT8c",
  authDomain: "vibe-cookbook.firebaseapp.com",
  projectId: "vibe-cookbook",
  storageBucket: "vibe-cookbook.firebasestorage.app",
  messagingSenderId: "934889498498",
  appId: "1:934889498498:web:e40b4bfc0679117d4ae1e9"
};
```

## Recipe Categories

| ID | Hebrew Name | Icon |
|----|-------------|------|
| desserts | קינוחים ועוגות | 🍰 |
| cookies | עוגיות | 🍪 |
| main | מנות עיקריות | 🍲 |
| baby | אוכל לתינוקות | 👶 |
| breakfast | ארוחת בוקר | 🍳 |
| yeast | מאפי שמרים | 🥐 |
| soups | מרקים | 🥣 |
| salads | סלטים ותוספות | 🥗 |
| muffins | מאפינס | 🧁 |
| savory | מאפים מלוחים | 🥧 |
| spreads | ממרחים ורטבים | 🫙 |

## Recipes with Extracted Descriptions

The following recipes have had their full descriptions/instructions extracted from Instagram and saved to Firebase:

### Batch 1 (Initial Extraction)

| ID | Recipe Name | Source |
|----|-------------|--------|
| 31 | פנקייק חלבה ללא גלוטן | Instagram |
| 56 | רולים של שמרים פרווה במילוי חלבה ופיסטוק | Instagram |
| 57 | סיר פרגיות עם ירקות | Instagram |
| 64 | סינבון של גיל מורן | Instagram |
| 73 | פנקייק סינבון | Instagram |
| 88 | עוגת שמרים פרווה של אמא של חן קורן | Instagram |
| 107 | סיר פרגיות חורפי עם פטריות וערמונים | Instagram |
| 135 | קציצות סלמון-בטטה לתינוקות וילדים | Instagram |

### Batch 2 (Additional Extraction)

| ID | Recipe Name | Source |
|----|-------------|--------|
| 1 | לחמניות קורנפלור ממולאות בשר | Instagram (@anat_elisha_kitchen) |
| 4 | לחמניות שום ממולאות במוצרלה | Instagram (@anat_elisha_kitchen) |
| 5 | אסאדו ותפוחי אדמה ברוטב סילאן | Instagram (@anat_elisha_kitchen) |
| 90 | סטייק כרובית מליון דולר | Instagram (@chenkorenn) |
| 113 | האורז שמתחת לעוף | Instagram (@lichtenstadt) |
| 115 | פילה סלמון עסיסי בטאבון | Instagram (@ooniisrael) |
| 128 | סמאש בורגר טורטייה | Instagram (@lichtenstadt) |
| 133 | סלמון בטריאקי מהטאבון | Instagram (@michi_blog) |
| 134 | רוזלך שוקולד | Instagram (@ooniisrael) |
| 140 | חטיף בייגלה ושוקולד | Instagram (@lichtenstadt) |
| 148 | סיר קינואה עם ירקות וחלבון | Instagram (@orit_heller) |

**Total: 19 recipes with full transcriptions**

## Instagram Posts Without Full Recipes

Some Instagram posts don't contain the full recipe in their caption - they either:
- Reference an external blog/website for the full recipe
- Have the recipe only visible in the video itself
- Are just food inspiration without detailed instructions

These posts still link to the original Instagram content where users can watch the video.

## Development Notes

### Adding New Recipes
Users can add recipes through the app UI using either:
1. A URL (Instagram, YouTube, TikTok, Facebook, or any website)
2. Plain text entry

### Updating Transcriptions
- Users can manually add/edit transcriptions via the recipe modal
- Batch updates can be done using the browser console with Firebase SDK

### Deployment
```bash
git add .
git commit -m "Update description"
git push origin main
```
GitHub Pages automatically deploys from the main branch.

## Recent Updates

### Image Upload Feature
- Added ability to upload images when creating new recipes (via "תמונה" tab)
- Added ability to add images to existing recipes (via "הוסף תמונה" button in recipe modal)
- Images are uploaded to Firebase Storage and stored as URLs in Firestore
- Supports multiple images per recipe with drag-and-drop

### Text Upload Feature
- Renamed transcription feature to "העלאת טקסט ידנית" (manual text upload)
- Now available for all recipe types (not just videos)
- Allows adding recipe text/instructions that appear under embedded videos

### Recipe Name Update Script
Run `update-recipe-names.js` in the browser console to update recipes named "מתכון מאינסטגרם" with proper titles.

## Future Improvements

- [ ] Automatic transcription using OpenAI Whisper API
- [x] Image upload for photo recipes
- [ ] Recipe sharing functionality
- [ ] Print-friendly recipe view
- [ ] Ingredient scaling calculator
- [ ] Shopping list generation
