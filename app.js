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

  // State
  let recipes = [];
  let categories = [];
  let currentCategory = 'all';
  let searchQuery = '';
  let currentRecipeId = null;
  let currentFormTab = 'link';
  let isInitialized = false;

  // Categories definition
  const CATEGORIES = [
    { id: 'desserts', name: 'קינוחים ועוגות', icon: '🍰' },
    { id: 'cookies', name: 'עוגיות', icon: '🍪' },
    { id: 'main', name: 'מנות עיקריות', icon: '🍲' },
    { id: 'baby', name: 'אוכל לתינוקות', icon: '👶' },
    { id: 'breakfast', name: 'ארוחת בוקר', icon: '🍳' },
    { id: 'yeast', name: 'מאפי שמרים', icon: '🥐' },
    { id: 'soups', name: 'מרקים', icon: '🥣' },
    { id: 'salads', name: 'סלטים ותוספות', icon: '🥗' },
    { id: 'muffins', name: 'מאפינס', icon: '🧁' },
    { id: 'savory', name: 'מאפים מלוחים', icon: '🥧' },
    { id: 'spreads', name: 'ממרחים ורטבים', icon: '🫙' }
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

  // Render categories
  function renderCategories() {
    const existingBtns = categoriesNav.querySelectorAll('.category-btn:not([data-category="all"])');
    existingBtns.forEach(btn => btn.remove());

    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'category-btn';
      btn.dataset.category = cat.id;
      btn.innerHTML = `
        <span class="category-icon">${cat.icon}</span>
        <span class="category-name">${cat.name}</span>
      `;
      categoriesNav.appendChild(btn);
    });
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
      const categoryMatch = currentCategory === 'all' || recipe.category === currentCategory;

      let searchMatch = true;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = recipe.name?.toLowerCase().includes(query);
        const notesMatch = recipe.notes?.toLowerCase().includes(query);
        const textMatch = recipe.content?.text?.toLowerCase().includes(query);
        searchMatch = nameMatch || notesMatch || textMatch;
      }

      return categoryMatch && searchMatch;
    });
  }

  // Render recipes
  function renderRecipes() {
    const filtered = getFilteredRecipes();

    const categoryName = currentCategory === 'all'
      ? 'הכל'
      : categories.find(c => c.id === currentCategory)?.name || '';
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
      const category = categories.find(c => c.id === recipe.category);
      const type = typeInfo[recipe.type] || typeInfo.link;
      const hasImage = recipe.content?.images && recipe.content.images.length > 0;
      const imageFile = hasImage ? recipe.content.images[0] : null;
      const isDocx = imageFile && imageFile.endsWith('.docx');

      return `
        <article class="recipe-card" data-id="${recipe.id}">
          ${hasImage && !isDocx
            ? `<img src="images/${imageFile}" alt="${recipe.name}" class="recipe-image" loading="lazy" onerror="this.classList.add('placeholder'); this.outerHTML='<div class=\\'recipe-image placeholder\\'>${category?.icon || '🍽️'}</div>';">`
            : `<div class="recipe-image placeholder">${category?.icon || '🍽️'}</div>`
          }
          <div class="recipe-info">
            <h2 class="recipe-name">${recipe.name}</h2>
            <div class="recipe-meta">
              <span class="recipe-tag type-${recipe.type}">${type.icon} ${type.label}</span>
              <span class="recipe-tag">${category?.icon || ''} ${category?.name || ''}</span>
            </div>
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

    // Images
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

    // Transcription or button to add one (for videos)
    if (recipe.content?.transcription) {
      contentHtml += `
        <div class="transcription-box">
          <h4>📝 תמלול הסרטון</h4>
          <p>${escapeHtml(recipe.content.transcription)}</p>
          <button class="add-transcription-btn" data-action="edit-transcription" style="margin-top: 12px; background: #64748b;">
            ✏️ ערוך תמלול
          </button>
        </div>
      `;
    } else if (recipe.type === 'video') {
      contentHtml += `
        <button class="add-transcription-btn" data-action="add-transcription">
          📝 הוסף תמלול
        </button>
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

      // Generate ID
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

  // Setup event listeners
  function setupEventListeners() {
    // Category buttons
    categoriesNav.addEventListener('click', (e) => {
      const btn = e.target.closest('.category-btn');
      if (!btn) return;

      categoriesNav.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      currentCategory = btn.dataset.category;
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
      } else {
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

      await addRecipe(formData);
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (settingsModal.classList.contains('active')) {
          closeSettingsModal();
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

    // Transcription button in recipe modal
    modalBody.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      if (action === 'add-transcription' || action === 'edit-transcription') {
        openTranscriptionModal();
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
      showToast('נא להזין תמלול', 'error');
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

      showToast('התמלול נשמר בהצלחה!', 'success');
      closeTranscriptionModal();

      // Refresh the recipe modal
      openRecipe(currentRecipeId);
    } catch (error) {
      console.error('Save transcription failed:', error);
      showToast('שגיאה בשמירת התמלול', 'error');
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
