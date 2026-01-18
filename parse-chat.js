const fs = require('fs');
const path = require('path');

// Configuration
const CHAT_DIR = './WhatsApp Chat - מתכונים מושלמים';
const CHAT_FILE = path.join(CHAT_DIR, '_chat.txt');
const OUTPUT_FILE = './recipes.json';
const IMAGES_DIR = './images';

// Categories with Hebrew names and keywords for matching
const CATEGORIES = [
  { id: 'desserts', name: 'קינוחים ועוגות', icon: '🍰', keywords: ['עוגה', 'עוגת', 'טארט', 'פאי', 'בראוניז', 'סופלה', 'פודינג', 'פודנט', 'קרמבו', 'מוס', 'פרלינה', 'אלפחורס'] },
  { id: 'cookies', name: 'עוגיות', icon: '🍪', keywords: ['עוגיות', 'עוגיה', 'ביסקוויט', 'כדורי', 'חיתוכיות'] },
  { id: 'main', name: 'מנות עיקריות', icon: '🍲', keywords: ['עוף', 'פרגית', 'פרגיות', 'סלמון', 'דג', 'קציצות', 'אסאדו', 'בשר', 'שניצל', 'בולונז'] },
  { id: 'baby', name: 'אוכל לתינוקות', icon: '👶', keywords: ['תינוק', 'תינוקות', 'ילדים', 'רועי', 'ליה', 'בייבי'] },
  { id: 'breakfast', name: 'ארוחת בוקר', icon: '🍳', keywords: ['פנקייק', 'גרנולה', 'ארוחת בוקר', 'חביתה', 'יוגורט'] },
  { id: 'yeast', name: 'מאפי שמרים', icon: '🥐', keywords: ['שמרים', 'חלות', 'חלה', 'ג\'חנון', 'לחמניות', 'סינבון', 'בצק', 'פיצה', 'קובנה', 'רוגלך'] },
  { id: 'soups', name: 'מרקים', icon: '🥣', keywords: ['מרק', 'מרקים'] },
  { id: 'salads', name: 'סלטים ותוספות', icon: '🥗', keywords: ['סלט', 'סלטים', 'אורז', 'פסטה', 'קוסקוס', 'קינואה', 'פתיתים', 'ירקות'] },
  { id: 'muffins', name: 'מאפינס', icon: '🧁', keywords: ['מאפינס', 'מאפין'] },
  { id: 'savory', name: 'מאפים מלוחים', icon: '🥧', keywords: ['קיש', 'לביבות', 'בורקס', 'פיתה', 'מקלות'] },
  { id: 'spreads', name: 'ממרחים ורטבים', icon: '🫙', keywords: ['חמאת', 'ממרח', 'רוטב', 'טחינה'] },
  { id: 'other', name: 'אחר', icon: '📝', keywords: [] }
];

// Video platform patterns
const VIDEO_PATTERNS = {
  instagram: /instagram\.com\/(p|reel|tv)\//,
  youtube: /(?:youtube\.com\/watch\?v=|youtu\.be\/)/,
  facebook: /facebook\.com\/(?:watch|.*\/videos)/
};

// Parse WhatsApp date format
function parseDate(dateStr) {
  // Format: [DD/MM/YYYY, HH:MM:SS]
  const match = dateStr.match(/\[(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }
  return null;
}

// Extract URL from message
function extractUrl(text) {
  const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
  return urlMatch ? urlMatch[1] : null;
}

// Decode Hebrew from URL-encoded strings
function decodeHebrewUrl(url) {
  try {
    const decoded = decodeURIComponent(url);
    // Extract path parts that might be Hebrew recipe names
    const pathMatch = decoded.match(/\/([^\/]+)\/?$/);
    if (pathMatch) {
      return pathMatch[1]
        .replace(/-/g, ' ')
        .replace(/[_]/g, ' ')
        .replace(/\?.*$/, '')
        .trim();
    }
  } catch (e) {}
  return null;
}

// Detect recipe type from URL
function detectVideoType(url) {
  if (!url) return null;
  for (const [platform, pattern] of Object.entries(VIDEO_PATTERNS)) {
    if (pattern.test(url)) return platform;
  }
  return null;
}

// Generate YouTube embed URL
function getYouTubeEmbed(url) {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
  if (match) {
    return `https://www.youtube.com/embed/${match[1]}`;
  }
  return null;
}

// Generate Instagram embed HTML
function getInstagramEmbed(url) {
  // Clean up the URL
  const cleanUrl = url.split('?')[0];
  return cleanUrl;
}

// Categorize recipe based on name and content
function categorizeRecipe(name, content, url) {
  const textToSearch = `${name} ${content} ${url}`.toLowerCase();

  for (const category of CATEGORIES) {
    if (category.id === 'other') continue;
    for (const keyword of category.keywords) {
      if (textToSearch.includes(keyword.toLowerCase())) {
        return category.id;
      }
    }
  }

  // Check URL domain for hints
  if (url) {
    if (url.includes('matkonia.co.il')) {
      // Matkonia is often baby food
      if (textToSearch.includes('תינוק') || textToSearch.includes('ילד')) {
        return 'baby';
      }
    }
  }

  return 'other';
}

// Check if message is a recipe label (short text after URL)
function isRecipeLabel(text) {
  const cleaned = text.trim();
  // Short text, no URL, likely a label
  return cleaned.length > 0 &&
         cleaned.length < 100 &&
         !cleaned.includes('http') &&
         !cleaned.startsWith('<attached') &&
         !cleaned.includes('deleted this message') &&
         cleaned !== '.' &&
         cleaned !== 'זה' &&
         !cleaned.match(/^\d+\s/); // Not starting with number (like quantity)
}

// Check if message contains a full recipe (ingredients/instructions)
function isFullRecipe(text) {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 3) return false;

  // Look for recipe-like patterns
  const hasIngredients = lines.some(l =>
    l.match(/\d+\s*(כוס|כפית|גרם|ק״ג|חבילה|ביצה|ביצים)/) ||
    l.match(/^(מלח|פלפל|שמן|סוכר|קמח)/)
  );
  const hasInstructions = text.includes('אופים') ||
                          text.includes('לטגן') ||
                          text.includes('לערבב') ||
                          text.includes('לבשל') ||
                          text.includes('לטחון');

  return hasIngredients || hasInstructions;
}

// Parse the chat file
function parseChat() {
  const content = fs.readFileSync(CHAT_FILE, 'utf-8');
  const lines = content.split('\n');

  const messages = [];
  let currentMessage = null;

  // Parse each line
  for (const line of lines) {
    const match = line.match(/^\[(\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}:\d{2})\] ([^:]+): (.*)$/);

    if (match) {
      if (currentMessage) {
        messages.push(currentMessage);
      }
      currentMessage = {
        date: parseDate(match[1]),
        timestamp: match[1],
        sender: match[2],
        text: match[3]
      };
    } else if (currentMessage) {
      // Continuation of previous message
      currentMessage.text += '\n' + line;
    }
  }

  if (currentMessage) {
    messages.push(currentMessage);
  }

  return messages;
}

// Extract attached image filename
function extractImageFilename(text) {
  const match = text.match(/<attached: ([^>]+)>/);
  return match ? match[1] : null;
}

// Group related messages into recipes
function groupRecipes(messages) {
  const recipes = [];
  let currentRecipe = null;
  let skipNext = false;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const text = msg.text.trim();

    // Skip system messages
    if (text.includes('created this group') ||
        text.includes('removed') ||
        text.includes('end-to-end encrypted') ||
        text.includes('deleted this message') ||
        text === '.' ||
        text === 'זה' ||
        text === 'נשמע מוש' ||
        text === 'זה פגז' ||
        text === 'אלוהיות' ||
        text === 'תכלס' ||
        text.startsWith('רעיון מעולה')) {
      continue;
    }

    const url = extractUrl(text);
    const imageFile = extractImageFilename(text);

    // URL-based recipe
    if (url) {
      const videoType = detectVideoType(url);
      const decodedName = decodeHebrewUrl(url);

      currentRecipe = {
        id: `recipe-${recipes.length + 1}`,
        date: msg.date,
        type: videoType ? 'video' : 'link',
        content: {
          url: url,
          videoType: videoType,
          text: '',
          images: []
        },
        name: decodedName || '',
        notes: ''
      };

      // Check if there's text before the URL
      const textBeforeUrl = text.split(url)[0].trim();
      if (textBeforeUrl && textBeforeUrl.length > 2) {
        currentRecipe.name = textBeforeUrl;
      }

      // Check if there's text after the URL
      const textAfterUrl = text.split(url)[1]?.trim();
      if (textAfterUrl && textAfterUrl.length > 2 && !textAfterUrl.startsWith('?')) {
        if (!currentRecipe.name) {
          currentRecipe.name = textAfterUrl;
        } else {
          currentRecipe.notes = textAfterUrl;
        }
      }

      // Look ahead for label or additional info
      if (i + 1 < messages.length) {
        const nextMsg = messages[i + 1].text.trim();
        if (isRecipeLabel(nextMsg) && !extractUrl(nextMsg) && !extractImageFilename(nextMsg)) {
          if (!currentRecipe.name || currentRecipe.name === decodedName) {
            currentRecipe.name = nextMsg;
          } else {
            currentRecipe.notes = nextMsg;
          }
        }
      }

      recipes.push(currentRecipe);
      currentRecipe = null;
      continue;
    }

    // Image-based recipe
    if (imageFile) {
      // Check if this belongs to previous recipe
      if (currentRecipe && recipes.length > 0) {
        const lastRecipe = recipes[recipes.length - 1];
        // If within same minute, attach to previous
        if (lastRecipe.date === msg.date) {
          lastRecipe.content.images.push(imageFile);
          continue;
        }
      }

      // Check for text before the attachment tag
      const textBefore = text.split('<attached')[0].trim();

      currentRecipe = {
        id: `recipe-${recipes.length + 1}`,
        date: msg.date,
        type: 'photo',
        content: {
          url: null,
          text: textBefore || '',
          images: [imageFile]
        },
        name: textBefore || imageFile.replace(/^\d+-/, '').replace(/\.(jpg|png|jpeg)$/i, ''),
        notes: ''
      };

      recipes.push(currentRecipe);
      currentRecipe = null;
      continue;
    }

    // Full text recipe
    if (isFullRecipe(text)) {
      // Extract first line as name if it looks like a title
      const lines = text.split('\n').filter(l => l.trim());
      let recipeName = '';
      let recipeText = text;

      if (lines[0] && lines[0].includes(':')) {
        recipeName = lines[0].split(':')[0].trim();
        recipeText = lines.slice(0).join('\n');
      } else if (lines[0] && lines[0].length < 50 && !lines[0].match(/\d+\s*(כוס|גרם)/)) {
        recipeName = lines[0];
        recipeText = lines.slice(1).join('\n');
      }

      currentRecipe = {
        id: `recipe-${recipes.length + 1}`,
        date: msg.date,
        type: 'text',
        content: {
          url: null,
          text: recipeText,
          images: []
        },
        name: recipeName || 'מתכון',
        notes: ''
      };

      recipes.push(currentRecipe);
      currentRecipe = null;
      continue;
    }

    // Short label - might be for previous or next recipe
    if (isRecipeLabel(text) && recipes.length > 0) {
      const lastRecipe = recipes[recipes.length - 1];
      // If no name yet and recent, use as name
      if (!lastRecipe.name && lastRecipe.date === msg.date) {
        lastRecipe.name = text;
      } else if (lastRecipe.date === msg.date) {
        lastRecipe.notes = (lastRecipe.notes ? lastRecipe.notes + ' ' : '') + text;
      }
    }
  }

  return recipes;
}

// Clean and finalize recipes
function finalizeRecipes(recipes) {
  return recipes
    .filter(r => {
      // Filter out non-recipe content
      if (r.type === 'text' && r.content.text.length < 20) return false;
      if (r.type === 'photo' && !r.name) return false;
      return true;
    })
    .map(r => {
      // Clean up name
      if (!r.name) {
        r.name = 'מתכון ללא שם';
      }
      r.name = r.name.trim()
        .replace(/^[\.\,\:]+/, '')
        .replace(/[\.\,\:]+$/, '')
        .trim();

      // Categorize
      r.category = categorizeRecipe(r.name, r.content.text || '', r.content.url || '');

      // Add embed info for videos
      if (r.content.videoType === 'youtube' && r.content.url) {
        r.content.embedUrl = getYouTubeEmbed(r.content.url);
      }
      if (r.content.videoType === 'instagram' && r.content.url) {
        r.content.embedUrl = getInstagramEmbed(r.content.url);
      }

      return r;
    });
}

// Main execution
function main() {
  console.log('Parsing WhatsApp chat...');
  const messages = parseChat();
  console.log(`Found ${messages.length} messages`);

  console.log('Grouping into recipes...');
  const rawRecipes = groupRecipes(messages);
  console.log(`Found ${rawRecipes.length} potential recipes`);

  console.log('Finalizing and categorizing...');
  const recipes = finalizeRecipes(rawRecipes);
  console.log(`Finalized ${recipes.length} recipes`);

  // Count by category
  const categoryCounts = {};
  for (const r of recipes) {
    categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
  }
  console.log('\nRecipes by category:');
  for (const cat of CATEGORIES) {
    if (categoryCounts[cat.id]) {
      console.log(`  ${cat.icon} ${cat.name}: ${categoryCounts[cat.id]}`);
    }
  }

  // Create output structure
  const output = {
    categories: CATEGORIES,
    recipes: recipes
  };

  // Write JSON
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\nWritten to ${OUTPUT_FILE}`);

  // Create images directory
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR);
  }

  // Copy images
  const imageFiles = fs.readdirSync(CHAT_DIR).filter(f =>
    f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.jpeg')
  );

  for (const img of imageFiles) {
    const src = path.join(CHAT_DIR, img);
    const dest = path.join(IMAGES_DIR, img);
    fs.copyFileSync(src, dest);
  }
  console.log(`Copied ${imageFiles.length} images to ${IMAGES_DIR}`);
}

main();
