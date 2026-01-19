# Tal's Cookbook App

Hebrew recipe cookbook web app with recipes from Instagram, YouTube, Facebook, and text entries.

## Links

- **Live App**: https://hart-easiest.github.io/vibe-cookbook/
- **GitHub Repo**: https://github.com/hart-easiest/vibe-cookbook
- **Firebase Console**: https://console.firebase.google.com/project/vibe-cookbook

## Tech Stack

Vanilla HTML/CSS/JS, Firebase Firestore + Auth, GitHub Pages hosting, RTL Hebrew layout.

## Key Files

| File | Purpose |
|------|---------|
| `app.js` | Main app logic, Firebase integration |
| `batch-extract.js` | Browser console script: `batchExtract(20)` |
| `restore-tags.js` | Browser console script: `restoreTags()` |

## Authorized Editors

taladani@gmail.com, eliavschreiber@gmail.com, dschreiber@gmail.com, gidonschreiber@gmail.com, egorlin@gmail.com

## Architecture

### Categories
Hierarchical: Main (breakfast, lunch-dinner, dessert, snacks, baby) → Sub-categories

### Tags
- **Person tags** (always visible): `tal`, `einav` - auto-assigned based on logged-in user
- **Auto-detected tags**: vegetarian, vegan, gluten-free, parve, kid-friendly, quick, healthy
- Tags stored in Firebase `recipe.tags[]` array

### Recipe Text
- Unified field: `content.text` (reads from `content.transcription` for backward compat)
- New text always saves to `content.text`

### Editing (Authorized Users)
- **Edit Details**: Change recipe name and sub-category via "✏️ ערוך פרטים" button
- **Edit Tags**: Modify recipe tags via "🏷️ ערוך תגיות" button
- **Edit Text**: Add/edit recipe text via "📝" buttons

## Known Limitations

### Recipe Extraction
- Only works for sites with JSON-LD Recipe schema or common CSS selectors
- Most Hebrew sites (matkonia.co.il, oogio.net, etc.) fail extraction
- CORS proxies unreliable
- **Workaround**: Manual text entry via "הוסף טקסט מתכון" button

### Social Media
- Instagram/Facebook/YouTube/TikTok require manual text entry (29 recipes affected)

## Recipe Stats (Jan 2025)

149 total | 45 with text | 62 websites without | 29 social media without

## Deployment

```bash
git add . && git commit -m "msg" && git push origin main
```

## Future Work

- [ ] Server-side recipe extraction (requires moving off GitHub Pages)
- [ ] OpenAI Whisper for video transcription
- [ ] Image upload (requires Firebase Blaze plan)
