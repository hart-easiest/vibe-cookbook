# Tal's Cookbook App

A beautiful Hebrew recipe cookbook web app that displays recipes from various sources including Instagram, YouTube, Facebook, and text entries.

## Links

- **Live App**: https://hart-easiest.github.io/vibe-cookbook/
- **GitHub Repo**: https://github.com/hart-easiest/vibe-cookbook
- **Firebase Console**: https://console.firebase.google.com/project/vibe-cookbook

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage (for recipe images)
- **Hosting**: GitHub Pages
- **Fonts**: Rubik (body) + Frank Ruhl Libre (headings) from Google Fonts
- **PWA**: iOS home screen pinnable with app-like experience
- **RTL Support**: Full Hebrew right-to-left layout

## Project Structure

```
/Tal Cooking/
├── index.html              # Main app HTML with modals
├── styles.css              # RTL-aware responsive styling (Editorial theme)
├── app.js                  # App logic, Firebase integration, UI
├── recipes.json            # Original recipe data (backup)
├── update-descriptions.js  # Script to batch update Firebase transcriptions
├── update-recipe-names.js  # Script to rename "מתכון מאינסטגרם" recipes
└── CLAUDE.md               # This file
```

## Features

### Category System (Hierarchical)
- **Main Categories**: ארוחת בוקר, צהריים וערב, קינוח, חטיפים ונשנושים, אוכל לתינוקות
- **Sub-categories**: Each main category has specific sub-categories
- Recipe cards display full hierarchy: "Main > Sub" format
- Legacy category mapping ensures backward compatibility

### Tagging System
- 10 available tags: צמחוני, טבעוני, ללא גלוטן, ללא חלב, פרווה, מהיר, לילדים, בריא, אוכל נוחות, לאירועים
- Auto-tagging based on recipe content analysis
- Manual tag editing per recipe
- Tag filter shows only tags with at least one recipe (with count)

### Recipe Management
- Add recipes via URL (Instagram, YouTube, TikTok, Facebook, external sites)
- Add recipes via text entry
- Add recipes via image upload (Firebase Storage)
- Manual text upload for recipe instructions
- Delete recipes
- Search across names, notes, and transcriptions

### External Links
- Branded cards for known recipe websites (16+ sites)
- Site-specific icons and colors
- Fallback display for unknown sites

## Category Hierarchy

### Main Categories
| ID | Hebrew Name | Icon |
|----|-------------|------|
| breakfast | ארוחת בוקר | 🌅 |
| lunch-dinner | צהריים וערב | 🍽️ |
| dessert | קינוח | 🍰 |
| snacks | חטיפים ונשנושים | 🥨 |
| baby | אוכל לתינוקות | 👶 |

### Sub-Categories
- **breakfast**: פנקייקים ווופלים, גרנולה ודגנים, ביצים ואומלטים, מאפים מתוקים
- **lunch-dinner**: מנות עיקריות, מרקים, סלטים ותוספות, מאפים מלוחים, פסטות, ממרחים ורטבים
- **dessert**: עוגות וקינוחים, עוגיות, מאפי שמרים, מאפינס
- **snacks**: חטיפים מתוקים, חטיפים מלוחים
- **baby**: ארוחות לתינוקות, חטיפים לתינוקות

## Available Tags

| ID | Hebrew Name | Icon | Color |
|----|-------------|------|-------|
| vegetarian | צמחוני | 🥬 | #22c55e |
| vegan | טבעוני | 🌱 | #16a34a |
| gluten-free | ללא גלוטן | 🌾 | #eab308 |
| dairy-free | ללא חלב | 🥛 | #06b6d4 |
| parve | פרווה | ✡️ | #8b5cf6 |
| quick | מהיר | ⚡ | #f97316 |
| kid-friendly | לילדים | 👶 | #ec4899 |
| healthy | בריא | 💚 | #10b981 |
| comfort-food | אוכל נוחות | 🏠 | #f59e0b |
| special-occasion | לאירועים | 🎉 | #a855f7 |

## Known Recipe Websites

The app recognizes and displays branded cards for these sites:
- **Hebrew**: אוגיו, תרנגולת במטבח, ליכטנשטט, קארין גורן, בייקרי 365, השולחן, פודיש, 10 דקות, סוויט מיט, גיל מורן
- **English**: The Kitchn, Serious Eats, Bon Appétit, Allrecipes, Tasty, Delish

## Recipes with Extracted Descriptions

19 recipes have full transcriptions saved in Firebase (extracted from Instagram):

### Batch 1
| ID | Recipe Name |
|----|-------------|
| 31 | פנקייק חלבה ללא גלוטן |
| 56 | רולים של שמרים פרווה במילוי חלבה ופיסטוק |
| 57 | סיר פרגיות עם ירקות |
| 64 | סינבון של גיל מורן |
| 73 | פנקייק סינבון |
| 88 | עוגת שמרים פרווה של אמא של חן קורן |
| 107 | סיר פרגיות חורפי עם פטריות וערמונים |
| 135 | קציצות סלמון-בטטה לתינוקות וילדים |

### Batch 2
| ID | Recipe Name |
|----|-------------|
| 1 | לחמניות קורנפלור ממולאות בשר |
| 4 | לחמניות שום ממולאות במוצרלה |
| 5 | אסאדו ותפוחי אדמה ברוטב סילאן |
| 90 | סטייק כרובית מליון דולר |
| 113 | האורז שמתחת לעוף |
| 115 | פילה סלמון עסיסי בטאבון |
| 128 | סמאש בורגר טורטייה |
| 133 | סלמון בטריאקי מהטאבון |
| 134 | רוזלך שוקולד |
| 140 | חטיף בייגלה ושוקולד |
| 148 | סיר קינואה עם ירקות וחלבון |

## Development Notes

### Deployment
```bash
git add .
git commit -m "Description"
git push origin main
```
GitHub Pages automatically deploys from the main branch.

### Helper Scripts
- `update-descriptions.js` - Batch update recipe transcriptions in Firebase
- `update-recipe-names.js` - Rename recipes from "מתכון מאינסטגרם" to proper names

## Future Improvements

- [ ] Automatic transcription using OpenAI Whisper API
- [x] Image upload for photo recipes
- [x] Hierarchical category system
- [x] Tagging system with auto-tagging
- [x] Tag editing per recipe
- [x] External recipe website branding
- [ ] Recipe sharing functionality
- [ ] Print-friendly recipe view
- [ ] Ingredient scaling calculator
- [ ] Shopping list generation
