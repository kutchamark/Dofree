// public/app.js
// javascript / public/app.js / browser es6+ / web / chinesemovie - netflix edition

// Application State
const state = {
  currentView: 'home', // 'home' | 'movies' | 'dramas' | 'manga' | 'popular' | 'favorites' | 'history' | 'search'
  activeDramaCategory: 0,
  activeCinemaCategory: 0,
  dramaPage: 1,
  mangaPage: 1,
  cinemaPage: 1,
  isLoading: false,
  hasMore: true,
  searchQuery: '',
  categories: [],
  cinemaCategories: [],
  featuredList: [],
  activeBillboardMovie: null,
  activeMovie: null,
  activeManga: null,
  currentChapterData: null,
  activeStreamSource: 'proxy', // 'proxy' | 'primary' | 'mirror'
  hls: null,
  favorites: JSON.parse(localStorage.getItem('cm_favs') || '{}'),
  history: JSON.parse(localStorage.getItem('cm_history') || '{}'),
  mangaHistory: JSON.parse(localStorage.getItem('cm_manga_hist') || '{}')
};

// DOM Cache
const el = {
  header: document.getElementById('mainHeader'),
  homeView: document.getElementById('homeViewContainer'),
  catalogView: document.getElementById('catalogViewContainer'),
  // Billboard
  billboardBg: document.getElementById('billboardBg'),
  billboardTitle: document.getElementById('billboardTitle'),
  billboardDesc: document.getElementById('billboardDesc'),
  billboardGenre: document.getElementById('billboardGenre'),
  billboardRating: document.getElementById('billboardRating'),
  // Home Rows
  rowCinema: document.getElementById('row-cinema'),
  rowCinemaNew: document.getElementById('row-cinema-new'),
  rowTrending: document.getElementById('row-trending'),
  rowManga: document.getElementById('row-manga'),
  rowNew: document.getElementById('row-new'),
  rowRomance: document.getElementById('row-romance'),
  rowRevenge: document.getElementById('row-revenge'),
  // Catalog View
  dramaCategoryChipsWrapper: document.getElementById('dramaCategoryChipsWrapper'),
  categoryChips: document.getElementById('categoryChips'),
  catalogTitle: document.getElementById('catalogTitle'),
  catalogBadge: document.getElementById('catalogBadge'),
  catalogCount: document.getElementById('catalogCount'),
  catalogGrid: document.getElementById('catalogGrid'),
  catalogSentinel: document.getElementById('catalogSentinel'),
  catalogLoading: document.getElementById('catalogLoading'),
  catalogEnd: document.getElementById('catalogEnd'),
  // Search
  globalSearch: document.getElementById('globalSearchInput'),
  searchDropdown: document.getElementById('searchDropdown'),
  searchDropdownContent: document.getElementById('searchDropdownContent'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  // Movie Detail Modal
  detailModal: document.getElementById('detailModal'),
  modalBannerImg: document.getElementById('modalBannerImg'),
  modalTitle: document.getElementById('modalTitle'),
  modalGenreText: document.getElementById('modalGenreText'),
  modalRating: document.getElementById('modalRating'),
  modalViews: document.getElementById('modalViews'),
  modalDescription: document.getElementById('modalDescription'),
  modalPlayBtn: document.getElementById('modalPlayBtn'),
  modalFavBtn: document.getElementById('modalFavBtn'),
  modalRelatedGrid: document.getElementById('modalRelatedGrid'),
  // Video Player
  playerModal: document.getElementById('playerModal'),
  video: document.getElementById('mainVideoPlayer'),
  playerBuffering: document.getElementById('playerBuffering'),
  playerMovieTitle: document.getElementById('playerMovieTitle'),
  playerMovieGenre: document.getElementById('playerMovieGenre'),
  playerServerIndicator: document.getElementById('playerServerIndicator'),
  sourceSwitchBtn: document.getElementById('sourceSwitchBtn'),
  playerProgressBar: document.getElementById('playerProgressBar'),
  playerCurrentTime: document.getElementById('playerCurrentTime'),
  playerDuration: document.getElementById('playerDuration'),
  bottomPlayBtn: document.getElementById('bottomPlayBtn'),
  middlePlayIcon: document.getElementById('middlePlayIcon'),
  volumeSlider: document.getElementById('volumeSlider'),
  volumeBtn: document.getElementById('volumeBtn'),
  // Manga Modal
  mangaModal: document.getElementById('mangaModal'),
  mangaModalCover: document.getElementById('mangaModalCover'),
  mangaModalTitle: document.getElementById('mangaModalTitle'),
  mangaModalChCount: document.getElementById('mangaModalChCount'),
  mangaModalSynopsis: document.getElementById('mangaModalSynopsis'),
  mangaChapterList: document.getElementById('mangaChapterList'),
  // Manga Reader
  readerModal: document.getElementById('readerModal'),
  readerChapterTitle: document.getElementById('readerChapterTitle'),
  readerPageCount: document.getElementById('readerPageCount'),
  readerPrevBtn: document.getElementById('readerPrevBtn'),
  readerNextBtn: document.getElementById('readerNextBtn'),
  readerChapterSelect: document.getElementById('readerChapterSelect'),
  mangaStreamWrap: document.getElementById('mangaStreamWrap'),
  readerLoading: document.getElementById('readerLoading'),
  readerBottomNav: document.getElementById('readerBottomNav'),
  readerBottomPrev: document.getElementById('readerBottomPrev'),
  readerBottomNext: document.getElementById('readerBottomNext')
};

// -------------------------------------------------------------
// INITIALIZATION
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  setupNavbarScroll();
  setupSearchInput();
  setupVideoEvents();
  setupKeyboardShortcuts();
  setupCatalogIntersectionObserver();

  // Load initial data
  await Promise.all([
    initCategories(),
    initNetflixBillboard(),
    initNetflixRows()
  ]);
});

// -------------------------------------------------------------
// NAVBAR & NAVIGATION
// -------------------------------------------------------------
function setupNavbarScroll() {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      el.header.classList.add('scrolled');
    } else {
      el.header.classList.remove('scrolled');
    }
  });
}

function handleNavClick(e, view) {
  e.preventDefault();
  switchView(view);
}

function switchView(view) {
  state.currentView = view;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Update nav active classes
  ['home', 'movies', 'dramas', 'manga', 'popular', 'fav', 'hist'].forEach((id) => {
    const desktopBtn = document.getElementById(`nav-${id}`);
    const mobileBtn = document.getElementById(`mobile-${id}`);
    if (desktopBtn) {
      desktopBtn.className = 'nav-link-btn text-zinc-300 hover:text-white transition-colors cursor-pointer py-1';
    }
    if (mobileBtn) {
      mobileBtn.className = 'flex flex-col items-center text-zinc-400 hover:text-white space-y-1';
    }
  });

  const activeDesktopBtn = document.getElementById(`nav-${view === 'favorites' ? 'fav' : view === 'history' ? 'hist' : view}`);
  if (activeDesktopBtn) {
    activeDesktopBtn.className = 'nav-link-btn active font-bold text-white transition-colors cursor-pointer py-1';
  }

  const activeMobileBtn = document.getElementById(`mobile-${view === 'favorites' ? 'fav' : view === 'history' ? 'hist' : view}`);
  if (activeMobileBtn) {
    activeMobileBtn.className = 'flex flex-col items-center text-[#ff1e38] space-y-1 font-semibold';
  }

  
  const tabCinema = document.getElementById('catTabCinema');
  const tabDrama = document.getElementById('catTabDrama');
  const tabManga = document.getElementById('catTabManga');
  if (tabCinema && tabDrama && tabManga) {
    [tabCinema, tabDrama, tabManga].forEach(b => b.className = 'flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white/5 hover:bg-white/10 text-zinc-300 transition-all flex-shrink-0 cursor-pointer border border-white/10');
    if (view === 'movies') tabCinema.className = 'flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#ff1e38] text-white transition-all shadow-md flex-shrink-0 cursor-pointer';
    else if (view === 'dramas') tabDrama.className = 'flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#ff1e38] text-white transition-all shadow-md flex-shrink-0 cursor-pointer';
    else if (view === 'manga') tabManga.className = 'flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#ff1e38] text-white transition-all shadow-md flex-shrink-0 cursor-pointer';
  }
  if (view === 'home') {
    el.homeView.classList.remove('hidden');
    el.catalogView.classList.add('hidden');
  } else if (view === 'movies') {
    el.homeView.classList.add('hidden');
    el.catalogView.classList.remove('hidden');
    el.dramaCategoryChipsWrapper.classList.remove('hidden');
    filterCinemaCategory(state.activeCinemaCategory || 0);
  } else if (view === 'dramas') {
    el.homeView.classList.add('hidden');
    el.catalogView.classList.remove('hidden');
    el.dramaCategoryChipsWrapper.classList.remove('hidden');
    filterDramaCategory(0);
  } else if (view === 'manga') {
    el.homeView.classList.add('hidden');
    el.catalogView.classList.remove('hidden');
    el.dramaCategoryChipsWrapper.classList.add('hidden');
    loadMangaCatalogView(1, true);
  } else if (view === 'popular') {
    el.homeView.classList.add('hidden');
    el.catalogView.classList.remove('hidden');
    el.dramaCategoryChipsWrapper.classList.remove('hidden');
    filterDramaCategory(26);
  } else if (view === 'favorites') {
    el.homeView.classList.add('hidden');
    el.catalogView.classList.remove('hidden');
    el.dramaCategoryChipsWrapper.classList.add('hidden');
    renderFavoritesView();
  } else if (view === 'history') {
    el.homeView.classList.add('hidden');
    el.catalogView.classList.remove('hidden');
    el.dramaCategoryChipsWrapper.classList.add('hidden');
    renderHistoryView();
  }
}

// -------------------------------------------------------------
// CATEGORIES & NETFLIX BILLBOARD
// -------------------------------------------------------------
async function initCategories() {
  try {
    const [dramaRes, cinemaRes] = await Promise.all([
      fetch('/api/categories'),
      fetch('/api/cinema/categories')
    ]);
    const [dramaJson, cinemaJson] = await Promise.all([
      dramaRes.json(),
      cinemaRes.json()
    ]);

    if (dramaJson.success) state.categories = dramaJson.data;
    if (cinemaJson.success) state.cinemaCategories = cinemaJson.data;

    if (state.currentView === 'movies') {
      renderCinemaCategoryChips();
    } else {
      renderDramaCategoryChips();
    }
  } catch (e) {
    console.error('Failed to load categories:', e);
  }
}

function renderDramaCategoryChips() {
  el.categoryChips.innerHTML = state.categories.map((cat) => {
    const isActive = state.activeDramaCategory === cat.id;
    const activeClasses = isActive
      ? 'bg-[#ff1e38] text-white border-[#ff1e38] font-bold'
      : 'bg-zinc-800/80 text-zinc-300 border-zinc-700 hover:border-zinc-500 hover:text-white';

    return `
      <button 
        onclick="filterDramaCategory(${cat.id})"
        class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all flex-shrink-0 cursor-pointer ${activeClasses}">
        <i class="fa-solid ${cat.icon || 'fa-film'} text-[11px] ${isActive ? 'text-white' : 'text-[#ff1e38]'}"></i>
        <span>${cat.name}</span>
        ${cat.count ? `<span class="text-[10px] opacity-70">(${cat.count})</span>` : ''}
      </button>
    `;
  }).join('');
}

function renderCinemaCategoryChips() {
  if (!state.cinemaCategories || state.cinemaCategories.length === 0) return;
  el.categoryChips.innerHTML = state.cinemaCategories.map((cat) => {
    const isActive = state.activeCinemaCategory === cat.id;
    const activeClasses = isActive
      ? 'bg-[#ff1e38] text-white border-[#ff1e38] font-bold'
      : 'bg-zinc-800/80 text-zinc-300 border-zinc-700 hover:border-zinc-500 hover:text-white';

    return `
      <button 
        onclick="filterCinemaCategory(${cat.id})"
        class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all flex-shrink-0 cursor-pointer ${activeClasses}">
        <i class="fa-solid ${cat.icon || 'fa-ticket'} text-[11px] ${isActive ? 'text-white' : 'text-[#ff1e38]'}"></i>
        <span>${cat.name}</span>
        ${cat.count ? `<span class="text-[10px] opacity-70">(${cat.count})</span>` : ''}
      </button>
    `;
  }).join('');
}

function filterCinemaCategory(catId) {
  state.currentView = 'movies';
  state.activeCinemaCategory = catId;
  state.cinemaPage = 1;
  state.hasMore = true;

  el.homeView.classList.add('hidden');
  el.catalogView.classList.remove('hidden');
  el.dramaCategoryChipsWrapper.classList.remove('hidden');

  const cat = state.cinemaCategories.find((c) => c.id === catId);
  const catName = cat ? cat.name : 'หมวดหมู่';
  el.catalogTitle.textContent = catId === 0 ? 'ภาพยนตร์ชนโรง & บล็อกบัสเตอร์ทั้งหมด' : `ภาพยนตร์: ${catName}`;
  el.catalogBadge.textContent = cat && cat.count ? `${cat.count}+ เรื่อง` : '4K Ultra HD';

  renderCinemaCategoryChips();
  loadCinemaCatalog(1, catId, true);
}

async function initNetflixBillboard() {
  try {
    const res = await fetch('/api/featured');
    const json = await res.json();
    if (json.success && json.data.length > 0) {
      state.featuredList = json.data;
      setBillboardMovie(json.data[0]);
    }
  } catch (e) {
    console.error('Failed to load billboard:', e);
  }
}

function setBillboardMovie(movie) {
  state.activeBillboardMovie = movie;
  el.billboardBg.src = movie.poster;
  el.billboardBg.onload = () => el.billboardBg.classList.remove('opacity-0');
  el.billboardTitle.textContent = movie.title;
  el.billboardGenre.textContent = movie.genre || 'ความรัก / ซีรีส์จีน';
  el.billboardRating.textContent = movie.rating || '8.5';
  el.billboardDesc.textContent = movie.description || 'ดูหนังจีนสั้น ซีรีย์จีน ซับไทย พากย์ไทย คุณภาพระดับ HD';
}

function playBillboardMovie() {
  if (state.activeBillboardMovie) {
    playMovie(state.activeBillboardMovie);
  }
}

function openBillboardInfo() {
  if (state.activeBillboardMovie) {
    openDetailModal(state.activeBillboardMovie.id);
  }
}

function toggleBillboardMute() {
  showToast('เสียงตัวอย่างเปิดใช้งานอยู่แล้ว', 'info');
}

// -------------------------------------------------------------
// NETFLIX HOME MULTI-ROW SLIDERS
// -------------------------------------------------------------
async function initNetflixRows() {
  // Row 0: DoFree Cinema Movies
  if (el.rowCinema) {
    fetch('/api/cinema/catalog?page=1')
      .then((r) => r.json())
      .then((j) => {
        if (j.success) renderNetflixRow(el.rowCinema, j.data, 'cinema');
      })
      .catch((e) => console.error('Cinema row error:', e));
  }

  // Row 0.5: Cinema New 2026
  if (el.rowCinemaNew) {
    fetch('/api/cinema/catalog?page=1&category=46868')
      .then((r) => r.json())
      .then((j) => {
        if (j.success) renderNetflixRow(el.rowCinemaNew, j.data, 'cinema');
      })
      .catch((e) => console.error('Cinema new row error:', e));
  }

  // Row 1: Trending Dramas
  fetch('/api/movies?page=1&category=0')
    .then((r) => r.json())
    .then((j) => {
      if (j.success) renderNetflixRow(el.rowTrending, j.data, 'drama');
    });

  // Row 2: Trending Manga
  fetch('/api/manga/catalog?page=1')
    .then((r) => r.json())
    .then((j) => {
      if (j.success) renderNetflixRow(el.rowManga, j.data, 'manga');
    });

  // Row 3: New Dramas
  fetch('/api/movies?page=1&category=5')
    .then((r) => r.json())
    .then((j) => {
      if (j.success) renderNetflixRow(el.rowNew, j.data, 'drama');
    });

  // Row 4: Romance Dramas
  fetch('/api/movies?page=1&category=15')
    .then((r) => r.json())
    .then((j) => {
      if (j.success) renderNetflixRow(el.rowRomance, j.data, 'drama');
    });

  // Row 5: Revenge Dramas
  fetch('/api/movies?page=1&category=13')
    .then((r) => r.json())
    .then((j) => {
      if (j.success) renderNetflixRow(el.rowRevenge, j.data, 'drama');
    });
}

function renderNetflixRow(rowEl, items, type = 'drama') {
  if (!items || items.length === 0) return;

  rowEl.innerHTML = items.map((item) => {
    if (type === 'cinema') {
      const isFav = !!state.favorites[item.id];
      const watchProgress = state.history[item.id];
      const progressPercent = watchProgress && watchProgress.duration > 0
        ? Math.min(100, Math.round((watchProgress.time / watchProgress.duration) * 100))
        : 0;

      return `
        <div 
          class="dofree-card w-36 sm:w-44 lg:w-52 aspect-[2/3] group rounded-xl"
          onclick="openCinemaDetailModal('${item.id}', '${item.slug}', '${encodeURIComponent(item.link || '')}')">
          <div class="absolute top-2.5 right-2.5 z-20 pointer-events-none">
            <span class="card-badge-vip shadow-md">4K UHD</span>
          </div>
          <img 
            src="${item.poster}" 
            alt="${item.title}" 
            loading="lazy" 
            onerror="this.src='/assets/placeholder.jpg'"
            class="w-full h-full object-cover rounded-xl" 
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 p-3 flex flex-col justify-end rounded-xl">
            <span class="text-[9px] uppercase font-bold text-[#ff1e38] bg-black/80 border border-[#ff1e38]/40 px-2 py-0.5 rounded-full w-max mb-1">ภาพยนตร์ชนโรง</span>
            <h4 class="text-xs sm:text-sm font-bold text-white line-clamp-1 drop-shadow">${item.title}</h4>
            <div class="flex items-center justify-between text-[10px] text-zinc-300 mt-1">
              <span class="text-amber-400 font-bold"><i class="fa-solid fa-star text-[9px]"></i> ${item.rating || '8.8'}</span>
              <span class="bg-white/10 text-zinc-300 px-1.5 py-0.5 rounded text-[9px] font-mono">${item.year || '2026'}</span>
            </div>
            <div class="flex items-center gap-2 mt-2.5">
              <button 
                onclick="event.stopPropagation(); playCinemaDirect('${item.id}', '${item.slug}', '${encodeURIComponent(item.link || '')}')"
                class="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-zinc-200 transition-all hover:scale-110 active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                <i class="fa-solid fa-play ml-0.5 text-xs"></i>
              </button>
              <button 
                onclick="event.stopPropagation(); toggleFavorite('${item.id}', '${encodeURIComponent(item.title)}', '${encodeURIComponent(item.poster)}')"
                class="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-white/20 border border-white/20 transition-all hover:scale-110">
                <i class="${isFav ? 'fa-solid fa-check text-emerald-400' : 'fa-solid fa-plus'} text-xs"></i>
              </button>
            </div>
          </div>
          ${progressPercent > 0 ? `
            <div class="absolute bottom-0 left-0 right-0 watch-progress-bar">
              <div class="watch-progress-fill" style="width: ${progressPercent}%;"></div>
            </div>
          ` : ''}
        </div>
      `;
    } else if (type === 'drama') {
      const isFav = !!state.favorites[item.id];
      const watchProgress = state.history[item.id];
      const progressPercent = watchProgress && watchProgress.duration > 0
        ? Math.min(100, Math.round((watchProgress.time / watchProgress.duration) * 100))
        : 0;

      return `
        <div 
          class="dofree-card w-36 sm:w-44 lg:w-52 aspect-[2/3] group rounded-xl"
          onclick="openDetailModal('${item.id}')">
          <div class="absolute top-2.5 right-2.5 z-20 pointer-events-none">
            <span class="card-badge-hd">HD</span>
          </div>
          <img 
            src="${item.poster}" 
            alt="${item.title}" 
            loading="lazy" 
            onerror="this.src='/assets/placeholder.jpg'"
            class="w-full h-full object-cover rounded-xl" 
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 p-3 flex flex-col justify-end rounded-xl">
            <span class="text-[9px] uppercase font-bold text-amber-400 bg-black/80 border border-amber-400/40 px-2 py-0.5 rounded-full w-max mb-1">ซีรีส์จีน</span>
            <h4 class="text-xs sm:text-sm font-bold text-white line-clamp-1 drop-shadow">${item.title}</h4>
            <div class="flex items-center justify-between text-[10px] text-zinc-300 mt-1">
              <span class="text-amber-400 font-bold"><i class="fa-solid fa-star text-[9px]"></i> ${item.rating || '8.0'}</span>
              <span class="text-zinc-400 text-[9px]">${item.views || '1K+'} ชม</span>
            </div>
            <div class="flex items-center gap-2 mt-2.5">
              <button 
                onclick="event.stopPropagation(); playMovieDirect('${item.id}')"
                class="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-zinc-200 transition-all hover:scale-110 active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                <i class="fa-solid fa-play ml-0.5 text-xs"></i>
              </button>
              <button 
                onclick="event.stopPropagation(); toggleFavorite('${item.id}', '${encodeURIComponent(item.title)}', '${encodeURIComponent(item.poster)}')"
                class="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-white/20 border border-white/20 transition-all hover:scale-110">
                <i class="${isFav ? 'fa-solid fa-check text-emerald-400' : 'fa-solid fa-plus'} text-xs"></i>
              </button>
            </div>
          </div>
          ${progressPercent > 0 ? `
            <div class="absolute bottom-0 left-0 right-0 watch-progress-bar">
              <div class="watch-progress-fill" style="width: ${progressPercent}%;"></div>
            </div>
          ` : ''}
        </div>
      `;
    } else {
      // Manga card
      return `
        <div 
          class="dofree-card w-36 sm:w-44 lg:w-52 aspect-[3/4] group rounded-xl"
          onclick="openMangaModal('${item.slug}')">
          <div class="absolute top-2.5 right-2.5 z-20 pointer-events-none">
            <span class="bg-emerald-600/90 text-white font-bold text-[9px] px-2 py-0.5 rounded-full shadow">อ่านฟรี</span>
          </div>
          <img 
            src="${item.thumbnail}" 
            alt="${item.title}" 
            loading="lazy" 
            onerror="this.src='/assets/placeholder.jpg'"
            class="w-full h-full object-cover rounded-xl" 
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 p-3 flex flex-col justify-end rounded-xl">
            <span class="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-full w-max mb-1">มังงะแปลไทย</span>
            <h4 class="text-xs sm:text-sm font-bold text-white line-clamp-2 drop-shadow">${item.title}</h4>
            <div class="flex items-center gap-2 mt-2.5">
              <button 
                onclick="event.stopPropagation(); openMangaModal('${item.slug}')"
                class="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all hover:scale-105 shadow-md">
                <i class="fa-solid fa-book-open"></i> อ่านเลย
              </button>
            </div>
          </div>
        </div>
      `;
    }
  }).join('');
}

function scrollSlider(rowId, direction) {
  const container = document.getElementById(rowId);
  if (!container) return;
  const scrollAmount = container.clientWidth * 0.75 * direction;
  container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
}

// -------------------------------------------------------------
// CATALOG VIEW (DRAMAS & MANGA)
// -------------------------------------------------------------
function filterDramaCategory(catId) {
  state.currentView = 'dramas';
  state.activeDramaCategory = catId;
  state.dramaPage = 1;
  state.hasMore = true;

  el.homeView.classList.add('hidden');
  el.catalogView.classList.remove('hidden');
  el.dramaCategoryChipsWrapper.classList.remove('hidden');

  const cat = state.categories.find((c) => c.id === catId);
  const catName = cat ? cat.name : 'หมวดหมู่';
  el.catalogTitle.textContent = catId === 0 ? 'ซีรีส์จีนทั้งหมด' : `ซีรีส์จีน: ${catName}`;
  el.catalogBadge.textContent = cat && cat.count ? `${cat.count} เรื่อง` : 'อัปเดต';

  renderDramaCategoryChips();
  loadDramaCatalog(1, catId, true);
}

async function loadDramaCatalog(page = 1, categoryId = 0, isInitial = false) {
  if (state.isLoading) return;
  if (!state.hasMore && !isInitial) return;

  state.isLoading = true;
  el.catalogLoading.classList.remove('hidden');
  el.catalogEnd.classList.add('hidden');

  if (isInitial) el.catalogGrid.innerHTML = '';

  try {
    const res = await fetch(`/api/movies?page=${page}&category=${categoryId}`);
    const json = await res.json();
    state.isLoading = false;
    el.catalogLoading.classList.add('hidden');

    if (!json.success || json.data.length === 0) {
      state.hasMore = false;
      if (isInitial) {
        el.catalogGrid.innerHTML = '<div class="col-span-full py-20 text-center text-zinc-500">ไม่มีรายการในหมวดหมู่นี้</div>';
      } else {
        el.catalogEnd.classList.remove('hidden');
      }
      return;
    }

    const cardsHtml = json.data.map((item) => `
      <div 
        class="dofree-card w-full aspect-[2/3] border border-zinc-800 group"
        onclick="openDetailModal('${item.id}')">
        <img 
          src="${item.poster}" 
          alt="${item.title}" 
          loading="lazy" 
          onerror="this.src='/assets/placeholder.jpg'"
          class="w-full h-full object-cover" 
        />
        <div class="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
          <h4 class="text-xs sm:text-sm font-bold text-white line-clamp-1">${item.title}</h4>
          <div class="flex items-center justify-between text-[11px] text-zinc-300 mt-1">
            <span class="text-amber-400"><i class="fa-solid fa-star"></i> ${item.rating || '8.0'}</span>
            <span class="bg-[#ff1e38] text-white px-1.5 rounded text-[10px]">HD</span>
          </div>
          <div class="flex items-center gap-2 mt-2">
            <button 
              onclick="event.stopPropagation(); playMovieDirect('${item.id}')"
              class="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center hover:bg-white/80">
              <i class="fa-solid fa-play ml-0.5 text-xs"></i>
            </button>
            <button 
              onclick="event.stopPropagation(); toggleFavorite('${item.id}', '${encodeURIComponent(item.title)}', '${encodeURIComponent(item.poster)}')"
              class="w-7 h-7 rounded-full bg-zinc-800 text-white flex items-center justify-center hover:bg-zinc-700 border border-zinc-600">
              <i class="${state.favorites[item.id] ? 'fa-solid fa-check text-emerald-400' : 'fa-solid fa-plus'} text-xs"></i>
            </button>
          </div>
        </div>
      </div>
    `).join('');

    if (isInitial) el.catalogGrid.innerHTML = cardsHtml;
    else el.catalogGrid.insertAdjacentHTML('beforeend', cardsHtml);

    state.dramaPage = page;
    el.catalogCount.textContent = `แสดง ${el.catalogGrid.children.length} เรื่อง`;
  } catch (err) {
    state.isLoading = false;
    el.catalogLoading.classList.add('hidden');
    console.error('Drama catalog error:', err);
  }
}

async function loadMangaCatalogView(page = 1, isInitial = false) {
  if (state.isLoading) return;
  state.isLoading = true;
  el.catalogLoading.classList.remove('hidden');
  el.catalogEnd.classList.add('hidden');

  el.catalogTitle.textContent = 'การ์ตูน & มังงะแปลไทย (Zero Storage Reader)';
  el.catalogBadge.textContent = 'อัปเดตล่าสุด';

  if (isInitial) el.catalogGrid.innerHTML = '';

  try {
    const res = await fetch(`/api/manga/catalog?page=${page}`);
    const json = await res.json();
    state.isLoading = false;
    el.catalogLoading.classList.add('hidden');

    if (!json.success || json.data.length === 0) {
      state.hasMore = false;
      el.catalogEnd.classList.remove('hidden');
      return;
    }

    const cardsHtml = json.data.map((item) => `
      <div 
        class="dofree-card w-full aspect-[3/4] border border-zinc-800 group"
        onclick="openMangaModal('${item.slug}')">
        <img 
          src="${item.thumbnail}" 
          alt="${item.title}" 
          loading="lazy" 
          onerror="this.src='/assets/placeholder.jpg'"
          class="w-full h-full object-cover" 
        />
        <div class="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
          <span class="text-[9px] uppercase font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 px-1.5 py-0.5 rounded w-max mb-1">มังงะ HD</span>
          <h4 class="text-xs sm:text-sm font-bold text-white line-clamp-2">${item.title}</h4>
          <div class="flex items-center gap-2 mt-2">
            <button 
              onclick="event.stopPropagation(); openMangaModal('${item.slug}')"
              class="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1 rounded flex items-center gap-1.5 transition-colors">
              <i class="fa-solid fa-book-open"></i> อ่านเลย
            </button>
          </div>
        </div>
      </div>
    `).join('');

    if (isInitial) el.catalogGrid.innerHTML = cardsHtml;
    else el.catalogGrid.insertAdjacentHTML('beforeend', cardsHtml);

    state.mangaPage = page;
    el.catalogCount.textContent = `แสดง ${el.catalogGrid.children.length} เรื่อง`;
  } catch (err) {
    state.isLoading = false;
    el.catalogLoading.classList.add('hidden');
    console.error('Manga catalog error:', err);
  }
}

async function loadCinemaCatalog(page = 1, categoryId = 0, isInitial = false) {
  if (state.isLoading) return;
  if (!state.hasMore && !isInitial) return;

  state.isLoading = true;
  el.catalogLoading.classList.remove('hidden');
  el.catalogEnd.classList.add('hidden');

  if (isInitial) el.catalogGrid.innerHTML = '';

  try {
    const res = await fetch(`/api/cinema/catalog?page=${page}&category=${categoryId}`);
    const json = await res.json();
    state.isLoading = false;
    el.catalogLoading.classList.add('hidden');

    if (!json.success || !json.data || json.data.length === 0) {
      state.hasMore = false;
      if (isInitial) {
        el.catalogGrid.innerHTML = '<div class="col-span-full py-20 text-center text-zinc-500">ไม่มีภาพยนตร์ในหมวดหมู่นี้</div>';
      } else {
        el.catalogEnd.classList.remove('hidden');
      }
      return;
    }

    const cardsHtml = json.data.map((item) => {
      const isFav = !!state.favorites[item.id];
      return `
        <div 
          class="dofree-card w-full aspect-[2/3] group rounded-xl"
          onclick="openCinemaDetailModal('${item.id}', '${item.slug}', '${encodeURIComponent(item.link || '')}')">
          <div class="absolute top-2.5 right-2.5 z-20 pointer-events-none">
            <span class="card-badge-vip shadow-md">4K UHD</span>
          </div>
          <img 
            src="${item.poster}" 
            alt="${item.title}" 
            loading="lazy" 
            onerror="this.src='/assets/placeholder.jpg'"
            class="w-full h-full object-cover rounded-xl" 
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 p-3.5 flex flex-col justify-end rounded-xl">
            <span class="text-[9px] uppercase font-bold text-[#ff1e38] bg-black/80 border border-[#ff1e38]/40 px-2 py-0.5 rounded-full w-max mb-1">ภาพยนตร์ชนโรง</span>
            <h4 class="text-xs sm:text-sm font-bold text-white line-clamp-1 drop-shadow">${item.title}</h4>
            <div class="flex items-center justify-between text-[11px] text-zinc-300 mt-1">
              <span class="text-amber-400 font-bold"><i class="fa-solid fa-star text-[9px]"></i> ${item.rating || '8.8'}</span>
              <span class="bg-white/10 text-zinc-300 px-1.5 py-0.5 rounded text-[10px] font-mono">${item.year || '2026'}</span>
            </div>
            <div class="flex items-center gap-2 mt-2.5">
              <button 
                onclick="event.stopPropagation(); playCinemaDirect('${item.id}', '${item.slug}', '${encodeURIComponent(item.link || '')}')"
                class="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-zinc-200 transition-all hover:scale-110 active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                <i class="fa-solid fa-play ml-0.5 text-xs"></i>
              </button>
              <button 
                onclick="event.stopPropagation(); toggleFavorite('${item.id}', '${encodeURIComponent(item.title)}', '${encodeURIComponent(item.poster)}')"
                class="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-white/20 border border-white/20 transition-all hover:scale-110">
                <i class="${isFav ? 'fa-solid fa-check text-emerald-400' : 'fa-solid fa-plus'} text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    if (isInitial) el.catalogGrid.innerHTML = cardsHtml;
    else el.catalogGrid.insertAdjacentHTML('beforeend', cardsHtml);

    state.cinemaPage = page;
    el.catalogCount.textContent = `แสดง ${el.catalogGrid.children.length} เรื่อง`;
  } catch (err) {
    state.isLoading = false;
    el.catalogLoading.classList.add('hidden');
    console.error('Cinema catalog error:', err);
  }
}

function setupCatalogIntersectionObserver() {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !state.isLoading && state.hasMore) {
      if (state.currentView === 'movies') {
        loadCinemaCatalog(state.cinemaPage + 1, state.activeCinemaCategory, false);
      } else if (state.currentView === 'dramas') {
        loadDramaCatalog(state.dramaPage + 1, state.activeDramaCategory, false);
      } else if (state.currentView === 'manga') {
        loadMangaCatalogView(state.mangaPage + 1, false);
      }
    }
  }, { rootMargin: '800px 0px' });

  observer.observe(el.catalogSentinel);
}

function reloadActiveCatalog() {
  if (state.currentView === 'movies') {
    loadCinemaCatalog(1, state.activeCinemaCategory, true);
  } else if (state.currentView === 'dramas') {
    loadDramaCatalog(1, state.activeDramaCategory, true);
  } else if (state.currentView === 'manga') {
    loadMangaCatalogView(1, true);
  }
}

// -------------------------------------------------------------
// SEARCH FUNCTIONALITY (DRAMAS + MANGA)
// -------------------------------------------------------------
let searchTimer = null;

function setupSearchInput() {
  el.globalSearch.addEventListener('input', (e) => {
    const q = e.target.value.trim();
    state.searchQuery = q;

    if (q.length > 0) el.clearSearchBtn.classList.remove('hidden');
    else {
      el.clearSearchBtn.classList.add('hidden');
      el.searchDropdown.classList.add('hidden');
      return;
    }

    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => executeQuickSearch(q), 300);
  });

  el.globalSearch.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeFullSearch(state.searchQuery);
    } else if (e.key === 'Escape') {
      clearSearch();
    }
  });

  document.addEventListener('click', (e) => {
    if (!el.globalSearch.contains(e.target) && !el.searchDropdown.contains(e.target)) {
      el.searchDropdown.classList.add('hidden');
    }
  });
}

function clearSearch() {
  el.globalSearch.value = '';
  state.searchQuery = '';
  el.clearSearchBtn.classList.add('hidden');
  el.searchDropdown.classList.add('hidden');
}

async function executeQuickSearch(q) {
  try {
    const [cinemaRes, dramaRes, mangaRes] = await Promise.all([
      fetch(`/api/cinema/search?q=${encodeURIComponent(q)}`),
      fetch(`/api/search?q=${encodeURIComponent(q)}`),
      fetch(`/api/manga/search?q=${encodeURIComponent(q)}`)
    ]);

    const [cinemaJson, dramaJson, mangaJson] = await Promise.all([
      cinemaRes.json(),
      dramaRes.json(),
      mangaRes.json()
    ]);

    const cinemaList = (cinemaJson.data || []).slice(0, 3);
    const dramaList = (dramaJson.data || []).slice(0, 3);
    const mangaList = (mangaJson.data || []).slice(0, 3);

    if (cinemaList.length === 0 && dramaList.length === 0 && mangaList.length === 0) {
      el.searchDropdownContent.innerHTML = `<div class="p-3 text-center text-xs text-zinc-400">ไม่พบผลลัพธ์สำหรับ "${q}"</div>`;
      el.searchDropdown.classList.remove('hidden');
      return;
    }

    let html = '';
    if (cinemaList.length > 0) {
      html += '<div class="text-[10px] font-bold text-[#ff1e38] uppercase px-2 pt-1 flex items-center gap-1"><i class="fa-solid fa-clapperboard"></i> ภาพยนตร์ชนโรง (DoFree Cinema)</div>';
      html += cinemaList.map((c) => `
        <div onclick="openCinemaDetailModal('${c.id}', '${c.slug}', '${encodeURIComponent(c.link || '')}'); el.searchDropdown.classList.add('hidden');" class="flex items-center gap-3 p-2 rounded hover:bg-white/10 cursor-pointer">
          <img src="${c.poster}" class="w-9 h-12 object-cover rounded" onerror="this.src='/assets/placeholder.jpg'" />
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-white truncate">${c.title}</p>
            <div class="flex items-center gap-2 text-[10px]">
              <span class="text-amber-400"><i class="fa-solid fa-star"></i> ${c.rating || '8.8'}</span>
              <span class="bg-[#ff1e38] text-white px-1 rounded text-[9px]">1080p FHD</span>
            </div>
          </div>
        </div>
      `).join('');
    }

    if (dramaList.length > 0) {
      html += '<div class="text-[10px] font-bold text-amber-500 uppercase px-2 pt-2 border-t border-zinc-800 flex items-center gap-1"><i class="fa-solid fa-film"></i> ซีรีส์จีน</div>';
      html += dramaList.map((d) => `
        <div onclick="openDetailModal('${d.id}'); el.searchDropdown.classList.add('hidden');" class="flex items-center gap-3 p-2 rounded hover:bg-white/10 cursor-pointer">
          <img src="${d.poster}" class="w-9 h-12 object-cover rounded" onerror="this.src='/assets/placeholder.jpg'" />
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-white truncate">${d.title}</p>
            <span class="text-[10px] text-zinc-400"><i class="fa-solid fa-star text-amber-400"></i> ${d.rating || '8.0'}</span>
          </div>
        </div>
      `).join('');
    }

    if (mangaList.length > 0) {
      html += '<div class="text-[10px] font-bold text-emerald-400 uppercase px-2 pt-2 border-t border-zinc-800 flex items-center gap-1"><i class="fa-solid fa-book-open"></i> การ์ตูน / มังงะ</div>';
      html += mangaList.map((m) => `
        <div onclick="openMangaModal('${m.slug}'); el.searchDropdown.classList.add('hidden');" class="flex items-center gap-3 p-2 rounded hover:bg-white/10 cursor-pointer">
          <img src="${m.thumbnail}" class="w-9 h-12 object-cover rounded" onerror="this.src='/assets/placeholder.jpg'" />
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-white truncate">${m.title}</p>
            <span class="text-[10px] text-emerald-400">อ่านฟรี HD</span>
          </div>
        </div>
      `).join('');
    }

    el.searchDropdownContent.innerHTML = html;
    el.searchDropdown.classList.remove('hidden');
  } catch (err) {
    console.error('Quick search error:', err);
  }
}

async function executeFullSearch(q) {
  if (!q) return;
  el.searchDropdown.classList.add('hidden');
  state.currentView = 'search';
  el.homeView.classList.add('hidden');
  el.catalogView.classList.remove('hidden');
  el.dramaCategoryChipsWrapper.classList.add('hidden');

  el.catalogTitle.textContent = `ผลการค้นหา: "${q}"`;
  el.catalogBadge.textContent = 'ค้นหา';
  el.catalogGrid.innerHTML = '';
  el.catalogLoading.classList.remove('hidden');

  try {
    const [cinemaRes, dramaRes, mangaRes] = await Promise.all([
      fetch(`/api/cinema/search?q=${encodeURIComponent(q)}`),
      fetch(`/api/search?q=${encodeURIComponent(q)}`),
      fetch(`/api/manga/search?q=${encodeURIComponent(q)}`)
    ]);

    const [cinemaJson, dramaJson, mangaJson] = await Promise.all([
      cinemaRes.json(),
      dramaRes.json(),
      mangaRes.json()
    ]);
    el.catalogLoading.classList.add('hidden');

    const total = (cinemaJson.data?.length || 0) + (dramaJson.data?.length || 0) + (mangaJson.data?.length || 0);
    el.catalogCount.textContent = `พบทั้งหมด ${total} รายการ`;

    let html = '';
    if (cinemaJson.data) {
      html += cinemaJson.data.map((c) => `
        <div class="dofree-card w-full aspect-[2/3] border border-zinc-800 group" onclick="openCinemaDetailModal('${c.id}', '${c.slug}', '${encodeURIComponent(c.link || '')}')">
          <img src="${c.poster}" alt="${c.title}" class="w-full h-full object-cover" onerror="this.src='/assets/placeholder.jpg'" />
          <div class="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
            <span class="text-[9px] bg-[#ff1e38] text-white px-1.5 py-0.5 rounded w-max mb-1">ภาพยนตร์ 1080p</span>
            <h4 class="text-xs font-bold text-white line-clamp-1">${c.title}</h4>
          </div>
        </div>
      `).join('');
    }

    if (dramaJson.data) {
      html += dramaJson.data.map((d) => `
        <div class="dofree-card w-full aspect-[2/3] border border-zinc-800 group" onclick="openDetailModal('${d.id}')">
          <img src="${d.poster}" alt="${d.title}" class="w-full h-full object-cover" onerror="this.src='/assets/placeholder.jpg'" />
          <div class="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
            <span class="text-[9px] bg-amber-600 text-white px-1.5 py-0.5 rounded w-max mb-1">ซีรีส์จีน</span>
            <h4 class="text-xs font-bold text-white line-clamp-1">${d.title}</h4>
          </div>
        </div>
      `).join('');
    }

    if (mangaJson.data) {
      html += mangaJson.data.map((m) => `
        <div class="dofree-card w-full aspect-[3/4] border border-zinc-800 group" onclick="openMangaModal('${m.slug}')">
          <img src="${m.thumbnail}" alt="${m.title}" class="w-full h-full object-cover" onerror="this.src='/assets/placeholder.jpg'" />
          <div class="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
            <span class="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded w-max mb-1">มังงะ</span>
            <h4 class="text-xs font-bold text-white line-clamp-2">${m.title}</h4>
          </div>
        </div>
      `).join('');
    }

    el.catalogGrid.innerHTML = html || '<div class="col-span-full py-20 text-center text-zinc-500">ไม่พบรายการที่ค้นหา</div>';
  } catch (err) {
    el.catalogLoading.classList.add('hidden');
    console.error('Full search error:', err);
  }
}

// -------------------------------------------------------------
// FAVORITES & HISTORY
// -------------------------------------------------------------
function toggleFavorite(id, rawTitle, rawPoster) {
  const title = decodeURIComponent(rawTitle);
  const poster = decodeURIComponent(rawPoster);

  if (state.favorites[id]) {
    delete state.favorites[id];
    showToast('ลบออกจากรายการของฉันแล้ว', 'info');
  } else {
    state.favorites[id] = { id, title, poster, addedAt: Date.now() };
    showToast('เพิ่มลงในรายการของฉันแล้ว', 'success');
  }

  localStorage.setItem('cm_favs', JSON.stringify(state.favorites));
  if (state.currentView === 'favorites') renderFavoritesView();
}

function renderFavoritesView() {
  const items = Object.values(state.favorites).sort((a, b) => b.addedAt - a.addedAt);
  el.catalogTitle.textContent = 'รายการของฉัน (My List)';
  el.catalogBadge.textContent = `${items.length} เรื่อง`;
  el.catalogCount.textContent = `${items.length} เรื่อง`;
  el.catalogLoading.classList.add('hidden');
  el.catalogEnd.classList.add('hidden');

  if (items.length === 0) {
    el.catalogGrid.innerHTML = `
      <div class="col-span-full py-24 text-center text-zinc-500 space-y-2">
        <i class="fa-solid fa-heart text-4xl mb-2 text-zinc-600 block"></i>
        <p class="text-base font-semibold text-zinc-300">ยังไม่มีรายการในลิสต์ของคุณ</p>
        <p class="text-xs text-zinc-500">กดปุ่มเครื่องหมายบวก (+) เพื่อบันทึกซีรีส์ไว้ดูในภายหลัง</p>
      </div>
    `;
    return;
  }

  el.catalogGrid.innerHTML = items.map((item) => `
    <div class="dofree-card w-full aspect-[2/3] border border-zinc-800 group" onclick="openDetailModal('${item.id}')">
      <img src="${item.poster}" alt="${item.title}" class="w-full h-full object-cover" />
      <div class="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
        <h4 class="text-xs font-bold text-white line-clamp-1">${item.title}</h4>
        <div class="flex items-center gap-2 mt-2">
          <button onclick="event.stopPropagation(); playMovieDirect('${item.id}')" class="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center">
            <i class="fa-solid fa-play ml-0.5 text-xs"></i>
          </button>
          <button onclick="event.stopPropagation(); toggleFavorite('${item.id}', '${encodeURIComponent(item.title)}', '${encodeURIComponent(item.poster)}')" class="w-7 h-7 rounded-full bg-zinc-800 text-[#ff1e38] flex items-center justify-center border border-zinc-700">
            <i class="fa-solid fa-trash-can text-xs"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderHistoryView() {
  const dramaItems = Object.values(state.history).sort((a, b) => b.timestamp - a.timestamp);
  const mangaItems = Object.values(state.mangaHistory).sort((a, b) => b.timestamp - a.timestamp);

  el.catalogTitle.textContent = 'ประวัติการรับชมและอ่านมังงะ';
  el.catalogBadge.textContent = `${dramaItems.length + mangaItems.length} รายการ`;
  el.catalogCount.textContent = `${dramaItems.length} ซีรีส์ / ${mangaItems.length} มังงะ`;
  el.catalogLoading.classList.add('hidden');
  el.catalogEnd.classList.add('hidden');

  let html = '';
  dramaItems.forEach((d) => {
    const progress = d.duration > 0 ? Math.min(100, Math.round((d.time / d.duration) * 100)) : 0;
    html += `
      <div class="dofree-card w-full aspect-[2/3] border border-zinc-800 group" onclick="openDetailModal('${d.id}')">
        <img src="${d.poster}" alt="${d.title}" class="w-full h-full object-cover" />
        <div class="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent p-3 flex flex-col justify-end">
          <span class="text-[9px] bg-[#ff1e38] text-white px-1.5 py-0.5 rounded w-max mb-1">ซีรีส์จีน</span>
          <h4 class="text-xs font-bold text-white line-clamp-1">${d.title}</h4>
          <span class="text-[10px] text-zinc-400 mt-0.5">ดูไปแล้ว ${progress}%</span>
        </div>
        <div class="absolute bottom-0 left-0 right-0 watch-progress-bar">
          <div class="watch-progress-fill" style="width: ${progress}%;"></div>
        </div>
      </div>
    `;
  });

  mangaItems.forEach((m) => {
    html += `
      <div class="dofree-card w-full aspect-[3/4] border border-zinc-800 group" onclick="openMangaModal('${m.slug}')">
        <img src="${m.thumbnail}" alt="${m.title}" class="w-full h-full object-cover" />
        <div class="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent p-3 flex flex-col justify-end">
          <span class="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded w-max mb-1">มังงะ</span>
          <h4 class="text-xs font-bold text-white line-clamp-2">${m.title}</h4>
          <span class="text-[10px] text-emerald-400 mt-1">อ่านค้างที่: ตอนที่ ${m.lastChapterNum}</span>
        </div>
      </div>
    `;
  });

  el.catalogGrid.innerHTML = html || '<div class="col-span-full py-24 text-center text-zinc-500">ยังไม่มีประวัติการดูหรืออ่าน</div>';
}

// -------------------------------------------------------------
// MANGA SUBSYSTEM (MODAL & ZERO-STORAGE READER)
// -------------------------------------------------------------
async function openMangaModal(slug) {
  el.mangaModalTitle.textContent = 'กำลังดึงสารบัญ...';
  el.mangaModalSynopsis.textContent = 'กำลังโหลดรายละเอียดและรายชื่อตอน...';
  el.mangaChapterList.innerHTML = '';
  el.mangaModal.classList.remove('hidden');
  el.mangaModal.classList.add('flex');

  try {
    const res = await fetch(`/api/manga/detail?slug=${encodeURIComponent(slug)}`);
    const json = await res.json();
    if (!json.success) throw new Error('Cannot load manga detail');

    const manga = json.data;
    state.activeManga = manga;

    el.mangaModalCover.src = manga.thumbnail;
    el.mangaModalTitle.textContent = manga.title;
    el.mangaModalChCount.textContent = `ทั้งหมด ${manga.totalChapters} ตอน`;
    el.mangaModalSynopsis.textContent = manga.synopsis || 'ไม่มีเรื่องย่อ';

    // Render Chapters
    el.mangaChapterList.innerHTML = manga.chapters.map((ch) => `
      <button 
        onclick="openReader('${encodeURIComponent(ch.url)}', '${ch.number}')"
        class="bg-zinc-800 hover:bg-emerald-600 text-zinc-200 hover:text-white p-2 rounded text-xs font-medium border border-zinc-700 hover:border-emerald-500 transition-colors text-center cursor-pointer">
        ตอนที่ ${ch.number}
      </button>
    `).join('');
  } catch (err) {
    console.error('Manga modal error:', err);
    el.mangaModalTitle.textContent = 'เกิดข้อผิดพลาดในการโหลดสารบัญ';
  }
}

function closeMangaModal() {
  el.mangaModal.classList.add('hidden');
  el.mangaModal.classList.remove('flex');
}

function readFirstChapter() {
  if (state.activeManga && state.activeManga.chapters.length > 0) {
    const firstCh = state.activeManga.chapters[state.activeManga.chapters.length - 1];
    openReader(encodeURIComponent(firstCh.url), firstCh.number);
  }
}

function readLatestChapter() {
  if (state.activeManga && state.activeManga.chapters.length > 0) {
    const latestCh = state.activeManga.chapters[0];
    openReader(encodeURIComponent(latestCh.url), latestCh.number);
  }
}

async function openReader(encodedUrl, chapterNum = '') {
  closeMangaModal();
  el.readerModal.classList.remove('hidden');
  el.readerModal.classList.add('flex');
  el.readerModal.scrollTop = 0;
  el.mangaStreamWrap.innerHTML = '';
  el.readerLoading.classList.remove('hidden');
  el.readerBottomNav.classList.add('hidden');

  try {
    const res = await fetch(`/api/manga/chapter?url=${encodedUrl}`);
    const json = await res.json();
    el.readerLoading.classList.add('hidden');

    if (!json.success || !json.data) throw new Error('Cannot load chapter');

    const data = json.data;
    state.currentChapterData = data;

    el.readerChapterTitle.textContent = data.title;
    el.readerPageCount.textContent = `${data.count} หน้า (HD)`;

    // Prev / Next button state
    el.readerPrevBtn.disabled = !data.prevUrl;
    el.readerNextBtn.disabled = !data.nextUrl;
    el.readerBottomPrev.disabled = !data.prevUrl;
    el.readerBottomNext.disabled = !data.nextUrl;

    // Populate Chapter Selector
    if (state.activeManga) {
      el.readerChapterSelect.innerHTML = state.activeManga.chapters.map((ch) => `
        <option value="${encodeURIComponent(ch.url)}" ${decodeURIComponent(encodedUrl) === ch.url ? 'selected' : ''}>
          ตอนที่ ${ch.number}
        </option>
      `).join('');

      // Save to manga reading history
      state.mangaHistory[state.activeManga.slug] = {
        slug: state.activeManga.slug,
        title: state.activeManga.title,
        thumbnail: state.activeManga.thumbnail,
        lastChapterNum: chapterNum || 'ล่าสุด',
        lastChapterUrl: decodeURIComponent(encodedUrl),
        timestamp: Date.now()
      };
      localStorage.setItem('cm_manga_hist', JSON.stringify(state.mangaHistory));
    }

    // Render Continuous Images
    el.mangaStreamWrap.innerHTML = data.images.map((img) => `
      <img 
        src="${img}" 
        loading="lazy" 
        decoding="async" 
        alt="Page" 
        class="manga-page-img"
        onerror="this.src='/assets/placeholder.jpg'"
      />
    `).join('');

    el.readerBottomNav.classList.remove('hidden');
  } catch (err) {
    el.readerLoading.classList.add('hidden');
    console.error('Reader error:', err);
    el.mangaStreamWrap.innerHTML = '<div class="py-20 text-center text-[#ff1e38]">เกิดข้อผิดพลาดในการโหลดรูปภาพของตอนนี้</div>';
  }
}

function closeReader() {
  el.readerModal.classList.add('hidden');
  el.readerModal.classList.remove('flex');
}

function onChapterSelectChange(encodedUrl) {
  openReader(encodedUrl);
}

function navigateChapter(direction) {
  if (!state.currentChapterData) return;
  const targetUrl = direction === 'prev' ? state.currentChapterData.prevUrl : state.currentChapterData.nextUrl;
  if (targetUrl) {
    openReader(encodeURIComponent(targetUrl));
  }
}

// -------------------------------------------------------------
// CINEMA & DRAMA VIDEO STREAMING SUBSYSTEM
// -------------------------------------------------------------
async function openCinemaDetailModal(id, slug, encodedLink) {
  el.modalTitle.textContent = 'กำลังดึงข้อมูลภาพยนตร์...';
  el.modalDescription.textContent = 'กำลังโหลดเรื่องย่อและค้นหาสัญญาณสตรีม Full HD...';
  el.modalRelatedGrid.innerHTML = '';
  el.detailModal.classList.remove('hidden');
  el.detailModal.classList.add('flex');

  try {
    const linkParam = encodedLink ? `&link=${encodedLink}` : '';
    const res = await fetch(`/api/cinema/detail?id=${id || ''}&slug=${slug || ''}${linkParam}`);
    const json = await res.json();
    if (!json.success || !json.data) throw new Error('Cannot load cinema details');

    const movie = json.data;
    state.activeMovie = movie;

    el.modalBannerImg.src = movie.poster;
    el.modalTitle.textContent = movie.title;
    
    // Format track info into badge
    let audioBadge = '1080p Full HD';
    if (movie.tracks && movie.tracks.length > 0) {
      const trackNames = movie.tracks.map((t) => t.name).join(' / ');
      audioBadge = `เสียง: ${trackNames}`;
    }
    el.modalGenreText.textContent = `ภาพยนตร์ชนโรง • ${audioBadge}`;
    el.modalRating.textContent = movie.rating || '8.8';
    el.modalViews.textContent = `${movie.year || '2026'} • ชนโรง`;
    el.modalDescription.textContent = movie.synopsis || 'รับชมภาพยนตร์เต็มเรื่อง คมชัดระดับ Full HD 1080p ผ่านเครื่องเล่นสตรีมมิ่งความเร็วสูง';

    el.modalFavBtn.innerHTML = state.favorites[movie.id]
      ? '<i class="fa-solid fa-check text-emerald-400"></i>'
      : '<i class="fa-solid fa-plus"></i>';
  } catch (err) {
    console.error('Cinema detail modal error:', err);
    el.modalTitle.textContent = 'เกิดข้อผิดพลาดในการโหลดข้อมูลภาพยนตร์';
  }
}

async function playCinemaDirect(id, slug, encodedLink) {
  try {
    const linkParam = encodedLink ? `&link=${encodedLink}` : '';
    const res = await fetch(`/api/cinema/detail?id=${id || ''}&slug=${slug || ''}${linkParam}`);
    const json = await res.json();
    if (json.success && json.data) {
      playMovie(json.data);
    } else {
      showToast('ไม่พบสัญญาณสตรีมของภาพยนตร์เรื่องนี้', 'error');
    }
  } catch (err) {
    showToast('ไม่สามารถเปิดเล่นภาพยนตร์ได้', 'error');
  }
}

async function openDetailModal(id) {
  el.modalTitle.textContent = 'กำลังดึงข้อมูล...';
  el.modalDescription.textContent = 'กำลังโหลดเรื่องย่อ...';
  el.modalRelatedGrid.innerHTML = '';
  el.detailModal.classList.remove('hidden');
  el.detailModal.classList.add('flex');

  try {
    const res = await fetch(`/api/movie/${id}`);
    const json = await res.json();
    if (!json.success) throw new Error('Cannot load movie details');

    const movie = json.data;
    state.activeMovie = movie;

    el.modalBannerImg.src = movie.poster;
    el.modalTitle.textContent = movie.title;
    el.modalGenreText.textContent = movie.genre || 'ความรัก / ซีรีส์จีน';
    el.modalRating.textContent = movie.rating || '8.5';
    el.modalViews.textContent = `${movie.views || '1,000'} ครั้ง`;
    el.modalDescription.textContent = movie.description || 'ไม่มีเรื่องย่อ';

    // Favorite state
    el.modalFavBtn.innerHTML = state.favorites[movie.id]
      ? '<i class="fa-solid fa-check text-emerald-400"></i>'
      : '<i class="fa-solid fa-plus"></i>';

    // Related
    if (movie.related) {
      el.modalRelatedGrid.innerHTML = movie.related.map((rel) => `
        <div class="dofree-card aspect-[2/3] border border-zinc-800 group" onclick="openDetailModal('${rel.id}')">
          <img src="${rel.poster}" alt="${rel.title}" class="w-full h-full object-cover" />
          <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
            <p class="text-[10px] text-white font-bold line-clamp-1">${rel.title}</p>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Modal error:', err);
    el.modalTitle.textContent = 'เกิดข้อผิดพลาดในการโหลดข้อมูล';
  }
}

function closeDetailModal() {
  el.detailModal.classList.add('hidden');
  el.detailModal.classList.remove('flex');
}

function playCurrentModalMovie() {
  if (state.activeMovie) {
    closeDetailModal();
    playMovie(state.activeMovie);
  }
}

function toggleFavoriteFromModal() {
  if (state.activeMovie) {
    toggleFavorite(state.activeMovie.id, encodeURIComponent(state.activeMovie.title), encodeURIComponent(state.activeMovie.poster));
    el.modalFavBtn.innerHTML = state.favorites[state.activeMovie.id]
      ? '<i class="fa-solid fa-check text-emerald-400"></i>'
      : '<i class="fa-solid fa-plus"></i>';
  }
}

async function playMovieDirect(id) {
  try {
    const res = await fetch(`/api/movie/${id}`);
    const json = await res.json();
    if (json.success) playMovie(json.data);
  } catch (err) {
    showToast('ไม่สามารถเปิดเล่นวิดีโอได้', 'error');
  }
}

function safePlay(video) {
  try {
    const p = video.play();
    if (p !== undefined) {
      p.catch((err) => {
        if (err.name !== 'AbortError') console.warn('Play interrupted:', err.message);
      });
    }
  } catch (e) {}
}

function playMovie(movie) {
  state.activeMovie = movie;
  state.activeStreamSource = 'proxy';

  el.playerMovieTitle.textContent = movie.title;
  el.playerMovieGenre.textContent = movie.genre || (movie.isCinema ? 'ภาพยนตร์ทั่วไป 1080p Full HD' : 'มินิซีรีส์จีน');
  el.playerServerIndicator.textContent = 'Local Relay Proxy (100% Bypass)';
  el.sourceSwitchBtn.innerHTML = '<i class="fa-solid fa-bolt text-amber-400"></i> พร็อกซีความเร็วสูง';

  el.playerModal.classList.remove('hidden');
  el.playerModal.classList.add('flex');
  el.playerBuffering.classList.remove('hidden');

  loadVideoStream(movie.proxyStreamUrl || movie.streamUrl);
}

function loadVideoStream(streamUrl) {
  if (!streamUrl) {
    showToast('ไม่พบลิงก์สัญญาณสตรีมวิดีโอ', 'error');
    el.playerBuffering.classList.add('hidden');
    return;
  }

  const video = el.video;
  try { video.pause(); } catch (e) {}

  if (state.hls) {
    try { state.hls.destroy(); } catch (e) {}
    state.hls = null;
  }

  if (Hls.isSupported()) {
    const hls = new Hls({
      capLevelToPlayerSize: true,
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
      enableWorker: true
    });

    state.hls = hls;
    hls.loadSource(streamUrl);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      resumeWatchProgress();
      safePlay(video);
      el.playerBuffering.classList.add('hidden');
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            if (state.activeStreamSource === 'primary') {
              switchStreamSource('proxy');
            } else {
              hls.startLoad();
            }
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            hls.recoverMediaError();
            break;
          default:
            switchStreamSource('proxy');
            break;
        }
      }
    });

  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = streamUrl;
    video.addEventListener('loadedmetadata', () => {
      resumeWatchProgress();
      safePlay(video);
      el.playerBuffering.classList.add('hidden');
    }, { once: true });
  } else {
    showToast('เบราว์เซอร์ไม่รองรับ HLS', 'error');
  }
}

function switchStreamSource(forcedTarget) {
  if (!state.activeMovie) return;
  const m = state.activeMovie;
  let target = forcedTarget;

  if (!target) {
    if (state.activeStreamSource === 'proxy') target = 'primary';
    else if (state.activeStreamSource === 'primary') target = 'mirror';
    else target = 'proxy';
  }

  state.activeStreamSource = target;
  if (target === 'proxy') {
    el.playerServerIndicator.textContent = 'Local Relay Proxy (100% Bypass)';
    el.sourceSwitchBtn.innerHTML = '<i class="fa-solid fa-bolt text-amber-400"></i> พร็อกซีความเร็วสูง';
    showToast('สลับไปยัง Local Proxy Conduit (กัน 403)', 'success');
    loadVideoStream(m.proxyStreamUrl || m.streamUrl);
  } else if (target === 'primary') {
    el.playerServerIndicator.textContent = 'BunnyCDN Direct';
    el.sourceSwitchBtn.innerHTML = '<i class="fa-solid fa-server text-[#ff1e38]"></i> เซิร์ฟเวอร์หลัก (CDN)';
    showToast('สลับไปยัง BunnyCDN Direct', 'info');
    loadVideoStream(m.streamUrl);
  } else {
    el.playerServerIndicator.textContent = 'Stream Mirror (XYZ)';
    el.sourceSwitchBtn.innerHTML = '<i class="fa-solid fa-network-wired text-cyan-400"></i> เซิร์ฟเวอร์สำรอง (XYZ)';
    showToast('สลับไปยังเซิร์ฟเวอร์สำรอง (XYZ)', 'info');
    loadVideoStream(m.mirrorStreamUrl);
  }
}

function resumeWatchProgress() {
  if (!state.activeMovie) return;
  const historyItem = state.history[state.activeMovie.id];
  if (historyItem && historyItem.time > 10 && historyItem.time < historyItem.duration - 15) {
    el.video.currentTime = historyItem.time;
    showToast(`เล่นต่อจากนาทีที่ ${formatTime(historyItem.time)}`, 'info');
  }
}

function closePlayer() {
  el.playerModal.classList.add('hidden');
  el.playerModal.classList.remove('flex');
  el.video.pause();
  if (state.hls) {
    try { state.hls.destroy(); } catch (e) {}
    state.hls = null;
  }
  el.video.removeAttribute('src');
  el.video.load();
}

function setupVideoEvents() {
  const video = el.video;
  video.addEventListener('timeupdate', () => {
    if (!video.duration) return;
    const current = video.currentTime;
    const duration = video.duration;
    const percent = (current / duration) * 100;

    el.playerProgressBar.style.width = `${percent}%`;
    el.playerCurrentTime.textContent = formatTime(current);
    el.playerDuration.textContent = formatTime(duration);

    if (state.activeMovie && Math.floor(current) % 4 === 0) {
      state.history[state.activeMovie.id] = {
        id: state.activeMovie.id,
        title: state.activeMovie.title,
        poster: state.activeMovie.poster,
        time: Math.floor(current),
        duration: Math.floor(duration),
        timestamp: Date.now()
      };
      localStorage.setItem('cm_history', JSON.stringify(state.history));
    }
  });

  video.addEventListener('play', () => {
    el.bottomPlayBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    el.middlePlayIcon.innerHTML = '<i class="fa-solid fa-pause text-2xl"></i>';
    el.playerBuffering.classList.add('hidden');
  });

  video.addEventListener('pause', () => {
    el.bottomPlayBtn.innerHTML = '<i class="fa-solid fa-play ml-0.5"></i>';
    el.middlePlayIcon.innerHTML = '<i class="fa-solid fa-play text-2xl ml-1"></i>';
  });

  video.addEventListener('waiting', () => el.playerBuffering.classList.remove('hidden'));
  video.addEventListener('playing', () => el.playerBuffering.classList.add('hidden'));
}

function togglePlayPause() {
  if (el.video.paused) el.video.play();
  else el.video.pause();
}

function skipSeconds(sec) {
  if (!el.video.duration) return;
  el.video.currentTime = Math.max(0, Math.min(el.video.duration, el.video.currentTime + sec));
}

function seekVideo(e) {
  const rect = document.getElementById('progressBarContainer').getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  if (el.video.duration) el.video.currentTime = ratio * el.video.duration;
}

function changeVolume(val) {
  el.video.volume = val;
  if (val == 0) el.volumeBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
  else if (val < 0.5) el.volumeBtn.innerHTML = '<i class="fa-solid fa-volume-low"></i>';
  else el.volumeBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
}

function toggleMute() {
  el.video.muted = !el.video.muted;
  if (el.video.muted) el.volumeBtn.innerHTML = '<i class="fa-solid fa-volume-xmark text-[#ff1e38]"></i>';
  else changeVolume(el.video.volume);
}

function changePlaybackSpeed(speed) {
  el.video.playbackRate = parseFloat(speed);
}

function toggleTheaterFullscreen() {
  if (!document.fullscreenElement) el.playerModal.requestFullscreen().catch(() => {});
  else document.exitFullscreen().catch(() => {});
}

// -------------------------------------------------------------
// SHORTCUTS & HELPERS
// -------------------------------------------------------------

// -------------------------------------------------------------
// PWA & iOS ADD-TO-HOME SUPPORT
// -------------------------------------------------------------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('DoFree SW registered:', reg.scope))
      .catch((err) => console.warn('DoFree SW registration failed:', err));
  });
}

function showIosInstallGuide() {
  const modal = document.getElementById('iosInstallModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeIosInstallGuide() {
  const modal = document.getElementById('iosInstallModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function switchCategoryTab(type) {
  const tabCinema = document.getElementById('catTabCinema');
  const tabDrama = document.getElementById('catTabDrama');
  const tabManga = document.getElementById('catTabManga');

  [tabCinema, tabDrama, tabManga].forEach((b) => {
    if (b) {
      b.className = 'flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white/5 hover:bg-white/10 text-zinc-300 transition-all flex-shrink-0 cursor-pointer border border-white/10';
    }
  });

  if (type === 'movies') {
    if (tabCinema) tabCinema.className = 'flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#ff1e38] text-white transition-all shadow-md flex-shrink-0 cursor-pointer';
    filterCinemaCategory(state.activeCinemaCategory || 0);
  } else if (type === 'dramas') {
    if (tabDrama) tabDrama.className = 'flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#ff1e38] text-white transition-all shadow-md flex-shrink-0 cursor-pointer';
    filterDramaCategory(state.activeDramaCategory || 0);
  } else if (type === 'manga') {
    if (tabManga) tabManga.className = 'flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-[#ff1e38] text-white transition-all shadow-md flex-shrink-0 cursor-pointer';
    state.currentView = 'manga';
    el.homeView.classList.add('hidden');
    el.catalogView.classList.remove('hidden');
    el.dramaCategoryChipsWrapper.classList.add('hidden');
    loadMangaCatalogView(1, true);
  }
}

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    const isPlayerOpen = !el.playerModal.classList.contains('hidden');
    const isReaderOpen = !el.readerModal.classList.contains('hidden');

    if (e.code === 'Space' || e.key === 'k') {
      if (isPlayerOpen) {
        e.preventDefault();
        togglePlayPause();
      }
    } else if (e.key === 'ArrowLeft' || e.key === 'j') {
      if (isPlayerOpen) {
        e.preventDefault();
        skipSeconds(-10);
      } else if (isReaderOpen) {
        navigateChapter('prev');
      }
    } else if (e.key === 'ArrowRight' || e.key === 'l') {
      if (isPlayerOpen) {
        e.preventDefault();
        skipSeconds(10);
      } else if (isReaderOpen) {
        navigateChapter('next');
      }
    } else if (e.key === 'Escape') {
      if (isPlayerOpen) closePlayer();
      else if (isReaderOpen) closeReader();
      else if (!el.detailModal.classList.contains('hidden')) closeDetailModal();
      else if (!el.mangaModal.classList.contains('hidden')) closeMangaModal();
    }
  });
}

function formatTime(seconds) {
  if (isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function showToast(title, icon = 'info') {
  if (window.Swal) {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: icon,
      title: title,
      showConfirmButton: false,
      timer: 2000,
      background: '#181818',
      color: '#ffffff',
      customClass: {
        popup: 'border border-zinc-700 rounded shadow-2xl'
      }
    });
  }
}
