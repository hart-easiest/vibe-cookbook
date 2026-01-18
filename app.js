// Tal's Cookbook App
(function() {
  'use strict';

  // State
  let recipes = [];
  let categories = [];
  let currentCategory = 'all';
  let searchQuery = '';

  // DOM Elements
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search');
  const categoriesNav = document.getElementById('categories-nav');
  const recipesContainer = document.getElementById('recipes-container');
  const recipeCount = document.getElementById('recipe-count');
  const modal = document.getElementById('recipe-modal');
  const modalBody = document.getElementById('modal-body');
  const modalClose = document.getElementById('modal-close');
  const loading = document.getElementById('loading');

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

    try {
      const response = await fetch('recipes.json');
      const data = await response.json();
      recipes = data.recipes;
      categories = data.categories;

      renderCategories();
      renderRecipes();
      setupEventListeners();
    } catch (error) {
      console.error('Failed to load recipes:', error);
      recipesContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">😕</div>
          <p class="empty-state-text">לא הצלחנו לטעון את המתכונים</p>
        </div>
      `;
    }

    showLoading(false);
  }

  // Show/hide loading
  function showLoading(show) {
    loading.classList.toggle('active', show);
    recipesContainer.style.display = show ? 'none' : 'grid';
  }

  // Render categories
  function renderCategories() {
    // Keep the "All" button
    const allBtn = categoriesNav.querySelector('[data-category="all"]');

    // Add category buttons
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

  // Get filtered recipes
  function getFilteredRecipes() {
    return recipes.filter(recipe => {
      // Category filter
      const categoryMatch = currentCategory === 'all' || recipe.category === currentCategory;

      // Search filter
      let searchMatch = true;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = recipe.name.toLowerCase().includes(query);
        const notesMatch = recipe.notes && recipe.notes.toLowerCase().includes(query);
        const textMatch = recipe.content.text && recipe.content.text.toLowerCase().includes(query);
        searchMatch = nameMatch || notesMatch || textMatch;
      }

      return categoryMatch && searchMatch;
    });
  }

  // Render recipes
  function renderRecipes() {
    const filtered = getFilteredRecipes();

    // Update count
    const categoryName = currentCategory === 'all'
      ? 'הכל'
      : categories.find(c => c.id === currentCategory)?.name || '';
    recipeCount.textContent = `${filtered.length} מתכונים ${categoryName ? 'ב' + categoryName : ''}`;

    // Empty state
    if (filtered.length === 0) {
      recipesContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <p class="empty-state-text">לא נמצאו מתכונים</p>
        </div>
      `;
      return;
    }

    // Render cards
    recipesContainer.innerHTML = filtered.map(recipe => {
      const category = categories.find(c => c.id === recipe.category);
      const type = typeInfo[recipe.type] || typeInfo.link;
      const hasImage = recipe.content.images && recipe.content.images.length > 0;
      const imageFile = hasImage ? recipe.content.images[0] : null;
      const isDocx = imageFile && imageFile.endsWith('.docx');

      return `
        <article class="recipe-card" data-id="${recipe.id}">
          ${hasImage && !isDocx
            ? `<img src="images/${imageFile}" alt="${recipe.name}" class="recipe-image" loading="lazy" onerror="this.classList.add('placeholder'); this.src=''; this.textContent='${category?.icon || '🍽️'}';">`
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

    const category = categories.find(c => c.id === recipe.category);
    const type = typeInfo[recipe.type] || typeInfo.link;
    const date = formatDate(recipe.date);

    let contentHtml = '';

    // Images
    if (recipe.content.images && recipe.content.images.length > 0) {
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
    if (recipe.type === 'video' && recipe.content.url) {
      const embedHtml = getVideoEmbed(recipe.content);
      if (embedHtml) {
        contentHtml += embedHtml;
      } else {
        contentHtml += `
          <div class="video-fallback">
            <div class="video-fallback-icon">🎬</div>
            <p>הסרטון לא ניתן להטמעה ישירה</p>
            <a href="${recipe.content.url}" target="_blank" rel="noopener" class="open-link-btn">
              📱 פתח באפליקציה
            </a>
          </div>
        `;
      }
    }

    // Text content
    if (recipe.content.text) {
      contentHtml += `<div class="modal-text">${escapeHtml(recipe.content.text)}</div>`;
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
    if (recipe.content.url && recipe.type !== 'video') {
      contentHtml += `
        <a href="${recipe.content.url}" target="_blank" rel="noopener" class="open-link-btn">
          🔗 לצפייה במתכון המלא
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

  // Close modal
  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Get video embed HTML
  function getVideoEmbed(content) {
    const url = content.url;

    // YouTube
    if (content.embedUrl && content.embedUrl.includes('youtube')) {
      return `
        <div class="video-container">
          <iframe src="${content.embedUrl}" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
        </div>
      `;
    }

    // YouTube from URL
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (ytMatch) {
      return `
        <div class="video-container">
          <iframe src="https://www.youtube.com/embed/${ytMatch[1]}" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
        </div>
      `;
    }

    // Instagram - can't embed directly, show fallback
    // Facebook - can't embed directly, show fallback

    return null;
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

      // Update active state
      categoriesNav.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Filter
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

    // Modal close
    modalClose.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeModal();
      }
    });

    // Image gallery click to fullscreen
    modalBody.addEventListener('click', (e) => {
      if (e.target.tagName === 'IMG' && e.target.closest('.images-gallery')) {
        window.open(e.target.src, '_blank');
      }
    });
  }

  // Start app
  document.addEventListener('DOMContentLoaded', init);
})();
