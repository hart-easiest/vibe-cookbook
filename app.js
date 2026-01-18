// Tal's Cookbook App with Firebase
(function() {
  'use strict';

  // Firebase Configuration
  const firebaseConfig = {
    apiKey: "AIzaSyDawvg5dJ7FR6Qj5x4IuVSdcHtEP_QLPwE",
    authDomain: "vibe-cookbook.firebaseapp.com",
    projectId: "vibe-cookbook",
    storageBucket: "vibe-cookbook.firebasestorage.app",
    messagingSenderId: "181961247796",
    appId: "1:181961247796:web:55566cec73fc89fb654e61"
  };

  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  const storage = firebase.storage();

  // State
  let recipes = [];
  let categories = [];
  let currentMainCategory = 'all';
  let currentSubCategory = 'all';
  let currentTags = [];
  let searchQuery = '';
  let currentRecipeId = null;
  let currentFormTab = 'link';
  let isInitialized = false;
  let selectedImages = []; // For image upload in add recipe form
  let modalSelectedImages = []; // For image upload in existing recipe modal

  // Main category hierarchy
  const MAIN_CATEGORIES = [
    { id: 'breakfast', name: 'ארוחת בוקר', icon: '🌅' },
    { id: 'lunch-dinner', name: 'צהריים וערב', icon: '🍽️' },
    { id: 'dessert', name: 'קינוח', icon: '🍰' },
    { id: 'snacks', name: 'חטיפים ונשנושים', icon: '🥨' },
    { id: 'baby', name: 'אוכל לתינוקות', icon: '👶' }
  ];

  // Sub-categories mapped to main categories
  const SUB_CATEGORIES = {
    'breakfast': [
      { id: 'pancakes', name: 'פנקייקים ווופלים', icon: '🥞' },
      { id: 'granola', name: 'גרנולה ודגנים', icon: '🥣' },
      { id: 'eggs', name: 'ביצים ואומלטים', icon: '🍳' },
      { id: 'yeast-breakfast', name: 'מאפים מתוקים', icon: '🥐' }
    ],
    'lunch-dinner': [
      { id: 'main', name: 'מנות עיקריות', icon: '🍲' },
      { id: 'soups', name: 'מרקים', icon: '🥣' },
      { id: 'salads', name: 'סלטים ותוספות', icon: '🥗' },
      { id: 'savory', name: 'מאפים מלוחים', icon: '🥧' },
      { id: 'pasta', name: 'פסטות', icon: '🍝' },
      { id: 'spreads', name: 'ממרחים ורטבים', icon: '🫙' }
    ],
    'dessert': [
      { id: 'desserts', name: 'עוגות וקינוחים', icon: '🎂' },
      { id: 'cookies', name: 'עוגיות', icon: '🍪' },
      { id: 'yeast', name: 'מאפי שמרים', icon: '🥐' },
      { id: 'muffins', name: 'מאפינס', icon: '🧁' }
    ],
    'snacks': [
      { id: 'sweet-snacks', name: 'חטיפים מתוקים', icon: '🍫' },
      { id: 'savory-snacks', name: 'חטיפים מלוחים', icon: '🥨' }
    ],
    'baby': [
      { id: 'baby-meals', name: 'ארוחות לתינוקות', icon: '🍼' },
      { id: 'baby-snacks', name: 'חטיפים לתינוקות', icon: '🍌' }
    ]
  };

  // Legacy categories mapping to new structure
  const LEGACY_CATEGORY_MAP = {
    'desserts': { main: 'dessert', sub: 'desserts' },
    'cookies': { main: 'dessert', sub: 'cookies' },
    'main': { main: 'lunch-dinner', sub: 'main' },
    'baby': { main: 'baby', sub: 'baby-meals' },
    'breakfast': { main: 'breakfast', sub: 'pancakes' },
    'yeast': { main: 'dessert', sub: 'yeast' },
    'soups': { main: 'lunch-dinner', sub: 'soups' },
    'salads': { main: 'lunch-dinner', sub: 'salads' },
    'muffins': { main: 'dessert', sub: 'muffins' },
    'savory': { main: 'lunch-dinner', sub: 'savory' },
    'spreads': { main: 'lunch-dinner', sub: 'spreads' }
  };

  // All sub-categories flattened for backward compatibility
  const CATEGORIES = Object.values(SUB_CATEGORIES).flat();

  // Tags definition
  const AVAILABLE_TAGS = [
    { id: 'vegetarian', name: 'צמחוני', icon: '🥬', color: '#22c55e' },
    { id: 'vegan', name: 'טבעוני', icon: '🌱', color: '#16a34a' },
    { id: 'gluten-free', name: 'ללא גלוטן', icon: '🌾', color: '#eab308' },
    { id: 'dairy-free', name: 'ללא חלב', icon: '🥛', color: '#06b6d4' },
    { id: 'parve', name: 'פרווה', icon: '✡️', color: '#8b5cf6' },
    { id: 'quick', name: 'מהיר', icon: '⚡', color: '#f97316' },
    { id: 'kid-friendly', name: 'לילדים', icon: '👶', color: '#ec4899' },
    { id: 'healthy', name: 'בריא', icon: '💚', color: '#10b981' },
    { id: 'comfort-food', name: 'אוכל נוחות', icon: '🏠', color: '#f59e0b' },
    { id: 'special-occasion', name: 'לאירועים', icon: '🎉', color: '#a855f7' }
  ];

  // DOM Elements
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search');
  const categoriesNav = document.getElementById('categories-nav');
  const recipesContainer = document.getElementById('recipes-container');
  const recipeCount = document.getElementById('recipe-count');
  const modal = document.getElementById('recipe-modal');
  const modalBody = document.getElementById('modal-body');
  const modalClose = document.getElementById('modal-close');
  const modalDelete = document.getElementById('modal-delete');
  const addModal = document.getElementById('add-modal');
  const addModalClose = document.getElementById('add-modal-close');
  const addRecipeBtn = document.getElementById('add-recipe-btn');
  const addRecipeForm = document.getElementById('add-recipe-form');
  const cancelAddBtn = document.getElementById('cancel-add');
  const deleteModal = document.getElementById('delete-modal');
  const cancelDeleteBtn = document.getElementById('cancel-delete');
  const confirmDeleteBtn = document.getElementById('confirm-delete');
  const transcriptionModal = document.getElementById('transcription-modal');
  const transcriptionModalClose = document.getElementById('transcription-modal-close');
  const cancelTranscriptionBtn = document.getElementById('cancel-transcription');
  const saveTranscriptionBtn = document.getElementById('save-transcription');
  const transcriptionText = document.getElementById('transcription-text');
  const settingsModal = document.getElementById('settings-modal');
  const settingsBtn = document.getElementById('settings-btn');
  const settingsModalClose = document.getElementById('settings-modal-close');
  const cancelSettingsBtn = document.getElementById('cancel-settings');
  const saveSettingsBtn = document.getElementById('save-settings');
  const openaiKeyInput = document.getElementById('openai-key');
  const addImageModal = document.getElementById('add-image-modal');
  const addImageModalClose = document.getElementById('add-image-modal-close');
  const cancelAddImageBtn = document.getElementById('cancel-add-image');
  const saveAddImageBtn = document.getElementById('save-add-image');
  const loading = document.getElementById('loading');
  const toastContainer = document.getElementById('toast-container');

  // Type icons and labels
  const typeInfo = {
    video: { icon: '🎬', label: 'סרטון' },
    link: { icon: '🔗', label: 'קישור' },
    text: { icon: '📝', label: 'מתכון' },
    photo: { icon: '📷', label: 'תמונה' }
  };

  // Initialize
  async function init() {
    showLoading(true);
    categories = CATEGORIES;

    try {
      // Check if Firestore has data
      const snapshot = await db.collection('recipes').limit(1).get();

      if (snapshot.empty) {
        // First time - migrate from JSON
        console.log('Migrating recipes to Firebase...');
        await migrateFromJSON();
      }

      // Load recipes from Firestore
      await loadRecipes();

      renderCategories();
      renderTagFilters();
      populateCategorySelect();
      renderRecipes();
      setupEventListeners();
      isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize:', error);
      showToast('שגיאה בטעינת המתכונים', 'error');

      // Fallback to JSON
      try {
        const response = await fetch('recipes.json');
        const data = await response.json();
        recipes = data.recipes;
        categories = data.categories || CATEGORIES;
        renderCategories();
        populateCategorySelect();
        renderRecipes();
        setupEventListeners();
      } catch (e) {
        recipesContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">😕</div>
            <p class="empty-state-text">לא הצלחנו לטעון את המתכונים</p>
          </div>
        `;
      }
    }

    showLoading(false);
  }

  // Migrate recipes from JSON to Firestore
  async function migrateFromJSON() {
    try {
      const response = await fetch('recipes.json');
      const data = await response.json();

      const batch = db.batch();
      data.recipes.forEach(recipe => {
        const docRef = db.collection('recipes').doc(recipe.id);
        batch.set(docRef, recipe);
      });

      await batch.commit();
      console.log('Migration complete!');
    } catch (error) {
      console.error('Migration failed:', error);
    }
  }

  // Load recipes from Firestore
  async function loadRecipes() {
    const snapshot = await db.collection('recipes').orderBy('date', 'desc').get();
    recipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // Show/hide loading
  function showLoading(show) {
    loading.classList.toggle('active', show);
    recipesContainer.style.display = show ? 'none' : 'grid';
  }

  // Show toast notification
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }

  // Render main categories
  function renderCategories() {
    categoriesNav.innerHTML = `
      <button class="category-btn main-cat ${currentMainCategory === 'all' ? 'active' : ''}" data-main-category="all">
        <span class="category-icon">📚</span>
        <span class="category-name">הכל</span>
      </button>
    `;

    MAIN_CATEGORIES.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = `category-btn main-cat ${currentMainCategory === cat.id ? 'active' : ''}`;
      btn.dataset.mainCategory = cat.id;
      btn.innerHTML = `
        <span class="category-icon">${cat.icon}</span>
        <span class="category-name">${cat.name}</span>
      `;
      categoriesNav.appendChild(btn);
    });

    renderSubCategories();
  }

  // Render sub-categories based on selected main category
  function renderSubCategories() {
    let subCatNav = document.getElementById('sub-categories-nav');

    if (currentMainCategory === 'all') {
      if (subCatNav) subCatNav.style.display = 'none';
      return;
    }

    if (!subCatNav) {
      subCatNav = document.createElement('nav');
      subCatNav.className = 'sub-categories-nav';
      subCatNav.id = 'sub-categories-nav';
      categoriesNav.after(subCatNav);
    }

    subCatNav.style.display = 'flex';
    subCatNav.innerHTML = `
      <button class="sub-category-btn ${currentSubCategory === 'all' ? 'active' : ''}" data-sub-category="all">
        הכל
      </button>
    `;

    const subCats = SUB_CATEGORIES[currentMainCategory] || [];
    subCats.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = `sub-category-btn ${currentSubCategory === cat.id ? 'active' : ''}`;
      btn.dataset.subCategory = cat.id;
      btn.innerHTML = `${cat.icon} ${cat.name}`;
      subCatNav.appendChild(btn);
    });
  }

  // Get main category for a recipe (handles legacy mapping)
  function getRecipeMainCategory(recipe) {
    const legacyMapping = LEGACY_CATEGORY_MAP[recipe.category];
    if (legacyMapping) return legacyMapping.main;
    return recipe.mainCategory || 'lunch-dinner';
  }

  // Get sub category for a recipe
  function getRecipeSubCategory(recipe) {
    const legacyMapping = LEGACY_CATEGORY_MAP[recipe.category];
    if (legacyMapping) return legacyMapping.sub;
    return recipe.category;
  }

  // Auto-tag recipes based on content
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
    if (recipe.category === 'baby' || combined.includes('ילדים') || combined.includes('תינוק')) {
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

  // Render tag filter pills
  function renderTagFilters() {
    const container = document.getElementById('tags-filter-pills');
    if (!container) return;

    container.innerHTML = AVAILABLE_TAGS.map(tag => `
      <button class="tag-filter-pill ${currentTags.includes(tag.id) ? 'active' : ''}"
              data-tag="${tag.id}"
              style="--tag-color: ${tag.color}">
        ${tag.icon} ${tag.name}
      </button>
    `).join('');
  }

  // Populate category select in form
  function populateCategorySelect() {
    const select = document.getElementById('recipe-category');
    select.innerHTML = categories.map(cat =>
      `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`
    ).join('');
  }

  // Get filtered recipes
  function getFilteredRecipes() {
    return recipes.filter(recipe => {
      // Main category match
      let mainCatMatch = currentMainCategory === 'all';
      if (!mainCatMatch) {
        const recipeMainCat = getRecipeMainCategory(recipe);
        mainCatMatch = recipeMainCat === currentMainCategory;
      }

      // Sub category match
      let subCatMatch = currentSubCategory === 'all';
      if (!subCatMatch && mainCatMatch) {
        const recipeSubCat = getRecipeSubCategory(recipe);
        subCatMatch = recipeSubCat === currentSubCategory;
      }

      // Tag match
      let tagMatch = currentTags.length === 0;
      if (!tagMatch) {
        const recipeTags = recipe.tags || autoTagRecipe(recipe);
        tagMatch = currentTags.every(tag => recipeTags.includes(tag));
      }

      // Search match
      let searchMatch = true;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = recipe.name?.toLowerCase().includes(query);
        const notesMatch = recipe.notes?.toLowerCase().includes(query);
        const textMatch = recipe.content?.text?.toLowerCase().includes(query);
        const transcriptionMatch = recipe.content?.transcription?.toLowerCase().includes(query);
        searchMatch = nameMatch || notesMatch || textMatch || transcriptionMatch;
      }

      return mainCatMatch && subCatMatch && tagMatch && searchMatch;
    });
  }

  // Render recipes
  function renderRecipes() {
    const filtered = getFilteredRecipes();

    // Build category name for display
    let categoryName = '';
    if (currentMainCategory === 'all') {
      categoryName = 'הכל';
    } else {
      const mainCat = MAIN_CATEGORIES.find(c => c.id === currentMainCategory);
      categoryName = mainCat?.name || '';
      if (currentSubCategory !== 'all') {
        const subCat = (SUB_CATEGORIES[currentMainCategory] || []).find(c => c.id === currentSubCategory);
        if (subCat) categoryName = subCat.name;
      }
    }
    recipeCount.textContent = `${filtered.length} מתכונים ${categoryName ? 'ב' + categoryName : ''}`;

    if (filtered.length === 0) {
      recipesContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <p class="empty-state-text">לא נמצאו מתכונים</p>
        </div>
      `;
      return;
    }

    recipesContainer.innerHTML = filtered.map(recipe => {
      const subCatId = getRecipeSubCategory(recipe);
      const category = CATEGORIES.find(c => c.id === subCatId) ||
                       CATEGORIES.find(c => c.id === recipe.category);
      const type = typeInfo[recipe.type] || typeInfo.link;
      const hasLocalImage = recipe.content?.images && recipe.content.images.length > 0;
      const hasUploadedImage = recipe.content?.uploadedImages && recipe.content.uploadedImages.length > 0;
      const localImageFile = hasLocalImage ? recipe.content.images[0] : null;
      const uploadedImageUrl = hasUploadedImage ? recipe.content.uploadedImages[0] : null;
      const isDocx = localImageFile && localImageFile.endsWith('.docx');

      // Get tags
      const recipeTags = recipe.tags || autoTagRecipe(recipe);
      const tagHtml = recipeTags.slice(0, 3).map(tagId => {
        const tag = AVAILABLE_TAGS.find(t => t.id === tagId);
        return tag ? `<span class="recipe-tag-pill" style="background: ${tag.color}20; color: ${tag.color};" title="${tag.name}">${tag.icon}</span>` : '';
      }).join('');

      let imageHtml;
      if (uploadedImageUrl) {
        imageHtml = `<img src="${uploadedImageUrl}" alt="${recipe.name}" class="recipe-image" loading="lazy" onerror="this.classList.add('placeholder'); this.outerHTML='<div class=\\'recipe-image placeholder\\'>${category?.icon || '🍽️'}</div>';">`;
      } else if (hasLocalImage && !isDocx) {
        imageHtml = `<img src="images/${localImageFile}" alt="${recipe.name}" class="recipe-image" loading="lazy" onerror="this.classList.add('placeholder'); this.outerHTML='<div class=\\'recipe-image placeholder\\'>${category?.icon || '🍽️'}</div>';">`;
      } else {
        imageHtml = `<div class="recipe-image placeholder">${category?.icon || '🍽️'}</div>`;
      }

      return `
        <article class="recipe-card" data-id="${recipe.id}">
          ${imageHtml}
          <div class="recipe-info">
            <h2 class="recipe-name">${recipe.name}</h2>
            <div class="recipe-meta">
              <span class="recipe-tag type-${recipe.type}">${type.icon} ${type.label}</span>
              <span class="recipe-tag">${category?.icon || ''} ${category?.name || ''}</span>
            </div>
            ${tagHtml ? `<div class="recipe-tags">${tagHtml}</div>` : ''}
          </div>
        </article>
      `;
    }).join('');
  }

  // Open recipe modal
  function openRecipe(id) {
    const recipe = recipes.find(r => r.id === id);
    if (!recipe) return;

    currentRecipeId = id;
    const category = categories.find(c => c.id === recipe.category);
    const date = formatDate(recipe.date);

    let contentHtml = '';

    // Uploaded Images (from Firebase Storage)
    if (recipe.content?.uploadedImages && recipe.content.uploadedImages.length > 0) {
      const images = recipe.content.uploadedImages;
      if (images.length === 1) {
        contentHtml += `<img src="${images[0]}" alt="${recipe.name}" class="modal-image">`;
      } else {
        contentHtml += `
          <div class="images-gallery">
            ${images.map(img => `<img src="${img}" alt="${recipe.name}">`).join('')}
          </div>
        `;
      }
    }

    // Local Images
    if (recipe.content?.images && recipe.content.images.length > 0) {
      const images = recipe.content.images.filter(img => !img.endsWith('.docx'));
      if (images.length === 1) {
        contentHtml += `<img src="images/${images[0]}" alt="${recipe.name}" class="modal-image">`;
      } else if (images.length > 1) {
        contentHtml += `
          <div class="images-gallery">
            ${images.map(img => `<img src="images/${img}" alt="${recipe.name}">`).join('')}
          </div>
        `;
      }
    }

    // Video embed
    if (recipe.type === 'video' && recipe.content?.url) {
      contentHtml += getVideoEmbed(recipe.content);
    }

    // Text content
    if (recipe.content?.text) {
      contentHtml += `<div class="modal-text">${escapeHtml(recipe.content.text)}</div>`;
    }

    // Action buttons container
    contentHtml += `<div class="recipe-action-buttons">`;

    // Transcription or button to add one (for all recipes)
    if (recipe.content?.transcription) {
      contentHtml += `
        <div class="transcription-box" style="width: 100%; margin-bottom: 12px;">
          <h4>📝 טקסט המתכון</h4>
          <p>${escapeHtml(recipe.content.transcription)}</p>
          <button class="add-transcription-btn" data-action="edit-transcription" style="margin-top: 12px; background: #64748b;">
            ✏️ ערוך טקסט
          </button>
        </div>
      `;
    } else {
      contentHtml += `
        <button class="add-transcription-btn" data-action="add-transcription">
          📝 העלאת טקסט ידנית
        </button>
      `;
    }

    // Add image button
    contentHtml += `
      <button class="add-image-btn" data-action="add-image">
        📷 הוסף תמונה
      </button>
    `;

    contentHtml += `</div>`;

    // Notes
    if (recipe.notes) {
      contentHtml += `
        <div class="modal-notes">
          <div class="modal-notes-label">הערות:</div>
          <p>${escapeHtml(recipe.notes)}</p>
        </div>
      `;
    }

    // Link button
    if (recipe.content?.url) {
      contentHtml += `
        <a href="${recipe.content.url}" target="_blank" rel="noopener" class="open-link-btn">
          🔗 פתח קישור מקורי
        </a>
      `;
    }

    modalBody.innerHTML = `
      <div class="modal-header">
        <h2 class="modal-title">${recipe.name}</h2>
        <p class="modal-date">${category?.icon || ''} ${category?.name || ''} • ${date}</p>
      </div>
      ${contentHtml}
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  // Get video embed HTML
  function getVideoEmbed(content) {
    const url = content.url;

    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (ytMatch) {
      return `
        <div class="video-container horizontal">
          <iframe src="https://www.youtube.com/embed/${ytMatch[1]}"
                  allowfullscreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
          </iframe>
        </div>
      `;
    }

    // Instagram - show embed with fallback
    if (url.includes('instagram.com')) {
      const cleanUrl = url.split('?')[0];
      return `
        <div class="video-container">
          <iframe src="${cleanUrl}embed/"
                  allowfullscreen
                  scrolling="no"
                  allowtransparency="true">
          </iframe>
        </div>
        <a href="${url}" target="_blank" rel="noopener" class="open-link-btn">
          📱 פתח באינסטגרם
        </a>
      `;
    }

    // Facebook - fallback only (no embed)
    if (url.includes('facebook.com')) {
      return `
        <div class="video-fallback">
          <div class="video-fallback-icon">📺</div>
          <p>סרטון מפייסבוק</p>
          <a href="${url}" target="_blank" rel="noopener" class="open-link-btn">
            📱 פתח בפייסבוק
          </a>
        </div>
      `;
    }

    // TikTok - fallback
    if (url.includes('tiktok.com')) {
      return `
        <div class="video-fallback">
          <div class="video-fallback-icon">🎵</div>
          <p>סרטון מטיקטוק</p>
          <a href="${url}" target="_blank" rel="noopener" class="open-link-btn">
            📱 פתח בטיקטוק
          </a>
        </div>
      `;
    }

    // Generic fallback
    return `
      <div class="video-fallback">
        <div class="video-fallback-icon">🎬</div>
        <p>סרטון</p>
        <a href="${url}" target="_blank" rel="noopener" class="open-link-btn">
          📱 פתח לצפייה
        </a>
      </div>
    `;
  }

  // Close modal
  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    currentRecipeId = null;
  }

  // Close add modal
  function closeAddModal() {
    addModal.classList.remove('active');
    document.body.style.overflow = '';
    addRecipeForm.reset();
    clearImageSelection();
  }

  // Open add recipe modal
  function openAddModal() {
    addModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  // Delete recipe
  async function deleteRecipe(id) {
    const recipe = recipes.find(r => r.id === id);
    if (!recipe) return;

    document.getElementById('delete-recipe-name').textContent = recipe.name;
    deleteModal.classList.add('active');
  }

  async function confirmDelete() {
    if (!currentRecipeId) return;

    try {
      await db.collection('recipes').doc(currentRecipeId).delete();
      recipes = recipes.filter(r => r.id !== currentRecipeId);
      renderRecipes();
      showToast('המתכון נמחק', 'success');
      closeModal();
      deleteModal.classList.remove('active');
    } catch (error) {
      console.error('Delete failed:', error);
      showToast('שגיאה במחיקת המתכון', 'error');
    }
  }

  // Add new recipe
  async function addRecipe(formData) {
    const submitBtn = document.getElementById('submit-add');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');

    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';
    submitBtn.disabled = true;

    try {
      const newRecipe = {
        name: formData.name,
        category: formData.category,
        type: formData.type,
        date: new Date().toISOString().split('T')[0],
        content: formData.content,
        notes: formData.notes || ''
      };

      // Generate ID first
      const docRef = await db.collection('recipes').add(newRecipe);
      newRecipe.id = docRef.id;

      // If there are images to upload
      if (formData.hasImagesToUpload && selectedImages.length > 0) {
        showToast('מעלה תמונות...', 'info');
        const imageUrls = await uploadImages(docRef.id);
        if (imageUrls.length > 0) {
          newRecipe.content.uploadedImages = imageUrls;
          await db.collection('recipes').doc(docRef.id).update({
            'content.uploadedImages': imageUrls
          });
        }
      }

      // Update local state
      recipes.unshift(newRecipe);
      renderRecipes();

      // Clear image selection
      clearImageSelection();

      showToast('המתכון נוסף בהצלחה!', 'success');
      closeAddModal();
    } catch (error) {
      console.error('Add recipe failed:', error);
      showToast('שגיאה בהוספת המתכון', 'error');
    }

    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
    submitBtn.disabled = false;
  }

  // Detect video type from URL
  function detectVideoType(url) {
    if (!url) return null;
    if (url.includes('instagram.com')) return 'instagram';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('facebook.com')) return 'facebook';
    if (url.includes('tiktok.com')) return 'tiktok';
    return null;
  }

  // Auto-categorize based on name
  function autoCategorize(name) {
    const text = name.toLowerCase();
    const keywords = {
      desserts: ['עוגה', 'עוגת', 'טארט', 'פאי', 'בראוניז', 'סופלה', 'פודינג', 'פודנט', 'קרמבו', 'מוס', 'פרלינה', 'אלפחורס'],
      cookies: ['עוגיות', 'עוגיה', 'ביסקוויט', 'כדורי', 'חיתוכיות'],
      main: ['עוף', 'פרגית', 'פרגיות', 'סלמון', 'דג', 'קציצות', 'אסאדו', 'בשר', 'שניצל', 'בולונז'],
      baby: ['תינוק', 'תינוקות', 'ילדים'],
      breakfast: ['פנקייק', 'גרנולה', 'ארוחת בוקר', 'חביתה', 'יוגורט'],
      yeast: ['שמרים', 'חלות', 'חלה', 'ג\'חנון', 'לחמניות', 'סינבון', 'בצק', 'פיצה', 'קובנה', 'רוגלך'],
      soups: ['מרק', 'מרקים'],
      salads: ['סלט', 'סלטים', 'אורז', 'פסטה', 'קוסקוס', 'קינואה', 'פתיתים', 'ירקות'],
      muffins: ['מאפינס', 'מאפין'],
      savory: ['קיש', 'לביבות', 'בורקס', 'פיתה', 'מקלות'],
      spreads: ['חמאת', 'ממרח', 'רוטב', 'טחינה']
    };

    for (const [category, words] of Object.entries(keywords)) {
      for (const word of words) {
        if (text.includes(word)) {
          return category;
        }
      }
    }

    return 'desserts'; // default
  }

  // Format date
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }

  // Escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Image upload functions
  function setupImageUpload() {
    const uploadArea = document.getElementById('image-upload-area');
    const fileInput = document.getElementById('recipe-images');
    const placeholder = document.getElementById('upload-placeholder');
    const previewContainer = document.getElementById('image-preview-container');

    if (!uploadArea || !fileInput) return;

    // Click to upload
    uploadArea.addEventListener('click', (e) => {
      if (e.target.closest('.remove-image') || e.target.closest('.add-more-images')) return;
      fileInput.click();
    });

    // File selection
    fileInput.addEventListener('change', (e) => {
      handleImageSelection(e.target.files);
    });

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = 'var(--primary-color)';
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.style.borderColor = '';
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = '';
      handleImageSelection(e.dataTransfer.files);
    });
  }

  function handleImageSelection(files) {
    const placeholder = document.getElementById('upload-placeholder');
    const previewContainer = document.getElementById('image-preview-container');
    const uploadArea = document.getElementById('image-upload-area');

    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;

      selectedImages.push(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        const div = document.createElement('div');
        div.className = 'image-preview-item';
        div.innerHTML = `
          <img src="${e.target.result}" alt="Preview">
          <button type="button" class="remove-image" data-index="${selectedImages.length - 1}">&times;</button>
        `;
        previewContainer.appendChild(div);
      };
      reader.readAsDataURL(file);
    }

    updateImagePreviewUI();
  }

  function updateImagePreviewUI() {
    const placeholder = document.getElementById('upload-placeholder');
    const previewContainer = document.getElementById('image-preview-container');
    const uploadArea = document.getElementById('image-upload-area');

    if (selectedImages.length > 0) {
      placeholder.style.display = 'none';
      uploadArea.classList.add('has-images');

      // Add "add more" button if not exists
      if (!previewContainer.querySelector('.add-more-images')) {
        const addMore = document.createElement('div');
        addMore.className = 'add-more-images';
        addMore.innerHTML = '+';
        addMore.addEventListener('click', (e) => {
          e.stopPropagation();
          document.getElementById('recipe-images').click();
        });
        previewContainer.appendChild(addMore);
      }
    } else {
      placeholder.style.display = 'flex';
      uploadArea.classList.remove('has-images');
      previewContainer.innerHTML = '';
    }
  }

  function removeImage(index) {
    selectedImages.splice(index, 1);

    // Rebuild preview
    const previewContainer = document.getElementById('image-preview-container');
    previewContainer.innerHTML = '';

    selectedImages.forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const div = document.createElement('div');
        div.className = 'image-preview-item';
        div.innerHTML = `
          <img src="${e.target.result}" alt="Preview">
          <button type="button" class="remove-image" data-index="${i}">&times;</button>
        `;
        previewContainer.appendChild(div);
        updateImagePreviewUI();
      };
      reader.readAsDataURL(file);
    });

    if (selectedImages.length === 0) {
      updateImagePreviewUI();
    }
  }

  async function uploadImages(recipeId) {
    const uploadedUrls = [];

    for (let i = 0; i < selectedImages.length; i++) {
      const file = selectedImages[i];
      const ext = file.name.split('.').pop();
      const filename = `${recipeId}_${Date.now()}_${i}.${ext}`;
      const storageRef = storage.ref(`recipe-images/${filename}`);

      try {
        const snapshot = await storageRef.put(file);
        const url = await snapshot.ref.getDownloadURL();
        uploadedUrls.push(url);
      } catch (error) {
        console.error('Image upload failed:', error);
      }
    }

    return uploadedUrls;
  }

  function clearImageSelection() {
    selectedImages = [];
    const previewContainer = document.getElementById('image-preview-container');
    const placeholder = document.getElementById('upload-placeholder');
    const uploadArea = document.getElementById('image-upload-area');

    if (previewContainer) previewContainer.innerHTML = '';
    if (placeholder) placeholder.style.display = 'flex';
    if (uploadArea) uploadArea.classList.remove('has-images');

    const fileInput = document.getElementById('recipe-images');
    if (fileInput) fileInput.value = '';
  }

  // Modal image upload functions (for adding to existing recipes)
  function setupModalImageUpload() {
    const uploadArea = document.getElementById('modal-image-upload-area');
    const fileInput = document.getElementById('modal-recipe-images');

    if (!uploadArea || !fileInput) return;

    uploadArea.addEventListener('click', (e) => {
      if (e.target.closest('.remove-image') || e.target.closest('.add-more-images')) return;
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      handleModalImageSelection(e.target.files);
    });

    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = 'var(--primary-color)';
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.style.borderColor = '';
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = '';
      handleModalImageSelection(e.dataTransfer.files);
    });
  }

  function handleModalImageSelection(files) {
    const placeholder = document.getElementById('modal-upload-placeholder');
    const previewContainer = document.getElementById('modal-image-preview-container');
    const uploadArea = document.getElementById('modal-image-upload-area');

    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;

      modalSelectedImages.push(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        const div = document.createElement('div');
        div.className = 'image-preview-item';
        div.innerHTML = `
          <img src="${e.target.result}" alt="Preview">
          <button type="button" class="remove-image modal-remove" data-index="${modalSelectedImages.length - 1}">&times;</button>
        `;
        previewContainer.appendChild(div);
      };
      reader.readAsDataURL(file);
    }

    updateModalImagePreviewUI();
  }

  function updateModalImagePreviewUI() {
    const placeholder = document.getElementById('modal-upload-placeholder');
    const previewContainer = document.getElementById('modal-image-preview-container');
    const uploadArea = document.getElementById('modal-image-upload-area');

    if (modalSelectedImages.length > 0) {
      placeholder.style.display = 'none';
      uploadArea.classList.add('has-images');

      if (!previewContainer.querySelector('.add-more-images')) {
        const addMore = document.createElement('div');
        addMore.className = 'add-more-images';
        addMore.innerHTML = '+';
        addMore.addEventListener('click', (e) => {
          e.stopPropagation();
          document.getElementById('modal-recipe-images').click();
        });
        previewContainer.appendChild(addMore);
      }
    } else {
      placeholder.style.display = 'flex';
      uploadArea.classList.remove('has-images');
      previewContainer.innerHTML = '';
    }
  }

  function removeModalImage(index) {
    modalSelectedImages.splice(index, 1);

    const previewContainer = document.getElementById('modal-image-preview-container');
    previewContainer.innerHTML = '';

    modalSelectedImages.forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const div = document.createElement('div');
        div.className = 'image-preview-item';
        div.innerHTML = `
          <img src="${e.target.result}" alt="Preview">
          <button type="button" class="remove-image modal-remove" data-index="${i}">&times;</button>
        `;
        previewContainer.appendChild(div);
        updateModalImagePreviewUI();
      };
      reader.readAsDataURL(file);
    });

    if (modalSelectedImages.length === 0) {
      updateModalImagePreviewUI();
    }
  }

  function clearModalImageSelection() {
    modalSelectedImages = [];
    const previewContainer = document.getElementById('modal-image-preview-container');
    const placeholder = document.getElementById('modal-upload-placeholder');
    const uploadArea = document.getElementById('modal-image-upload-area');

    if (previewContainer) previewContainer.innerHTML = '';
    if (placeholder) placeholder.style.display = 'flex';
    if (uploadArea) uploadArea.classList.remove('has-images');

    const fileInput = document.getElementById('modal-recipe-images');
    if (fileInput) fileInput.value = '';
  }

  function openAddImageModal() {
    clearModalImageSelection();
    addImageModal.classList.add('active');
  }

  function closeAddImageModal() {
    addImageModal.classList.remove('active');
    clearModalImageSelection();
  }

  async function saveAddedImages() {
    if (!currentRecipeId || modalSelectedImages.length === 0) {
      showToast('נא לבחור לפחות תמונה אחת', 'error');
      return;
    }

    const saveBtn = saveAddImageBtn;
    const btnText = saveBtn.querySelector('.btn-text');
    const btnLoading = saveBtn.querySelector('.btn-loading');

    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';
    saveBtn.disabled = true;

    try {
      // Upload images
      const uploadedUrls = [];
      for (let i = 0; i < modalSelectedImages.length; i++) {
        const file = modalSelectedImages[i];
        const ext = file.name.split('.').pop();
        const filename = `${currentRecipeId}_${Date.now()}_${i}.${ext}`;
        const storageRef = storage.ref(`recipe-images/${filename}`);

        const snapshot = await storageRef.put(file);
        const url = await snapshot.ref.getDownloadURL();
        uploadedUrls.push(url);
      }

      // Get existing images and merge
      const recipe = recipes.find(r => r.id === currentRecipeId);
      const existingImages = recipe.content?.uploadedImages || [];
      const allImages = [...existingImages, ...uploadedUrls];

      // Update Firestore
      await db.collection('recipes').doc(currentRecipeId).update({
        'content.uploadedImages': allImages
      });

      // Update local state
      if (!recipe.content) recipe.content = {};
      recipe.content.uploadedImages = allImages;

      showToast('התמונות נוספו בהצלחה!', 'success');
      closeAddImageModal();

      // Refresh the recipe modal
      openRecipe(currentRecipeId);
    } catch (error) {
      console.error('Save images failed:', error);
      showToast('שגיאה בשמירת התמונות', 'error');
    }

    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
    saveBtn.disabled = false;
  }

  // Setup event listeners
  function setupEventListeners() {
    // Main category buttons
    categoriesNav.addEventListener('click', (e) => {
      const btn = e.target.closest('.category-btn');
      if (!btn) return;

      const mainCat = btn.dataset.mainCategory;
      if (mainCat !== undefined) {
        currentMainCategory = mainCat;
        currentSubCategory = 'all';
        renderCategories();
        renderRecipes();
      }
    });

    // Sub category buttons (using event delegation on document)
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.sub-category-btn');
      if (!btn) return;

      const subCat = btn.dataset.subCategory;
      if (subCat !== undefined) {
        currentSubCategory = subCat;
        document.querySelectorAll('.sub-category-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderRecipes();
      }
    });

    // Tag filter buttons
    document.getElementById('tags-filter-pills')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.tag-filter-pill');
      if (!btn) return;

      const tagId = btn.dataset.tag;
      if (currentTags.includes(tagId)) {
        currentTags = currentTags.filter(t => t !== tagId);
      } else {
        currentTags.push(tagId);
      }
      renderTagFilters();
      renderRecipes();
    });

    // Recipe cards
    recipesContainer.addEventListener('click', (e) => {
      const card = e.target.closest('.recipe-card');
      if (card) {
        openRecipe(card.dataset.id);
      }
    });

    // Search
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const value = e.target.value;
      clearSearchBtn.classList.toggle('visible', value.length > 0);

      searchTimeout = setTimeout(() => {
        searchQuery = value;
        renderRecipes();
      }, 200);
    });

    clearSearchBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchQuery = '';
      clearSearchBtn.classList.remove('visible');
      renderRecipes();
      searchInput.focus();
    });

    // Recipe modal
    modalClose.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Delete button
    modalDelete.addEventListener('click', () => {
      if (currentRecipeId) deleteRecipe(currentRecipeId);
    });

    cancelDeleteBtn.addEventListener('click', () => {
      deleteModal.classList.remove('active');
    });

    confirmDeleteBtn.addEventListener('click', confirmDelete);

    deleteModal.addEventListener('click', (e) => {
      if (e.target === deleteModal) {
        deleteModal.classList.remove('active');
      }
    });

    // Add recipe
    addRecipeBtn.addEventListener('click', openAddModal);
    addModalClose.addEventListener('click', closeAddModal);
    cancelAddBtn.addEventListener('click', closeAddModal);

    // Image upload setup
    setupImageUpload();

    // Remove image button
    document.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.remove-image');
      if (removeBtn) {
        e.preventDefault();
        e.stopPropagation();
        const index = parseInt(removeBtn.dataset.index);
        removeImage(index);
      }
    });

    addModal.addEventListener('click', (e) => {
      if (e.target === addModal) closeAddModal();
    });

    // Form tabs
    document.querySelectorAll('.form-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.form-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.form-tab-content').forEach(c => c.classList.remove('active'));

        tab.classList.add('active');
        currentFormTab = tab.dataset.tab;
        document.querySelector(`.form-tab-content[data-tab="${currentFormTab}"]`).classList.add('active');
      });
    });

    // Auto-categorize on name input
    document.getElementById('recipe-name-link').addEventListener('input', (e) => {
      const category = autoCategorize(e.target.value);
      document.getElementById('recipe-category').value = category;
    });

    document.getElementById('recipe-name-text').addEventListener('input', (e) => {
      const category = autoCategorize(e.target.value);
      document.getElementById('recipe-category').value = category;
    });

    document.getElementById('recipe-name-image').addEventListener('input', (e) => {
      const category = autoCategorize(e.target.value);
      document.getElementById('recipe-category').value = category;
    });

    // Form submit
    addRecipeForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      let formData;

      if (currentFormTab === 'link') {
        const url = document.getElementById('recipe-url').value.trim();
        const name = document.getElementById('recipe-name-link').value.trim();

        if (!url) {
          showToast('נא להזין קישור', 'error');
          return;
        }

        const videoType = detectVideoType(url);

        formData = {
          name: name || 'מתכון חדש',
          category: document.getElementById('recipe-category').value,
          type: videoType ? 'video' : 'link',
          content: {
            url: url,
            videoType: videoType
          },
          notes: document.getElementById('recipe-notes').value.trim()
        };
      } else if (currentFormTab === 'text') {
        const name = document.getElementById('recipe-name-text').value.trim();
        const text = document.getElementById('recipe-text').value.trim();

        if (!name || !text) {
          showToast('נא למלא שם ותוכן המתכון', 'error');
          return;
        }

        formData = {
          name: name,
          category: document.getElementById('recipe-category').value,
          type: 'text',
          content: {
            text: text
          },
          notes: document.getElementById('recipe-notes').value.trim()
        };
      } else if (currentFormTab === 'image') {
        const name = document.getElementById('recipe-name-image').value.trim();
        const text = document.getElementById('recipe-text-image').value.trim();

        if (!name) {
          showToast('נא להזין שם המתכון', 'error');
          return;
        }

        if (selectedImages.length === 0) {
          showToast('נא להעלות לפחות תמונה אחת', 'error');
          return;
        }

        formData = {
          name: name,
          category: document.getElementById('recipe-category').value,
          type: 'photo',
          content: {
            text: text || ''
          },
          notes: document.getElementById('recipe-notes').value.trim(),
          hasImagesToUpload: true
        };
      }

      await addRecipe(formData);
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (settingsModal.classList.contains('active')) {
          closeSettingsModal();
        } else if (addImageModal.classList.contains('active')) {
          closeAddImageModal();
        } else if (transcriptionModal.classList.contains('active')) {
          closeTranscriptionModal();
        } else if (deleteModal.classList.contains('active')) {
          deleteModal.classList.remove('active');
        } else if (addModal.classList.contains('active')) {
          closeAddModal();
        } else if (modal.classList.contains('active')) {
          closeModal();
        }
      }
    });

    // Image gallery click to fullscreen
    modalBody.addEventListener('click', (e) => {
      if (e.target.tagName === 'IMG' && e.target.closest('.images-gallery')) {
        window.open(e.target.src, '_blank');
      }
    });

    // Action buttons in recipe modal (transcription & image)
    modalBody.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      if (action === 'add-transcription' || action === 'edit-transcription') {
        openTranscriptionModal();
      } else if (action === 'add-image') {
        openAddImageModal();
      }
    });

    // Add image modal
    setupModalImageUpload();
    addImageModalClose.addEventListener('click', closeAddImageModal);
    cancelAddImageBtn.addEventListener('click', closeAddImageModal);
    saveAddImageBtn.addEventListener('click', saveAddedImages);

    addImageModal.addEventListener('click', (e) => {
      if (e.target === addImageModal) closeAddImageModal();
    });

    // Handle remove image buttons for modal
    document.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('.remove-image.modal-remove');
      if (removeBtn) {
        e.preventDefault();
        e.stopPropagation();
        const index = parseInt(removeBtn.dataset.index);
        removeModalImage(index);
      }
    });

    // Transcription modal
    transcriptionModalClose.addEventListener('click', closeTranscriptionModal);
    cancelTranscriptionBtn.addEventListener('click', closeTranscriptionModal);
    saveTranscriptionBtn.addEventListener('click', saveTranscription);

    transcriptionModal.addEventListener('click', (e) => {
      if (e.target === transcriptionModal) closeTranscriptionModal();
    });

    // Settings modal
    settingsBtn.addEventListener('click', openSettingsModal);
    settingsModalClose.addEventListener('click', closeSettingsModal);
    cancelSettingsBtn.addEventListener('click', closeSettingsModal);
    saveSettingsBtn.addEventListener('click', saveSettings);

    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) closeSettingsModal();
    });
  }

  // Transcription modal functions
  function openTranscriptionModal() {
    const recipe = recipes.find(r => r.id === currentRecipeId);
    if (!recipe) return;

    // Pre-fill with existing transcription if editing
    transcriptionText.value = recipe.content?.transcription || '';

    transcriptionModal.classList.add('active');
  }

  function closeTranscriptionModal() {
    transcriptionModal.classList.remove('active');
    transcriptionText.value = '';
  }

  async function saveTranscription() {
    if (!currentRecipeId) return;

    const text = transcriptionText.value.trim();
    if (!text) {
      showToast('נא להזין טקסט', 'error');
      return;
    }

    const saveBtn = saveTranscriptionBtn;
    const btnText = saveBtn.querySelector('.btn-text');
    const btnLoading = saveBtn.querySelector('.btn-loading');

    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';
    saveBtn.disabled = true;

    try {
      // Update in Firestore
      const recipe = recipes.find(r => r.id === currentRecipeId);
      if (!recipe.content) recipe.content = {};
      recipe.content.transcription = text;

      await db.collection('recipes').doc(currentRecipeId).update({
        'content.transcription': text
      });

      showToast('הטקסט נשמר בהצלחה!', 'success');
      closeTranscriptionModal();

      // Refresh the recipe modal
      openRecipe(currentRecipeId);
    } catch (error) {
      console.error('Save transcription failed:', error);
      showToast('שגיאה בשמירת הטקסט', 'error');
    }

    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
    saveBtn.disabled = false;
  }

  // Settings modal functions
  function openSettingsModal() {
    // Load saved API key
    const savedKey = localStorage.getItem('openai_api_key') || '';
    openaiKeyInput.value = savedKey;

    settingsModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeSettingsModal() {
    settingsModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  function saveSettings() {
    const apiKey = openaiKeyInput.value.trim();

    if (apiKey) {
      localStorage.setItem('openai_api_key', apiKey);
      showToast('ההגדרות נשמרו', 'success');
    } else {
      localStorage.removeItem('openai_api_key');
      showToast('מפתח ה-API הוסר', 'success');
    }

    closeSettingsModal();
  }

  // Start app
  document.addEventListener('DOMContentLoaded', init);
})();
