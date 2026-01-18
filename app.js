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
  // Storage removed - requires paid Firebase plan
  const auth = firebase.auth();

  // Allowed email addresses that can edit recipes
  const ALLOWED_EDITORS = [
    'taladani@gmail.com',
    'eliavschreiber@gmail.com',
    'dschreiber@gmail.com',
    'gidonschreiber@gmail.com'
  ];

  // Auth state
  let currentUser = null;
  let canEdit = false;

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
  // Image upload removed - requires paid Firebase plan

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
  // Image modal elements removed - requires paid Firebase plan
  const editTagsModal = document.getElementById('edit-tags-modal');
  const editTagsModalClose = document.getElementById('edit-tags-modal-close');
  const cancelEditTagsBtn = document.getElementById('cancel-edit-tags');
  const saveEditTagsBtn = document.getElementById('save-edit-tags');
  const tagsEditor = document.getElementById('tags-editor');
  const loading = document.getElementById('loading');
  const toastContainer = document.getElementById('toast-container');
  const authBtn = document.getElementById('auth-btn');
  const authModal = document.getElementById('auth-modal');
  const authModalClose = document.getElementById('auth-modal-close');
  const googleSigninBtn = document.getElementById('google-signin-btn');
  const signoutBtn = document.getElementById('signout-btn');

  // Track selected tags for the editor
  let editingRecipeTags = [];

  // Type icons and labels
  const typeInfo = {
    video: { icon: '🎬', label: 'סרטון' },
    link: { icon: '🔗', label: 'קישור' },
    text: { icon: '📝', label: 'מתכון' },
    photo: { icon: '📷', label: 'תמונה' }
  };

  // Auth functions
  function setupAuth() {
    // Listen for auth state changes
    auth.onAuthStateChanged((user) => {
      currentUser = user;
      canEdit = user && ALLOWED_EDITORS.includes(user.email);
      updateAuthUI();
      updateEditButtonsVisibility();
    });
  }

  function updateAuthUI() {
    const signedOutDiv = document.getElementById('auth-signed-out');
    const signedInDiv = document.getElementById('auth-signed-in');

    if (currentUser) {
      signedOutDiv.style.display = 'none';
      signedInDiv.style.display = 'block';

      document.getElementById('auth-user-photo').src = currentUser.photoURL || '';
      document.getElementById('auth-user-name').textContent = currentUser.displayName || 'משתמש';
      document.getElementById('auth-user-email').textContent = currentUser.email;

      const permissionStatus = document.getElementById('auth-permission-status');
      if (canEdit) {
        permissionStatus.className = 'auth-permission-status has-permission';
        permissionStatus.textContent = '✓ יש לך הרשאה לערוך מתכונים';
      } else {
        permissionStatus.className = 'auth-permission-status no-permission';
        permissionStatus.textContent = '⚠️ אין לך הרשאה לערוך מתכונים. פני למנהל המערכת.';
      }

      authBtn.classList.add('signed-in');
      authBtn.textContent = '✓';
    } else {
      signedOutDiv.style.display = 'block';
      signedInDiv.style.display = 'none';
      authBtn.classList.remove('signed-in');
      authBtn.textContent = '👤';
    }
  }

  function updateEditButtonsVisibility() {
    // Add recipe button
    const addBtn = document.getElementById('add-recipe-btn');
    if (addBtn) addBtn.classList.toggle('hidden', !canEdit);

    // Delete button in modal
    const deleteBtn = document.getElementById('modal-delete');
    if (deleteBtn) deleteBtn.classList.toggle('hidden', !canEdit);
  }

  async function signInWithGoogle() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
      closeAuthModal();
      showToast('התחברת בהצלחה!', 'success');
    } catch (error) {
      console.error('Sign in failed:', error);
      showToast('שגיאה בהתחברות', 'error');
    }
  }

  async function signOut() {
    try {
      await auth.signOut();
      closeAuthModal();
      showToast('התנתקת בהצלחה', 'success');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }

  function openAuthModal() {
    authModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeAuthModal() {
    authModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Initialize
  async function init() {
    showLoading(true);
    categories = CATEGORIES;

    // Setup auth first
    setupAuth();

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

  // Render tag filter pills - only show tags that have at least one recipe
  function renderTagFilters() {
    const container = document.getElementById('tags-filter-pills');
    if (!container) return;

    // Count recipes per tag
    const tagCounts = {};
    AVAILABLE_TAGS.forEach(tag => tagCounts[tag.id] = 0);

    recipes.forEach(recipe => {
      const recipeTags = recipe.tags || autoTagRecipe(recipe);
      recipeTags.forEach(tagId => {
        if (tagCounts[tagId] !== undefined) {
          tagCounts[tagId]++;
        }
      });
    });

    // Only show tags that have at least one recipe
    const tagsWithRecipes = AVAILABLE_TAGS.filter(tag => tagCounts[tag.id] > 0);

    container.innerHTML = tagsWithRecipes.map(tag => `
      <button class="tag-filter-pill ${currentTags.includes(tag.id) ? 'active' : ''}"
              data-tag="${tag.id}"
              style="--tag-color: ${tag.color}">
        ${tag.icon} ${tag.name} <span class="tag-count">(${tagCounts[tag.id]})</span>
      </button>
    `).join('');
  }

  // Populate category select in form with hierarchical groups
  function populateCategorySelect() {
    const select = document.getElementById('recipe-category');
    let html = '';

    MAIN_CATEGORIES.forEach(mainCat => {
      const subCats = SUB_CATEGORIES[mainCat.id] || [];
      if (subCats.length > 0) {
        html += `<optgroup label="${mainCat.icon} ${mainCat.name}">`;
        subCats.forEach(subCat => {
          html += `<option value="${subCat.id}">${subCat.icon} ${subCat.name}</option>`;
        });
        html += `</optgroup>`;
      }
    });

    select.innerHTML = html;
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
      // Get main category and sub-category for display
      const mainCatId = getRecipeMainCategory(recipe);
      const subCatId = getRecipeSubCategory(recipe);
      const mainCat = MAIN_CATEGORIES.find(c => c.id === mainCatId);
      const subCat = CATEGORIES.find(c => c.id === subCatId) ||
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

      // Build category display: "Main > Sub" format
      const categoryDisplay = mainCat && subCat
        ? `${mainCat.icon} ${mainCat.name} › ${subCat.name}`
        : (subCat ? `${subCat.icon} ${subCat.name}` : '');

      let imageHtml;
      if (uploadedImageUrl) {
        imageHtml = `<img src="${uploadedImageUrl}" alt="${recipe.name}" class="recipe-image" loading="lazy" onerror="this.classList.add('placeholder'); this.outerHTML='<div class=\\'recipe-image placeholder\\'>${mainCat?.icon || '🍽️'}</div>';">`;
      } else if (hasLocalImage && !isDocx) {
        imageHtml = `<img src="images/${localImageFile}" alt="${recipe.name}" class="recipe-image" loading="lazy" onerror="this.classList.add('placeholder'); this.outerHTML='<div class=\\'recipe-image placeholder\\'>${mainCat?.icon || '🍽️'}</div>';">`;
      } else {
        imageHtml = `<div class="recipe-image placeholder">${mainCat?.icon || subCat?.icon || '🍽️'}</div>`;
      }

      return `
        <article class="recipe-card" data-id="${recipe.id}">
          ${imageHtml}
          <div class="recipe-info">
            <h2 class="recipe-name">${recipe.name}</h2>
            <div class="recipe-meta">
              <span class="recipe-tag type-${recipe.type}">${type.icon} ${type.label}</span>
              <span class="recipe-tag category-hierarchy">${categoryDisplay}</span>
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

    // Video embed or external link card
    if ((recipe.type === 'video' || recipe.type === 'link') && recipe.content?.url) {
      contentHtml += getVideoEmbed(recipe.content);
    }

    // Text content
    if (recipe.content?.text) {
      contentHtml += `<div class="modal-text">${escapeHtml(recipe.content.text)}</div>`;
    }

    // Action buttons container (only show edit buttons if user can edit)
    contentHtml += `<div class="recipe-action-buttons">`;

    // Transcription or button to add one (for all recipes)
    if (recipe.content?.transcription) {
      contentHtml += `
        <div class="transcription-box" style="width: 100%; margin-bottom: 12px;">
          <h4>📝 טקסט המתכון</h4>
          <p>${escapeHtml(recipe.content.transcription)}</p>
          ${canEdit ? `<button class="add-transcription-btn" data-action="edit-transcription" style="margin-top: 12px; background: #64748b;">
            ✏️ ערוך טקסט
          </button>` : ''}
        </div>
      `;
    } else {
      // Show extract button for link-type recipes without transcription
      if (canEdit && recipe.type === 'link' && recipe.content?.url) {
        contentHtml += `
          <button class="extract-recipe-btn" data-action="extract-recipe">
            🔄 חלץ מתכון מהאתר
          </button>
        `;
      }
      if (canEdit) {
        contentHtml += `
          <button class="add-transcription-btn" data-action="add-transcription">
            📝 העלאת טקסט ידנית
          </button>
        `;
      }
    }

    // Add image button removed - requires paid Firebase plan

    // Edit tags button (only if can edit)
    if (canEdit) {
      contentHtml += `
        <button class="edit-tags-btn" data-action="edit-tags">
          🏷️ ערוך תגיות
        </button>
      `;
    }

    contentHtml += `</div>`;

    // Display current tags
    const recipeTags = recipe.tags || autoTagRecipe(recipe);
    if (recipeTags.length > 0) {
      contentHtml += `
        <div class="recipe-tags-display">
          <span class="tags-label">תגיות:</span>
          ${recipeTags.map(tagId => {
            const tag = AVAILABLE_TAGS.find(t => t.id === tagId);
            return tag ? `<span class="tag-display-pill" style="background: ${tag.color}20; color: ${tag.color};">${tag.icon} ${tag.name}</span>` : '';
          }).join('')}
        </div>
      `;
    }

    // Notes
    if (recipe.notes) {
      contentHtml += `
        <div class="modal-notes">
          <div class="modal-notes-label">הערות:</div>
          <p>${escapeHtml(recipe.notes)}</p>
        </div>
      `;
    }

    // Link button - only show if not already shown in video embed / external card
    // For video types like instagram/youtube or external recipe sites, the button is already in the embed
    const url = recipe.content?.url;
    const isVideoEmbed = url && (url.includes('instagram.com') || url.includes('youtube.com') || url.includes('youtu.be'));
    const isExternalSite = url && !isVideoEmbed && !url.includes('facebook.com') && !url.includes('tiktok.com') && (recipe.type === 'video' || recipe.type === 'link');

    // Only show link button for video fallbacks (facebook, tiktok) or if no embed was shown
    if (recipe.content?.url && !isVideoEmbed && !isExternalSite) {
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

  // Known recipe websites with branding
  const KNOWN_RECIPE_SITES = {
    'oogio.net': { name: 'אוגיו', icon: '🍳', color: '#e74c3c' },
    'heninthekitchen.com': { name: 'תרנגולת במטבח', icon: '🐔', color: '#f39c12' },
    'lichtenstadt.com': { name: 'ליכטנשטט', icon: '👨‍🍳', color: '#9b59b6' },
    'carine.co.il': { name: 'קארין גורן', icon: '🧁', color: '#e91e63' },
    'bakery365.co.il': { name: 'בייקרי 365', icon: '🥐', color: '#795548' },
    'hashulchan.co.il': { name: 'השולחן', icon: '🍽️', color: '#2196f3' },
    'foodish.co.il': { name: 'פודיש', icon: '🥗', color: '#4caf50' },
    '10dakot.co.il': { name: '10 דקות', icon: '⏱️', color: '#ff5722' },
    'sweetmeat.co.il': { name: 'סוויט מיט', icon: '🍖', color: '#8d6e63' },
    'gilmoran.com': { name: 'גיל מורן', icon: '🎂', color: '#673ab7' },
    'thekitchn.com': { name: 'The Kitchn', icon: '🏠', color: '#00bcd4' },
    'seriouseats.com': { name: 'Serious Eats', icon: '🔬', color: '#f44336' },
    'bonappetit.com': { name: 'Bon Appétit', icon: '✨', color: '#ffeb3b' },
    'allrecipes.com': { name: 'Allrecipes', icon: '📖', color: '#ff9800' },
    'tasty.co': { name: 'Tasty', icon: '🎬', color: '#1abc9c' },
    'delish.com': { name: 'Delish', icon: '😋', color: '#e91e63' }
  };

  // Get domain from URL
  function getDomainFromUrl(url) {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace(/^www\./, '');
    } catch {
      return null;
    }
  }

  // Get recipe site info
  function getRecipeSiteInfo(url) {
    const domain = getDomainFromUrl(url);
    if (!domain) return null;

    // Check for exact match
    if (KNOWN_RECIPE_SITES[domain]) {
      return { ...KNOWN_RECIPE_SITES[domain], domain };
    }

    // Check for partial match (subdomains)
    for (const [siteDomain, info] of Object.entries(KNOWN_RECIPE_SITES)) {
      if (domain.includes(siteDomain)) {
        return { ...info, domain };
      }
    }

    return { domain, name: domain, icon: '🔗', color: '#6b7280' };
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

    // Check for known recipe websites
    const siteInfo = getRecipeSiteInfo(url);
    if (siteInfo && !siteInfo.domain.includes('instagram') && !siteInfo.domain.includes('youtube') && !siteInfo.domain.includes('facebook') && !siteInfo.domain.includes('tiktok')) {
      return `
        <div class="external-recipe-card" style="--site-color: ${siteInfo.color}">
          <div class="external-recipe-header">
            <span class="external-recipe-icon">${siteInfo.icon}</span>
            <div class="external-recipe-source">
              <span class="external-recipe-site-name">${siteInfo.name}</span>
              <span class="external-recipe-domain">${siteInfo.domain}</span>
            </div>
          </div>
          <div class="external-recipe-body">
            <p class="external-recipe-hint">
              💡 לחצי על הכפתור למטה כדי לצפות במתכון המלא באתר המקור.
              <br>
              <span class="hint-secondary">תוכלי להעתיק את המתכון ולהדביק אותו בשדה "העלאת טקסט ידנית" כדי שהוא יהיה זמין לחיפוש.</span>
            </p>
          </div>
          <a href="${url}" target="_blank" rel="noopener" class="external-recipe-btn">
            🔗 פתח מתכון באתר ${siteInfo.name}
          </a>
        </div>
      `;
    }

    // Generic fallback for videos
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
    if (!canEdit) {
      showToast('אין לך הרשאה להוסיף מתכונים. התחבר עם חשבון מורשה.', 'error');
      openAuthModal();
      return;
    }
    addModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  // Delete recipe
  async function deleteRecipe(id) {
    if (!canEdit) {
      showToast('אין לך הרשאה למחוק מתכונים. התחבר עם חשבון מורשה.', 'error');
      return;
    }

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

      // Update local state
      recipes.unshift(newRecipe);
      renderRecipes();

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

  // Image upload functions removed - requires paid Firebase plan
  // Note: Existing uploaded images from Firebase Storage will still display

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

    // Image upload removed - requires paid Firebase plan

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

    // Image name input removed - requires paid Firebase plan

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
      }
      // Image tab removed - requires paid Firebase plan

      await addRecipe(formData);
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (settingsModal.classList.contains('active')) {
          closeSettingsModal();
        } else if (editTagsModal.classList.contains('active')) {
          closeEditTagsModal();
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

    // Action buttons in recipe modal (transcription, image, tags)
    modalBody.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      if (action === 'add-transcription' || action === 'edit-transcription') {
        openTranscriptionModal();
      } else if (action === 'edit-tags') {
        openEditTagsModal();
      } else if (action === 'extract-recipe') {
        extractRecipeFromUrl();
      }
    });

    // Add image modal removed - requires paid Firebase plan

    // Transcription modal
    transcriptionModalClose.addEventListener('click', closeTranscriptionModal);
    cancelTranscriptionBtn.addEventListener('click', closeTranscriptionModal);
    saveTranscriptionBtn.addEventListener('click', saveTranscription);

    transcriptionModal.addEventListener('click', (e) => {
      if (e.target === transcriptionModal) closeTranscriptionModal();
    });

    // Edit tags modal
    editTagsModalClose.addEventListener('click', closeEditTagsModal);
    cancelEditTagsBtn.addEventListener('click', closeEditTagsModal);
    saveEditTagsBtn.addEventListener('click', saveEditedTags);

    editTagsModal.addEventListener('click', (e) => {
      if (e.target === editTagsModal) closeEditTagsModal();
    });

    // Settings modal
    settingsBtn.addEventListener('click', openSettingsModal);
    settingsModalClose.addEventListener('click', closeSettingsModal);
    cancelSettingsBtn.addEventListener('click', closeSettingsModal);
    saveSettingsBtn.addEventListener('click', saveSettings);

    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) closeSettingsModal();
    });

    // Auth modal
    authBtn.addEventListener('click', openAuthModal);
    authModalClose.addEventListener('click', closeAuthModal);
    googleSigninBtn.addEventListener('click', signInWithGoogle);
    signoutBtn.addEventListener('click', signOut);

    authModal.addEventListener('click', (e) => {
      if (e.target === authModal) closeAuthModal();
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

    if (!canEdit) {
      showToast('אין לך הרשאה לערוך מתכונים', 'error');
      return;
    }

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

  // Edit tags modal functions
  function openEditTagsModal() {
    const recipe = recipes.find(r => r.id === currentRecipeId);
    if (!recipe) return;

    // Get current tags (either saved or auto-generated)
    editingRecipeTags = [...(recipe.tags || autoTagRecipe(recipe))];

    // Render the tags editor
    tagsEditor.innerHTML = AVAILABLE_TAGS.map(tag => `
      <div class="tag-editor-item ${editingRecipeTags.includes(tag.id) ? 'selected' : ''}"
           data-tag-id="${tag.id}"
           style="--tag-color: ${tag.color}">
        <span class="tag-icon">${tag.icon}</span>
        <span class="tag-name">${tag.name}</span>
      </div>
    `).join('');

    // Add click handlers for tags
    tagsEditor.querySelectorAll('.tag-editor-item').forEach(item => {
      item.addEventListener('click', () => {
        const tagId = item.dataset.tagId;
        if (editingRecipeTags.includes(tagId)) {
          editingRecipeTags = editingRecipeTags.filter(t => t !== tagId);
          item.classList.remove('selected');
        } else {
          editingRecipeTags.push(tagId);
          item.classList.add('selected');
        }
      });
    });

    editTagsModal.classList.add('active');
  }

  function closeEditTagsModal() {
    editTagsModal.classList.remove('active');
    editingRecipeTags = [];
  }

  async function saveEditedTags() {
    if (!currentRecipeId) return;

    if (!canEdit) {
      showToast('אין לך הרשאה לערוך מתכונים', 'error');
      return;
    }

    const saveBtn = saveEditTagsBtn;
    const btnText = saveBtn.querySelector('.btn-text');
    const btnLoading = saveBtn.querySelector('.btn-loading');

    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';
    saveBtn.disabled = true;

    try {
      // Update in Firestore
      const recipe = recipes.find(r => r.id === currentRecipeId);
      recipe.tags = [...editingRecipeTags];

      await db.collection('recipes').doc(currentRecipeId).update({
        tags: editingRecipeTags
      });

      showToast('התגיות נשמרו בהצלחה!', 'success');
      closeEditTagsModal();

      // Refresh the recipe modal and recipes list
      openRecipe(currentRecipeId);
      renderRecipes();
    } catch (error) {
      console.error('Save tags failed:', error);
      showToast('שגיאה בשמירת התגיות', 'error');
    }

    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
    saveBtn.disabled = false;
  }

  // Recipe extraction function
  async function extractRecipeFromUrl() {
    if (!currentRecipeId || !canEdit) return;

    const recipe = recipes.find(r => r.id === currentRecipeId);
    if (!recipe || !recipe.content?.url) return;

    const url = recipe.content.url;
    const extractBtn = document.querySelector('.extract-recipe-btn');

    if (extractBtn) {
      extractBtn.disabled = true;
      extractBtn.textContent = '⏳ מחלץ...';
    }

    try {
      // Use a CORS proxy to fetch the page
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      const data = await response.json();

      if (!data.contents) {
        throw new Error('Failed to fetch page content');
      }

      // Parse the HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(data.contents, 'text/html');

      // Try to extract recipe content
      let recipeText = extractRecipeContent(doc, url);

      if (recipeText && recipeText.trim().length > 50) {
        // Save the extracted text
        if (!recipe.content) recipe.content = {};
        recipe.content.transcription = recipeText;

        await db.collection('recipes').doc(currentRecipeId).update({
          'content.transcription': recipeText
        });

        showToast('המתכון חולץ בהצלחה!', 'success');
        openRecipe(currentRecipeId); // Refresh modal
      } else {
        showToast('לא הצלחנו לחלץ את המתכון. נסה העלאה ידנית.', 'error');
        if (extractBtn) {
          extractBtn.disabled = false;
          extractBtn.textContent = '🔄 חלץ מתכון מהאתר';
        }
      }
    } catch (error) {
      console.error('Extraction failed:', error);
      showToast('שגיאה בחילוץ המתכון. נסה העלאה ידנית.', 'error');
      if (extractBtn) {
        extractBtn.disabled = false;
        extractBtn.textContent = '🔄 חלץ מתכון מהאתר';
      }
    }
  }

  // Extract recipe content from parsed HTML
  function extractRecipeContent(doc, url) {
    let text = '';

    // Try structured recipe data first (JSON-LD)
    const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse(script.textContent);
        const recipeData = findRecipeInJsonLd(data);
        if (recipeData) {
          text = formatRecipeFromJsonLd(recipeData);
          if (text) return text;
        }
      } catch (e) {
        // Continue to next method
      }
    }

    // Site-specific selectors
    const domain = getDomainFromUrl(url);

    // Common recipe selectors for different sites
    const selectors = getRecipeSelectors(domain);

    for (const selector of selectors) {
      const element = doc.querySelector(selector);
      if (element) {
        text = cleanRecipeText(element.innerText || element.textContent);
        if (text.length > 100) return text;
      }
    }

    // Fallback: try to find ingredient and instruction lists
    const ingredients = [];
    const instructions = [];

    // Look for ingredient patterns
    const ingredientElements = doc.querySelectorAll('[class*="ingredient"], [class*="Ingredient"], li[itemprop="recipeIngredient"]');
    ingredientElements.forEach(el => {
      const text = (el.innerText || el.textContent).trim();
      if (text && text.length > 2 && text.length < 200) {
        ingredients.push(text);
      }
    });

    // Look for instruction patterns
    const instructionElements = doc.querySelectorAll('[class*="instruction"], [class*="Instruction"], [class*="direction"], [class*="step"], li[itemprop="recipeInstructions"]');
    instructionElements.forEach(el => {
      const text = (el.innerText || el.textContent).trim();
      if (text && text.length > 10) {
        instructions.push(text);
      }
    });

    if (ingredients.length > 0 || instructions.length > 0) {
      if (ingredients.length > 0) {
        text = 'מרכיבים:\n' + ingredients.join('\n') + '\n\n';
      }
      if (instructions.length > 0) {
        text += 'הוראות הכנה:\n' + instructions.join('\n');
      }
      return text;
    }

    // Last resort: get main content
    const mainContent = doc.querySelector('article, main, .content, .post-content, .entry-content');
    if (mainContent) {
      return cleanRecipeText(mainContent.innerText || mainContent.textContent);
    }

    return '';
  }

  // Find recipe data in JSON-LD (handles nested structures)
  function findRecipeInJsonLd(data) {
    if (!data) return null;

    if (Array.isArray(data)) {
      for (const item of data) {
        const result = findRecipeInJsonLd(item);
        if (result) return result;
      }
      return null;
    }

    if (typeof data === 'object') {
      if (data['@type'] === 'Recipe' || (Array.isArray(data['@type']) && data['@type'].includes('Recipe'))) {
        return data;
      }

      // Check @graph
      if (data['@graph']) {
        return findRecipeInJsonLd(data['@graph']);
      }
    }

    return null;
  }

  // Format recipe from JSON-LD structured data
  function formatRecipeFromJsonLd(recipe) {
    let text = '';

    // Description
    if (recipe.description) {
      text += recipe.description + '\n\n';
    }

    // Prep/Cook time
    const times = [];
    if (recipe.prepTime) times.push(`זמן הכנה: ${formatDuration(recipe.prepTime)}`);
    if (recipe.cookTime) times.push(`זמן בישול: ${formatDuration(recipe.cookTime)}`);
    if (recipe.totalTime) times.push(`זמן כולל: ${formatDuration(recipe.totalTime)}`);
    if (times.length > 0) {
      text += times.join(' | ') + '\n\n';
    }

    // Servings
    if (recipe.recipeYield) {
      text += `מנות: ${Array.isArray(recipe.recipeYield) ? recipe.recipeYield[0] : recipe.recipeYield}\n\n`;
    }

    // Ingredients
    if (recipe.recipeIngredient && recipe.recipeIngredient.length > 0) {
      text += 'מרכיבים:\n';
      recipe.recipeIngredient.forEach(ing => {
        text += `• ${ing}\n`;
      });
      text += '\n';
    }

    // Instructions
    if (recipe.recipeInstructions) {
      text += 'הוראות הכנה:\n';
      const instructions = Array.isArray(recipe.recipeInstructions) ? recipe.recipeInstructions : [recipe.recipeInstructions];

      instructions.forEach((step, idx) => {
        if (typeof step === 'string') {
          text += `${idx + 1}. ${step}\n`;
        } else if (step.text) {
          text += `${idx + 1}. ${step.text}\n`;
        } else if (step['@type'] === 'HowToSection' && step.itemListElement) {
          text += `\n${step.name || ''}:\n`;
          step.itemListElement.forEach((subStep, subIdx) => {
            const stepText = typeof subStep === 'string' ? subStep : subStep.text;
            if (stepText) text += `${subIdx + 1}. ${stepText}\n`;
          });
        }
      });
    }

    return text.trim();
  }

  // Format ISO duration to readable format
  function formatDuration(duration) {
    if (!duration) return '';
    // PT30M -> 30 דקות, PT1H30M -> שעה ו-30 דקות
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return duration;

    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);

    const parts = [];
    if (hours > 0) parts.push(`${hours} שעות`);
    if (minutes > 0) parts.push(`${minutes} דקות`);

    return parts.join(' ו-') || duration;
  }

  // Get site-specific selectors
  function getRecipeSelectors(domain) {
    const siteSelectors = {
      'oogio.net': ['.wprm-recipe-container', '.recipe-container', '.entry-content'],
      'heninthekitchen.com': ['.recipe-content', '.entry-content', 'article'],
      'lichtenstadt.com': ['.recipe-card', '.entry-content', 'article'],
      'carine.co.il': ['.recipe-content', '.entry-content', '.post-content'],
      'bakery365.co.il': ['.recipe-section', '.recipe-content', '.entry-content'],
      'hashulchan.co.il': ['.recipe-content', '.article-content'],
      'foodish.co.il': ['.recipe-body', '.entry-content'],
      'gilmoran.com': ['.recipe-content', '.entry-content'],
      '10dakot.co.il': ['.recipe-content', '.entry-content']
    };

    // Common selectors that work on most recipe sites
    const commonSelectors = [
      '.wprm-recipe-container',
      '.recipe-content',
      '.recipe-container',
      '[itemtype*="Recipe"]',
      '.tasty-recipes',
      '.mv-recipe',
      '.entry-content .recipe',
      'article .recipe'
    ];

    return [...(siteSelectors[domain] || []), ...commonSelectors];
  }

  // Clean extracted text
  function cleanRecipeText(text) {
    if (!text) return '';

    return text
      .replace(/\s+/g, ' ')        // Normalize whitespace
      .replace(/\n\s*\n/g, '\n\n') // Remove excessive newlines
      .replace(/^\s+|\s+$/g, '')   // Trim
      .replace(/Share.*?Facebook|Tweet|Pinterest|Print|Email/gi, '') // Remove social buttons
      .replace(/\d+ תגובות?/g, '') // Remove comment counts
      .replace(/קראו עוד|המשך קריאה/g, '') // Remove "read more"
      .trim();
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
