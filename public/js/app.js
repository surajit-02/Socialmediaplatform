/**
 * Nexus — Single Page Social Media App Engine
 */

// Application State
const state = {
  currentUser: null,
  token: localStorage.getItem('nexus_token') || null,
  allUsers: [],
  currentTab: 'feed',
  currentFilter: 'all',
  searchQuery: '',
  posts: [],
  activeProfileUser: null,
  pendingPostMedia: null,
  pendingProfileAvatar: null,
  pendingProfileCover: null,
  theme: localStorage.getItem('nexus_theme_v2') || 'light',
  activeTrendingTag: '#Glassmorphism',
  trendingTopics: [
    { tag: '#Glassmorphism', desc: 'Design trends & UI/UX glass aesthetics', count: 1420 },
    { tag: '#JavaScript', desc: 'JS, Async/Await, ESNext & Node.js ecosystem', count: 3850 },
    { tag: '#ExpressJS', desc: 'REST APIs, Express middleware & microservices', count: 920 },
    { tag: '#MongoDB', desc: 'Mongoose ORM, Mongo Atlas & Database design', count: 2150 },
    { tag: '#WebDev', desc: 'Frontend frameworks, CSS grid & modern layouts', count: 4120 },
    { tag: '#AI', desc: 'AI assistant integration & machine learning models', count: 5300 }
  ]
};

// DOM Element References
const DOM = {
  // Navigation & Header
  logoBtn: document.getElementById('logo-btn'),
  searchBox: document.querySelector('.search-box'),
  searchInput: document.getElementById('search-input'),
  clearSearchBtn: document.getElementById('clear-search-btn'),
  searchDropdown: document.getElementById('search-dropdown'),
  headerCreatePostBtn: document.getElementById('header-create-post-btn'),
  userHeaderAuthSlot: document.getElementById('user-header-auth-slot'),

  // Sidebars
  sidebarUserCard: document.getElementById('sidebar-user-card'),
  navLinks: document.querySelectorAll('.nav-link'),
  suggestedUsersList: document.getElementById('suggested-users-list'),

  // Composer & Create Post Modal
  createPostModal: document.getElementById('create-post-modal'),
  closeCreatePostModalBtn: document.getElementById('close-create-post-modal-btn'),
  cancelCreatePostBtn: document.getElementById('cancel-create-post-btn'),
  composerAvatar: document.getElementById('composer-avatar'),
  composerUserName: document.getElementById('composer-user-name'),
  postContentInput: document.getElementById('post-content-input'),
  toggleImageBtn: document.getElementById('toggle-image-btn'),
  postMediaFile: document.getElementById('post-media-file'),
  mediaPreviewContainer: document.getElementById('media-preview-container'),
  mediaPreviewImg: document.getElementById('media-preview-img'),
  mediaPreviewVideo: document.getElementById('media-preview-video'),
  removeMediaBtn: document.getElementById('remove-media-btn'),
  submitPostBtn: document.getElementById('submit-post-btn'),

  // Feed
  feedTitle: document.getElementById('feed-title'),
  feedCountBadge: document.getElementById('feed-count-badge'),
  filterPills: document.querySelectorAll('.filter-pill'),
  postsContainer: document.getElementById('posts-container'),

  // Modals
  profileModal: document.getElementById('profile-modal'),
  closeProfileModalBtn: document.getElementById('close-profile-modal-btn'),
  profileModalContent: document.getElementById('profile-modal-content'),

  editProfileModal: document.getElementById('edit-profile-modal'),
  closeEditModalBtn: document.getElementById('close-edit-modal-btn'),
  cancelEditBtn: document.getElementById('cancel-edit-btn'),
  editProfileForm: document.getElementById('edit-profile-form'),
  editAvatarPreview: document.getElementById('edit-avatar-preview'),
  editAvatarFile: document.getElementById('edit-avatar-file'),
  editCoverFile: document.getElementById('edit-cover-file'),

  userListModal: document.getElementById('user-list-modal'),
  closeUserListModalBtn: document.getElementById('close-user-list-modal-btn'),
  userListModalTitle: document.getElementById('user-list-modal-title'),
  userListModalBody: document.getElementById('user-list-modal-body'),

  authModal: document.getElementById('auth-modal'),
  closeAuthModalBtn: document.getElementById('close-auth-modal-btn'),
  authTabLogin: document.getElementById('auth-tab-login'),
  authTabRegister: document.getElementById('auth-tab-register'),
  loginForm: document.getElementById('login-form'),
  registerForm: document.getElementById('register-form'),

  toastContainer: document.getElementById('toast-container')
};

// API Client Helper
async function apiRequest(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  try {
    const res = await fetch(url, { ...options, headers });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'API Request failed');
    }
    return data;
  } catch (err) {
    console.error(`API Error (${url}):`, err.message);
    throw err;
  }
}

// Format relative time helper
function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Toast Notifications Helper
function showToast(message, type = 'success') {
  const container = DOM.toastContainer || document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Theme Toggle Helper
function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('nexus_theme_v2', theme);

  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    themeBtn.innerHTML = theme === 'light' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    themeBtn.setAttribute('title', `Switch to ${theme === 'light' ? 'Dark' : 'Light'} Theme`);
  }
}

// Initialize Application
async function initApp() {
  applyTheme(state.theme);
  bindEvents();
  await loadAllUsers();
  await checkAuthSession();
  await loadFeed();
}

// Bind Global Event Listeners
function bindEvents() {
  // Theme Toggle Event
  document.getElementById('theme-toggle-btn')?.addEventListener('click', () => {
    const nextTheme = state.theme === 'light' ? 'dark' : 'light';
    applyTheme(nextTheme);
    showToast(`Switched to ${nextTheme === 'light' ? 'Light' : 'Dark'} mode`, 'success');
  });

  // Mobile Drawer Events
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileBackdrop = document.getElementById('mobile-sidebar-backdrop');
  const sidebarLeft = document.getElementById('sidebar-left');
  const closeMobileSidebarBtn = document.getElementById('close-mobile-sidebar-btn');

  const closeMobileDrawer = () => {
    sidebarLeft?.classList.remove('mobile-open');
    mobileBackdrop?.classList.add('hidden');
  };

  mobileMenuBtn?.addEventListener('click', () => {
    sidebarLeft?.classList.add('mobile-open');
    mobileBackdrop?.classList.remove('hidden');
  });

  closeMobileSidebarBtn?.addEventListener('click', closeMobileDrawer);
  mobileBackdrop?.addEventListener('click', closeMobileDrawer);

  // Mobile Bottom Navigation Buttons
  document.querySelectorAll('.mobile-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const tab = item.getAttribute('data-tab');
      switchTab(tab);
    });
  });

  // Live User & Post Search Listeners
  DOM.searchInput?.addEventListener('input', (e) => {
    handleSearchInput(e.target.value);
  });

  DOM.clearSearchBtn?.addEventListener('click', () => {
    if (DOM.searchInput) DOM.searchInput.value = '';
    handleSearchInput('');
  });

  // Close search dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (DOM.searchBox && !DOM.searchBox.contains(e.target)) {
      DOM.searchDropdown?.classList.add('hidden');
    }
  });

  // Navigation Links
  DOM.navLinks.forEach(link => {
    link.addEventListener('click', () => {
      const tab = link.getAttribute('data-tab');
      switchTab(tab);
    });
  });

  DOM.logoBtn.addEventListener('click', (e) => {
    e.preventDefault();
    switchTab('feed');
  });

  // Filter Pills
  DOM.filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      DOM.filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.currentFilter = pill.getAttribute('data-filter');
      renderPosts();
    });
  });

  // Trending Topics Click
  document.querySelectorAll('.trending-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const tag = item.getAttribute('data-search');
      state.activeTrendingTag = tag;
      switchTab('trending');
    });
  });

  // Post Composer Media Upload (Device File Picker)
  DOM.toggleImageBtn.addEventListener('click', () => {
    if (!state.currentUser) {
      openModal(DOM.authModal);
      showToast('Please sign in to create posts', 'error');
      return;
    }
    DOM.postMediaFile.click();
  });

  DOM.postMediaFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      state.pendingPostMedia = {
        dataUrl,
        mediaType: isVideo ? 'video' : 'image'
      };

      DOM.mediaPreviewContainer.classList.remove('hidden');
      if (isVideo) {
        DOM.mediaPreviewVideo.src = dataUrl;
        DOM.mediaPreviewVideo.classList.remove('hidden');
        DOM.mediaPreviewImg.classList.add('hidden');
      } else {
        DOM.mediaPreviewImg.src = dataUrl;
        DOM.mediaPreviewImg.classList.remove('hidden');
        DOM.mediaPreviewVideo.classList.add('hidden');
      }
    };
    reader.readAsDataURL(file);
  });

  DOM.removeMediaBtn.addEventListener('click', () => {
    state.pendingPostMedia = null;
    DOM.postMediaFile.value = '';
    DOM.mediaPreviewContainer.classList.add('hidden');
    DOM.mediaPreviewImg.classList.add('hidden');
    DOM.mediaPreviewVideo.classList.add('hidden');
    DOM.mediaPreviewImg.src = '';
    DOM.mediaPreviewVideo.src = '';
  });

  DOM.postContentInput.addEventListener('focus', () => {
    if (!state.currentUser) {
      DOM.postContentInput.blur();
      openModal(DOM.authModal);
      showToast('Please sign in to create posts', 'error');
    }
  });

  DOM.submitPostBtn.addEventListener('click', handleCreatePost);
  DOM.headerCreatePostBtn.addEventListener('click', openCreatePostModal);

  // Profile Edit Photo File Pickers
  DOM.editAvatarFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      state.pendingProfileAvatar = ev.target.result;
      DOM.editAvatarPreview.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  DOM.editCoverFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      state.pendingProfileCover = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  // Modals Close Listeners
  DOM.closeCreatePostModalBtn?.addEventListener('click', () => closeModal(DOM.createPostModal));
  DOM.cancelCreatePostBtn?.addEventListener('click', () => closeModal(DOM.createPostModal));
  DOM.closeProfileModalBtn.addEventListener('click', () => closeModal(DOM.profileModal));
  DOM.closeEditModalBtn.addEventListener('click', () => closeModal(DOM.editProfileModal));
  DOM.cancelEditBtn.addEventListener('click', () => closeModal(DOM.editProfileModal));
  DOM.closeUserListModalBtn.addEventListener('click', () => closeModal(DOM.userListModal));
  DOM.closeAuthModalBtn.addEventListener('click', () => closeModal(DOM.authModal));

  DOM.editProfileForm.addEventListener('submit', handleEditProfileSubmit);

  // Auth Modal Tabs & Forms
  DOM.authTabLogin.addEventListener('click', () => {
    DOM.authTabLogin.classList.add('active');
    DOM.authTabRegister.classList.remove('active');
    DOM.loginForm.classList.remove('hidden');
    DOM.registerForm.classList.add('hidden');
  });

  DOM.authTabRegister.addEventListener('click', () => {
    DOM.authTabRegister.classList.add('active');
    DOM.authTabLogin.classList.remove('active');
    DOM.registerForm.classList.remove('hidden');
    DOM.loginForm.classList.add('hidden');
  });

  DOM.loginForm.addEventListener('submit', handleLogin);
  DOM.registerForm.addEventListener('submit', handleRegister);
}

let debounceTimer = null;
function debounceLoadFeed() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    loadFeed();
  }, 300);
}

// Modal Helpers
function openModal(modal) {
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
  modal.classList.add('hidden');
  document.body.style.overflow = 'auto';
}

// Switch Navigation Tab
function switchTab(tab) {
  if (tab === 'following' && !state.currentUser) {
    state.pendingAuthAction = { type: 'following_feed' };
    openModal(DOM.authModal);
    showToast('Please sign in to view your following feed', 'error');
    return;
  }

  if (tab === 'profile') {
    if (state.currentUser) {
      openProfileModalByUsername(state.currentUser.username);
    } else {
      state.pendingAuthAction = { type: 'profile' };
      openModal(DOM.authModal);
      showToast('Please sign in to view your profile', 'error');
    }
    return;
  }

  state.currentTab = tab;

  // Update active state on desktop sidebar nav links
  DOM.navLinks.forEach(link => {
    if (link.getAttribute('data-tab') === tab) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Update active state on mobile bottom nav bar items
  document.querySelectorAll('.mobile-nav-item').forEach(item => {
    if (item.getAttribute('data-tab') === tab) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Close mobile drawer if open
  document.getElementById('sidebar-left')?.classList.remove('mobile-open');
  document.getElementById('mobile-sidebar-backdrop')?.classList.add('hidden');

  // Update Header Title
  if (tab === 'feed') DOM.feedTitle.innerText = 'Home Feed';
  if (tab === 'trending') DOM.feedTitle.innerText = 'Trending Topics & Discussions';
  if (tab === 'following') DOM.feedTitle.innerText = 'Following Feed';
  if (tab === 'explore') DOM.feedTitle.innerText = 'Explore Creators & Posts';

  if (tab === 'trending') {
    loadTrendingPage();
  } else {
    loadFeed();
  }
}

// Dedicated Trending Page Controller
async function loadTrendingPage(selectedTag = null) {
  if (selectedTag) {
    state.activeTrendingTag = selectedTag;
  }

  DOM.postsContainer.innerHTML = `
    <div class="skeleton-loader">
      <div class="skeleton skeleton-avatar"></div>
      <div class="skeleton-lines">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-rect"></div>
      </div>
    </div>
  `;

  try {
    const rawTag = state.activeTrendingTag.replace('#', '');
    const url = `/api/posts?search=${encodeURIComponent(rawTag)}`;
    const topicPosts = await apiRequest(url);

    DOM.postsContainer.innerHTML = `
      <div class="glass-card" style="padding: 20px; margin-bottom: 20px;">
        <h2 style="font-family: var(--font-heading); font-size: 1.25rem; font-weight: 700; margin-bottom: 8px;">
          <i class="fa-solid fa-fire-flame-curated accent-text"></i> Explore Popular Topics
        </h2>
        <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 16px;">
          Click any topic below to view related posts and discussions from the community.
        </p>

        <div class="trending-topics-grid">
          ${state.trendingTopics.map(topic => `
            <div class="topic-card ${topic.tag === state.activeTrendingTag ? 'active' : ''}" data-tag="${topic.tag}">
              <div class="topic-card-tag">${topic.tag}</div>
              <div class="topic-card-desc">${topic.desc}</div>
              <div class="topic-card-count"><i class="fa-solid fa-fire"></i> ${topic.count.toLocaleString()} posts</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="feed-tabs-bar" style="margin-bottom: 14px; padding: 0 4px;">
        <h3 style="font-family: var(--font-heading); font-size: 1.1rem; font-weight: 700;">
          Posts tagged with <span class="accent-text">${state.activeTrendingTag}</span>
        </h3>
        <span class="feed-count-badge">${topicPosts.length} posts</span>
      </div>

      <div id="trending-posts-list" class="posts-container"></div>
    `;

    // Bind topic card click events
    document.querySelectorAll('.topic-card').forEach(card => {
      card.addEventListener('click', () => {
        const tag = card.getAttribute('data-tag');
        loadTrendingPage(tag);
      });
    });

    const listWrap = document.getElementById('trending-posts-list');
    if (topicPosts.length === 0) {
      listWrap.innerHTML = `
        <div class="glass-card" style="padding: 30px; text-align: center; color: var(--text-muted);">
          <i class="fa-solid fa-comments-question" style="font-size: 2.2rem; margin-bottom: 10px; opacity: 0.5;"></i>
          <p style="font-size: 0.95rem;">No posts specifically mentioning <strong>${state.activeTrendingTag}</strong> yet.</p>
          <p style="font-size: 0.85rem; margin-top: 4px;">Be the first creator to post about this topic!</p>
        </div>
      `;
    } else {
      topicPosts.forEach(post => {
        listWrap.appendChild(createPostCardElement(post));
      });
    }

    DOM.feedCountBadge.innerText = `${topicPosts.length} posts`;

  } catch (err) {
    DOM.postsContainer.innerHTML = `
      <div class="glass-card" style="padding: 30px; text-align: center; color: var(--like-color);">
        <p>Failed to load trending topics.</p>
      </div>
    `;
  }
}

// Fetch All Registered Users
async function loadAllUsers() {
  try {
    state.allUsers = await apiRequest('/api/users');
    renderSuggestedUsers();
  } catch (err) {
    console.error('Failed to load users');
  }
}

// Check auth session
async function checkAuthSession() {
  if (state.token) {
    try {
      state.currentUser = await apiRequest('/api/auth/me');
    } catch (err) {
      state.token = null;
      state.currentUser = null;
      localStorage.removeItem('nexus_token');
    }
  } else {
    state.currentUser = null;
  }

  updateUIForUser();
}

// Update UI based on active user state
function updateUIForUser() {
  renderSidebarUserCard();

  if (state.currentUser) {
    DOM.composerAvatar.src = state.currentUser.avatar;
    DOM.userHeaderAuthSlot.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <div class="user-header-profile" style="display: flex; align-items: center; gap: 10px; cursor: pointer;" id="header-user-btn" title="View Profile">
          <img src="${state.currentUser.avatar}" class="avatar avatar-md" alt="${state.currentUser.name}">
          <span class="hide-mobile user-header-name">${state.currentUser.name}</span>
        </div>
        <button class="btn btn-secondary btn-sm" id="header-logout-btn" title="Log Out">
          <i class="fa-solid fa-right-from-bracket"></i> <span class="hide-mobile">Logout</span>
        </button>
      </div>
    `;

    document.getElementById('header-user-btn')?.addEventListener('click', () => {
      openProfileModalByUsername(state.currentUser.username);
    });

    document.getElementById('header-logout-btn')?.addEventListener('click', handleLogout);
  } else {
    DOM.composerAvatar.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';
    DOM.userHeaderAuthSlot.innerHTML = `
      <button class="btn btn-secondary btn-sm" id="header-login-btn">Sign In</button>
    `;
    document.getElementById('header-login-btn')?.addEventListener('click', () => {
      openModal(DOM.authModal);
    });
  }
}

// Handle User Logout
async function handleLogout() {
  state.token = null;
  state.currentUser = null;
  localStorage.removeItem('nexus_token');

  // Reset tab to home feed if currently on a protected or user view
  state.currentTab = 'feed';
  DOM.navLinks.forEach(link => {
    if (link.getAttribute('data-tab') === 'feed') {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
  document.querySelectorAll('.mobile-nav-item').forEach(item => {
    if (item.getAttribute('data-tab') === 'feed') {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });
  if (DOM.feedTitle) DOM.feedTitle.innerText = 'Home Feed';

  // Close any open modals
  closeModal(DOM.profileModal);
  closeModal(DOM.editProfileModal);
  closeModal(DOM.createPostModal);
  closeModal(DOM.userListModal);

  // Update UI components reactively
  updateUIForUser();
  await loadAllUsers();
  await loadFeed();

  // Show Auth Modal & Notification
  openModal(DOM.authModal);
  showToast('Logged out successfully', 'success');
}

// Render Left Sidebar User Card
function renderSidebarUserCard() {
  if (!state.currentUser) {
    DOM.sidebarUserCard.innerHTML = `
      <div style="padding: 20px; text-align: center;">
        <p style="color: var(--text-secondary); margin-bottom: 12px;">Sign in to unlock personalized feeds, post creation, and creator follows!</p>
        <button class="btn btn-primary btn-sm btn-full" id="sidebar-login-btn">Log In / Sign Up</button>
      </div>
    `;
    document.getElementById('sidebar-login-btn')?.addEventListener('click', () => openModal(DOM.authModal));
    return;
  }

  const u = state.currentUser;
  const followersCount = u.followers ? u.followers.length : 0;
  const followingCount = u.following ? u.following.length : 0;

  DOM.sidebarUserCard.innerHTML = `
    <div class="mini-card-cover" style="background-image: url('${u.coverImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe'}');"></div>
    <div class="mini-card-avatar-wrap">
      <img src="${u.avatar}" alt="${u.name}" class="avatar avatar-lg">
    </div>
    <div class="mini-card-body">
      <div class="mini-card-name">${u.name}</div>
      <div class="mini-card-handle">@${u.username}</div>
      <div class="mini-card-bio">${u.bio || 'No bio yet.'}</div>

      <div class="mini-card-stats">
        <div class="mini-stat-item" id="sidebar-stat-followers">
          <span class="mini-stat-value">${followersCount}</span>
          <span class="mini-stat-label">Followers</span>
        </div>
        <div class="mini-stat-item" id="sidebar-stat-following">
          <span class="mini-stat-value">${followingCount}</span>
          <span class="mini-stat-label">Following</span>
        </div>
      </div>

      <button class="btn btn-secondary btn-sm btn-full" id="sidebar-view-profile-btn">
        <i class="fa-solid fa-id-card"></i> View Full Profile
      </button>
    </div>
  `;

  document.getElementById('sidebar-view-profile-btn')?.addEventListener('click', () => {
    openProfileModalByUsername(u.username);
  });

  document.getElementById('sidebar-stat-followers')?.addEventListener('click', () => {
    openUserListModal(u._id, 'followers', `@${u.username}'s Followers`);
  });

  document.getElementById('sidebar-stat-following')?.addEventListener('click', () => {
    openUserListModal(u._id, 'following', `@${u.username} is Following`);
  });
}

// User & Creator Live Search Handler
async function handleSearchInput(query) {
  state.searchQuery = query.trim();

  if (state.searchQuery.length > 0) {
    if (DOM.clearSearchBtn) DOM.clearSearchBtn.classList.remove('hidden');
  } else {
    if (DOM.clearSearchBtn) DOM.clearSearchBtn.classList.add('hidden');
    if (DOM.searchDropdown) DOM.searchDropdown.classList.add('hidden');
    loadFeed();
    renderSuggestedUsers();
    return;
  }

  // Filter posts feed
  debounceLoadFeed();

  // Search creators/users via API
  try {
    const matchingUsers = await apiRequest(`/api/users?search=${encodeURIComponent(state.searchQuery)}`);
    renderSearchDropdown(matchingUsers);
    renderSuggestedUsers(matchingUsers);
  } catch (err) {
    console.error('User search error:', err);
  }
}

// Render Search Autocomplete Dropdown
function renderSearchDropdown(users) {
  if (!DOM.searchDropdown) return;

  if (users.length === 0) {
    DOM.searchDropdown.innerHTML = `
      <div class="search-dropdown-header">Creators & Users</div>
      <div style="padding: 10px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
        No creators found matching "${escapeHTML(state.searchQuery)}"
      </div>
    `;
    DOM.searchDropdown.classList.remove('hidden');
    return;
  }

  DOM.searchDropdown.innerHTML = `
    <div class="search-dropdown-header">Matching Creators (${users.length})</div>
  `;

  users.forEach(user => {
    const isFollowing = state.currentUser && state.currentUser.following
      ? state.currentUser.following.some(id => (typeof id === 'object' ? id._id.toString() : id.toString()) === user._id.toString())
      : false;
    const isSelf = state.currentUser && state.currentUser._id && (state.currentUser._id.toString() === user._id.toString());

    const item = document.createElement('div');
    item.className = 'search-user-item';
    item.innerHTML = `
      <div class="search-user-info">
        <img src="${user.avatar}" class="avatar avatar-md" alt="${user.name}">
        <div class="search-user-names">
          <span class="search-user-name">${escapeHTML(user.name)}</span>
          <span class="search-user-handle">@${escapeHTML(user.username)}</span>
        </div>
      </div>
      ${!isSelf ? `
        <button class="btn btn-sm ${isFollowing ? 'btn-secondary' : 'btn-primary'} search-follow-btn">
          ${isFollowing ? 'Following' : 'Follow'}
        </button>
      ` : `<span style="font-size: 0.75rem; color: var(--text-muted); padding-right: 6px;">(You)</span>`}
    `;

    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('search-follow-btn')) return;
      DOM.searchDropdown.classList.add('hidden');
      openProfileModalByUsername(user.username);
    });

    const followBtn = item.querySelector('.search-follow-btn');
    if (followBtn) {
      followBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFollowUser(user._id, followBtn);
      });
    }

    DOM.searchDropdown.appendChild(item);
  });

  DOM.searchDropdown.classList.remove('hidden');
}

// Render Right Sidebar "Who to Follow"
function renderSuggestedUsers(usersList = null) {
  if (!DOM.suggestedUsersList) return;
  DOM.suggestedUsersList.innerHTML = '';

  const sourceList = usersList || state.allUsers;
  const suggested = sourceList.filter(u => !state.currentUser || (u._id && state.currentUser._id && u._id.toString() !== state.currentUser._id.toString()));

  if (suggested.length === 0) {
    DOM.suggestedUsersList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">No creators found.</p>';
    return;
  }

  suggested.forEach(user => {
    const isFollowing = state.currentUser && state.currentUser.following
      ? state.currentUser.following.some(id => (typeof id === 'object' ? id._id.toString() : id.toString()) === user._id.toString())
      : false;

    const item = document.createElement('div');
    item.className = 'user-suggest-item';
    item.innerHTML = `
      <div class="user-suggest-info">
        <img src="${user.avatar}" class="avatar avatar-md" alt="${user.name}">
        <div class="user-suggest-names">
          <a href="#" class="user-suggest-name" data-username="${user.username}">${user.name}</a>
          <span class="user-suggest-handle">@${user.username}</span>
        </div>
      </div>
      <button class="btn btn-sm ${isFollowing ? 'btn-secondary' : 'btn-primary'} follow-btn" data-userid="${user._id}">
        ${isFollowing ? 'Following' : 'Follow'}
      </button>
    `;

    item.querySelector('.user-suggest-name').addEventListener('click', (e) => {
      e.preventDefault();
      openProfileModalByUsername(user.username);
    });

    item.querySelector('.follow-btn').addEventListener('click', (e) => {
      toggleFollowUser(user._id, e.target);
    });

    DOM.suggestedUsersList.appendChild(item);
  });
}

// Load Feed Posts
async function loadFeed() {
  DOM.postsContainer.innerHTML = `
    <div class="skeleton-loader">
      <div class="skeleton skeleton-avatar"></div>
      <div class="skeleton-lines">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-rect"></div>
      </div>
    </div>
  `;

  try {
    let url = '/api/posts?';
    if (state.currentTab === 'following') {
      url += 'feed=following&';
    }
    if (state.searchQuery) {
      url += `search=${encodeURIComponent(state.searchQuery)}&`;
    }

    state.posts = await apiRequest(url);
    renderPosts();
  } catch (err) {
    DOM.postsContainer.innerHTML = `
      <div class="glass-card" style="padding: 30px; text-align: center; color: var(--text-secondary);">
        <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; color: var(--like-color); margin-bottom: 10px;"></i>
        <p>Failed to load posts feed.</p>
      </div>
    `;
  }
}

// Render Feed Posts List
function renderPosts() {
  DOM.postsContainer.innerHTML = '';

  let filteredPosts = [...state.posts];
  if (state.currentFilter === 'media') {
    filteredPosts = filteredPosts.filter(p => p.image);
  }

  DOM.feedCountBadge.innerText = `${filteredPosts.length} posts`;

  if (filteredPosts.length === 0) {
    DOM.postsContainer.innerHTML = `
      <div class="glass-card" style="padding: 40px; text-align: center; color: var(--text-muted);">
        <i class="fa-solid fa-comments-question" style="font-size: 2.5rem; margin-bottom: 14px; opacity: 0.5;"></i>
        <h3>No posts found</h3>
        <p style="font-size: 0.9rem; margin-top: 6px;">Be the first to share something with the community!</p>
      </div>
    `;
    return;
  }

  filteredPosts.forEach(post => {
    const postEl = createPostCardElement(post);
    DOM.postsContainer.appendChild(postEl);
  });
}

// Build single post card DOM element
function createPostCardElement(post) {
  const card = document.createElement('article');
  card.className = 'glass-card post-card';
  card.id = `post-${post._id}`;

  const isOwner = state.currentUser && post.author && post.author._id && state.currentUser._id && (post.author._id.toString() === state.currentUser._id.toString());
  const timeAgo = formatTimeAgo(post.createdAt);

  card.innerHTML = `
    <div class="post-header">
      <div class="post-author-info">
        <img src="${post.author ? post.author.avatar : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb'}" alt="Avatar" class="avatar avatar-md post-author-avatar" style="cursor:pointer;">
        <div class="post-author-details">
          <a href="#" class="post-author-name">${post.author ? post.author.name : 'Anonymous'}</a>
          <span class="post-timestamp">@${post.author ? post.author.username : 'user'} • ${timeAgo}</span>
        </div>
      </div>
      ${isOwner ? `<button class="btn-delete-post" title="Delete post"><i class="fa-solid fa-trash-can"></i></button>` : ''}
    </div>

    <div class="post-text">${escapeHTML(post.content)}</div>

    ${post.image ? `
      <div class="post-media-wrapper">
        ${(post.mediaType === 'video' || (post.image && post.image.startsWith('data:video/')) || (post.image && post.image.match(/\.(mp4|webm|mov)$/i))) ? `
          <video src="${post.image}" controls playsinline class="post-media-video"></video>
        ` : `
          <img src="${post.image}" alt="Post attachment" loading="lazy">
        `}
      </div>
    ` : ''}

    <div class="post-footer">
      <button class="action-btn like-btn ${post.isLiked ? 'liked' : ''}">
        <i class="${post.isLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
        <span class="likes-count">${post.likesCount || 0}</span>
      </button>

      <button class="action-btn comment-toggle-btn">
        <i class="fa-regular fa-comment"></i>
        <span class="comments-count">${post.commentsCount || 0}</span>
      </button>
    </div>

    <div class="comments-section hidden">
      <div class="comment-input-box">
        <input type="text" placeholder="Write a comment..." class="comment-input">
        <button class="btn btn-sm btn-primary submit-comment-btn"><i class="fa-solid fa-paper-plane"></i></button>
      </div>
      <div class="comments-list">
        <!-- Comments loaded on toggle -->
      </div>
    </div>
  `;

  // Attach Event Handlers
  const authorAvatar = card.querySelector('.post-author-avatar');
  const authorName = card.querySelector('.post-author-name');
  const openAuthorProfile = (e) => {
    e.preventDefault();
    if (post.author && post.author.username) {
      openProfileModalByUsername(post.author.username);
    }
  };
  authorAvatar.addEventListener('click', openAuthorProfile);
  authorName.addEventListener('click', openAuthorProfile);

  // Like Button
  const likeBtn = card.querySelector('.like-btn');
  likeBtn.addEventListener('click', () => toggleLikePost(post._id, card));

  // Comments Toggle & Submission
  const commentToggleBtn = card.querySelector('.comment-toggle-btn');
  const commentsSection = card.querySelector('.comments-section');
  commentToggleBtn.addEventListener('click', () => {
    const isHidden = commentsSection.classList.contains('hidden');
    if (isHidden) {
      commentsSection.classList.remove('hidden');
      loadCommentsForPost(post._id, card);
    } else {
      commentsSection.classList.add('hidden');
    }
  });

  const commentInput = card.querySelector('.comment-input');
  const submitCommentBtn = card.querySelector('.submit-comment-btn');

  commentInput.addEventListener('focus', () => {
    if (!state.currentUser) {
      commentInput.blur();
      openModal(DOM.authModal);
      showToast('Please sign in to comment', 'error');
    }
  });

  const postComment = () => {
    const text = commentInput.value.trim();
    if (text) {
      handleAddComment(post._id, text, card);
      commentInput.value = '';
    }
  };

  submitCommentBtn.addEventListener('click', postComment);
  commentInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') postComment();
  });

  // Delete Post
  if (isOwner) {
    card.querySelector('.btn-delete-post').addEventListener('click', () => handleDeletePost(post._id));
  }

  return card;
}

// Escape HTML helper
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// Open Create Post Modal Helper
function openCreatePostModal() {
  if (!state.currentUser) {
    state.pendingAuthAction = { type: 'create_post' };
    openModal(DOM.authModal);
    showToast('Please sign in to create posts', 'error');
    return;
  }
  if (DOM.composerAvatar && state.currentUser.avatar) {
    DOM.composerAvatar.src = state.currentUser.avatar;
  }
  if (DOM.composerUserName && state.currentUser.name) {
    DOM.composerUserName.innerText = state.currentUser.name;
  }
  openModal(DOM.createPostModal);
}

// Handle Create Post
async function handleCreatePost() {
  if (!state.currentUser) {
    openModal(DOM.authModal);
    showToast('Please sign in to create posts', 'error');
    return;
  }

  const content = DOM.postContentInput.value.trim();
  const mediaData = state.pendingPostMedia ? state.pendingPostMedia.dataUrl : null;
  const mediaType = state.pendingPostMedia ? state.pendingPostMedia.mediaType : 'image';

  if (!content) {
    showToast('Please type some post content', 'error');
    return;
  }

  try {
    const res = await apiRequest('/api/posts', {
      method: 'POST',
      body: JSON.stringify({ content, image: mediaData, mediaType })
    });

    DOM.postContentInput.value = '';
    state.pendingPostMedia = null;
    if (DOM.postMediaFile) DOM.postMediaFile.value = '';
    DOM.mediaPreviewContainer.classList.add('hidden');
    DOM.mediaPreviewImg.classList.add('hidden');
    DOM.mediaPreviewVideo.classList.add('hidden');
    DOM.mediaPreviewImg.src = '';
    DOM.mediaPreviewVideo.src = '';

    closeModal(DOM.createPostModal);
    showToast('Post published successfully!', 'success');

    // Prepend new post reactively
    if (res.post) {
      state.posts.unshift(res.post);
    }

    if (state.currentTab === 'trending') {
      await loadTrendingPage();
    } else {
      renderPosts();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Handle Toggle Like
async function toggleLikePost(postId, cardEl) {
  if (!state.currentUser) {
    openModal(DOM.authModal);
    showToast('Please sign in to like posts', 'error');
    return;
  }

  try {
    const res = await apiRequest(`/api/posts/${postId}/like`, { method: 'POST' });
    const likeBtn = cardEl.querySelector('.like-btn');
    const likesCountSpan = cardEl.querySelector('.likes-count');
    const heartIcon = likeBtn.querySelector('i');

    if (res.isLiked) {
      likeBtn.classList.add('liked');
      heartIcon.className = 'fa-solid fa-heart';
    } else {
      likeBtn.classList.remove('liked');
      heartIcon.className = 'fa-regular fa-heart';
    }

    likesCountSpan.innerText = res.likesCount;

    // Sync in local state
    const targetPost = state.posts.find(p => p._id === postId);
    if (targetPost) {
      targetPost.isLiked = res.isLiked;
      targetPost.likesCount = res.likesCount;
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Handle Load Comments
async function loadCommentsForPost(postId, cardEl) {
  const commentsList = cardEl.querySelector('.comments-list');
  commentsList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.8rem;">Loading comments...</p>';

  try {
    const comments = await apiRequest(`/api/posts/${postId}/comments`);
    commentsList.innerHTML = '';

    if (comments.length === 0) {
      commentsList.innerHTML = '<p style="color: var(--text-muted); font-size: 0.8rem;">No comments yet. Start the conversation!</p>';
      return;
    }

    comments.forEach(comment => {
      const cEl = document.createElement('div');
      cEl.className = 'comment-item';
      const canDelete = state.currentUser && comment.author && comment.author._id && state.currentUser._id && (comment.author._id.toString() === state.currentUser._id.toString());

      cEl.innerHTML = `
        <img src="${comment.author ? comment.author.avatar : ''}" class="avatar avatar-sm" alt="Avatar">
        <div class="comment-content">
          <a href="#" class="comment-author-name">${comment.author ? comment.author.name : 'User'}</a>
          <span class="comment-time">${formatTimeAgo(comment.createdAt)}</span>
          <div class="comment-text">${escapeHTML(comment.content)}</div>
        </div>
        ${canDelete ? `<button class="comment-delete-btn" title="Delete comment"><i class="fa-solid fa-xmark"></i></button>` : ''}
      `;

      cEl.querySelector('.comment-author-name').addEventListener('click', (e) => {
        e.preventDefault();
        if (comment.author) openProfileModalByUsername(comment.author.username);
      });

      if (canDelete) {
        cEl.querySelector('.comment-delete-btn').addEventListener('click', () => handleDeleteComment(comment._id, postId, cardEl));
      }

      commentsList.appendChild(cEl);
    });
  } catch (err) {
    commentsList.innerHTML = '<p style="color: var(--like-color); font-size: 0.8rem;">Failed to load comments.</p>';
  }
}

// Handle Add Comment
async function handleAddComment(postId, content, cardEl) {
  if (!state.currentUser) {
    openModal(DOM.authModal);
    showToast('Please sign in to comment', 'error');
    return;
  }

  try {
    const res = await apiRequest(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });

    const commentsCountSpan = cardEl.querySelector('.comments-count');
    if (commentsCountSpan) commentsCountSpan.innerText = res.commentsCount;

    // Sync in local state
    const targetPost = state.posts.find(p => p._id === postId);
    if (targetPost) targetPost.commentsCount = res.commentsCount;

    // Unhide comment section
    const commentsSection = cardEl.querySelector('.comments-section');
    if (commentsSection) commentsSection.classList.remove('hidden');

    showToast('Comment added!', 'success');
    await loadCommentsForPost(postId, cardEl);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Handle Delete Comment
async function handleDeleteComment(commentId, postId, cardEl) {
  try {
    const res = await apiRequest(`/api/comments/${commentId}`, { method: 'DELETE' });
    const commentsCountSpan = cardEl.querySelector('.comments-count');
    if (commentsCountSpan) commentsCountSpan.innerText = res.commentsCount;

    // Sync in local state
    const targetPost = state.posts.find(p => p._id === postId);
    if (targetPost) targetPost.commentsCount = res.commentsCount;

    showToast('Comment deleted', 'success');
    await loadCommentsForPost(postId, cardEl);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Handle Delete Post
async function handleDeletePost(postId) {
  if (!confirm('Are you sure you want to delete this post?')) return;

  try {
    await apiRequest(`/api/posts/${postId}`, { method: 'DELETE' });
    showToast('Post deleted', 'success');

    // Remove element directly from DOM reactively
    const cardEl = document.getElementById(`post-${postId}`);
    if (cardEl) cardEl.remove();

    state.posts = state.posts.filter(p => p._id !== postId);
    if (DOM.feedCountBadge) DOM.feedCountBadge.innerText = `${state.posts.length} posts`;

    if (state.activeProfileUser) {
      openProfileModalByUsername(state.activeProfileUser.username);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Toggle Follow / Unfollow User
async function toggleFollowUser(targetUserId, btnEl) {
  if (!state.currentUser) {
    openModal(DOM.authModal);
    showToast('Please sign in to follow creators', 'error');
    return;
  }

  const isCurrentlyFollowing = state.currentUser.following
    ? state.currentUser.following.some(id => (typeof id === 'object' ? id._id.toString() : id.toString()) === targetUserId.toString())
    : false;

  const endpoint = `/api/users/${targetUserId}/${isCurrentlyFollowing ? 'unfollow' : 'follow'}`;

  // Optimistic UI toggle on button
  if (btnEl) {
    btnEl.innerText = isCurrentlyFollowing ? 'Follow' : 'Following';
    btnEl.className = `btn btn-sm ${isCurrentlyFollowing ? 'btn-primary' : 'btn-secondary'} follow-btn`;
  }

  try {
    const res = await apiRequest(endpoint, { method: 'POST' });
    showToast(res.message, 'success');

    // Sync user session reactively
    await checkAuthSession();

    renderSidebarUserCard();
    await loadAllUsers();

    if (state.currentTab === 'following') {
      await loadFeed();
    }

    if (state.activeProfileUser && state.activeProfileUser._id.toString() === targetUserId.toString()) {
      openProfileModalByUsername(state.activeProfileUser.username);
    }
  } catch (err) {
    showToast(err.message, 'error');
    await loadAllUsers();
  }
}

// Open User Profile Modal
async function openProfileModalByUsername(username) {
  openModal(DOM.profileModal);
  DOM.profileModalContent.innerHTML = '<div style="padding: 40px; text-align: center;">Loading profile...</div>';

  try {
    const user = await apiRequest(`/api/users/username/${username}`);
    state.activeProfileUser = user;

    // Fetch user posts
    const userPosts = await apiRequest(`/api/posts?username=${username}`);

    const isSelf = user.isSelf;
    const isFollowing = user.isFollowing;

    DOM.profileModalContent.innerHTML = `
      <div class="profile-banner" style="background-image: url('${user.coverImage || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe'}');"></div>
      <div class="profile-avatar-row">
        <img src="${user.avatar}" alt="${user.name}" class="avatar avatar-xl">
        ${isSelf ? `
          <button class="btn btn-secondary btn-sm" id="modal-edit-profile-btn">
            <i class="fa-solid fa-pen-to-square"></i> Edit Profile
          </button>
        ` : `
          <button class="btn ${isFollowing ? 'btn-secondary' : 'btn-primary'} btn-sm" id="modal-follow-btn">
            ${isFollowing ? 'Following' : 'Follow'}
          </button>
        `}
      </div>

      <div class="profile-info-section">
        <h2 class="profile-name">${user.name}</h2>
        <div class="profile-handle">@${user.username}</div>
        <p class="profile-bio">${user.bio || 'No bio provided.'}</p>

        <div class="profile-stats-bar">
          <div class="profile-stat-box" id="profile-stat-posts">
            <span class="profile-stat-num">${user.postsCount || 0}</span>
            <span class="profile-stat-text">Posts</span>
          </div>
          <div class="profile-stat-box" id="profile-stat-followers">
            <span class="profile-stat-num">${user.followers ? user.followers.length : 0}</span>
            <span class="profile-stat-text">Followers</span>
          </div>
          <div class="profile-stat-box" id="profile-stat-following">
            <span class="profile-stat-num">${user.following ? user.following.length : 0}</span>
            <span class="profile-stat-text">Following</span>
          </div>
        </div>

        <h3 style="font-family: var(--font-heading); font-size: 1.1rem; margin-bottom: 14px;">Posts by @${user.username}</h3>
        <div id="profile-user-posts" class="posts-container"></div>
      </div>
    `;

    // Render user posts inside modal
    const postsWrap = document.getElementById('profile-user-posts');
    if (userPosts.length === 0) {
      postsWrap.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">No posts published yet.</p>';
    } else {
      userPosts.forEach(p => {
        postsWrap.appendChild(createPostCardElement(p));
      });
    }

    // Modal Action Bindings
    document.getElementById('modal-edit-profile-btn')?.addEventListener('click', () => {
      closeModal(DOM.profileModal);
      populateAndOpenEditModal();
    });

    document.getElementById('modal-follow-btn')?.addEventListener('click', (e) => {
      toggleFollowUser(user._id, e.target);
    });

    document.getElementById('profile-stat-followers')?.addEventListener('click', () => {
      openUserListModal(user._id, 'followers', `@${user.username}'s Followers`);
    });

    document.getElementById('profile-stat-following')?.addEventListener('click', () => {
      openUserListModal(user._id, 'following', `@${user.username} is Following`);
    });

  } catch (err) {
    DOM.profileModalContent.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--like-color);">Failed to load profile.</div>`;
  }
}

// Open Followers / Following list modal
async function openUserListModal(userId, type, title) {
  openModal(DOM.userListModal);
  DOM.userListModalTitle.innerText = title;
  DOM.userListModalBody.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Loading user list...</p>';

  try {
    const list = await apiRequest(`/api/users/${userId}/${type}`);
    DOM.userListModalBody.innerHTML = '';

    if (list.length === 0) {
      DOM.userListModalBody.innerHTML = `<p style="text-align: center; color: var(--text-muted); font-size: 0.9rem;">No users found in this list.</p>`;
      return;
    }

    list.forEach(user => {
      const isSelf = state.currentUser && state.currentUser._id && (state.currentUser._id.toString() === user._id.toString());
      const isFollowing = user.isFollowing;

      const item = document.createElement('div');
      item.className = 'user-suggest-item';
      item.style.padding = '8px 0';

      item.innerHTML = `
        <div class="user-suggest-info">
          <img src="${user.avatar}" class="avatar avatar-md" alt="${user.name}">
          <div class="user-suggest-names">
            <a href="#" class="user-suggest-name">${user.name}</a>
            <span class="user-suggest-handle">@${user.username}</span>
          </div>
        </div>
        ${!isSelf ? `
          <button class="btn btn-sm ${isFollowing ? 'btn-secondary' : 'btn-primary'} modal-list-follow-btn">
            ${isFollowing ? 'Following' : 'Follow'}
          </button>
        ` : ''}
      `;

      item.querySelector('.user-suggest-name').addEventListener('click', (e) => {
        e.preventDefault();
        closeModal(DOM.userListModal);
        openProfileModalByUsername(user.username);
      });

      if (!isSelf) {
        item.querySelector('.modal-list-follow-btn').addEventListener('click', (e) => {
          toggleFollowUser(user._id, e.target);
        });
      }

      DOM.userListModalBody.appendChild(item);
    });
  } catch (err) {
    DOM.userListModalBody.innerHTML = `<p style="text-align: center; color: var(--like-color);">Failed to load user list.</p>`;
  }
}

// Populate & Open Edit Profile Modal
function populateAndOpenEditModal() {
  if (!state.currentUser) return;
  document.getElementById('edit-name').value = state.currentUser.name || '';
  document.getElementById('edit-bio').value = state.currentUser.bio || '';
  if (DOM.editAvatarPreview) {
    DOM.editAvatarPreview.src = state.currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';
  }
  state.pendingProfileAvatar = null;
  state.pendingProfileCover = null;
  if (DOM.editAvatarFile) DOM.editAvatarFile.value = '';
  if (DOM.editCoverFile) DOM.editCoverFile.value = '';
  openModal(DOM.editProfileModal);
}

// Submit Edit Profile Form
async function handleEditProfileSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('edit-name').value.trim();
  const bio = document.getElementById('edit-bio').value.trim();
  const avatar = state.pendingProfileAvatar || state.currentUser.avatar;
  const coverImage = state.pendingProfileCover || state.currentUser.coverImage;

  try {
    const res = await apiRequest('/api/users/profile', {
      method: 'PUT',
      body: JSON.stringify({ name, bio, avatar, coverImage })
    });

    state.currentUser = res.user;
    state.pendingProfileAvatar = null;
    state.pendingProfileCover = null;
    closeModal(DOM.editProfileModal);
    showToast('Profile updated successfully!', 'success');

    updateUIForUser();
    await loadFeed();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Auth Handlers (Login & Register)
async function handleLogin(e) {
  e.preventDefault();
  const usernameOrEmail = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ usernameOrEmail, password })
    });

    state.token = res.token;
    state.currentUser = res.user;
    localStorage.setItem('nexus_token', res.token);

    // Sync full populated session
    await checkAuthSession();

    if (DOM.loginForm) DOM.loginForm.reset();
    if (DOM.registerForm) DOM.registerForm.reset();

    closeModal(DOM.authModal);
    showToast(`Welcome back, ${res.user.name}!`, 'success');

    updateUIForUser();
    await loadAllUsers();

    if (state.currentTab === 'trending') {
      await loadTrendingPage();
    } else {
      await loadFeed();
    }

    if (state.activeProfileUser) {
      openProfileModalByUsername(state.activeProfileUser.username);
    }

    // Fulfill pending user intent automatically
    if (state.pendingAuthAction) {
      const action = state.pendingAuthAction;
      state.pendingAuthAction = null;

      if (action.type === 'create_post') {
        openCreatePostModal();
      } else if (action.type === 'profile') {
        openProfileModalByUsername(state.currentUser.username);
      } else if (action.type === 'following_feed') {
        switchTab('following');
      } else if (action.type === 'like' && action.postId && action.cardEl) {
        toggleLikePost(action.postId, action.cardEl);
      } else if (action.type === 'follow' && action.targetUserId && action.btnEl) {
        toggleFollowUser(action.targetUserId, action.btnEl);
      }
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value.trim();
  const username = document.getElementById('reg-username').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;

  try {
    const res = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, username, email, password })
    });

    state.token = res.token;
    state.currentUser = res.user;
    localStorage.setItem('nexus_token', res.token);

    // Sync full populated session
    await checkAuthSession();

    if (DOM.loginForm) DOM.loginForm.reset();
    if (DOM.registerForm) DOM.registerForm.reset();

    closeModal(DOM.authModal);
    showToast('Account created successfully!', 'success');

    updateUIForUser();
    await loadAllUsers();

    if (state.currentTab === 'trending') {
      await loadTrendingPage();
    } else {
      await loadFeed();
    }

    if (state.activeProfileUser) {
      openProfileModalByUsername(state.activeProfileUser.username);
    }

    // Fulfill pending user intent automatically
    if (state.pendingAuthAction) {
      const action = state.pendingAuthAction;
      state.pendingAuthAction = null;

      if (action.type === 'create_post') {
        openCreatePostModal();
      } else if (action.type === 'profile') {
        openProfileModalByUsername(state.currentUser.username);
      } else if (action.type === 'following_feed') {
        switchTab('following');
      } else if (action.type === 'like' && action.postId && action.cardEl) {
        toggleLikePost(action.postId, action.cardEl);
      } else if (action.type === 'follow' && action.targetUserId && action.btnEl) {
        toggleFollowUser(action.targetUserId, action.btnEl);
      }
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Kickoff App on DOM Ready
document.addEventListener('DOMContentLoaded', initApp);
