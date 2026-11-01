// server.js
// javascript / server.js / node v26.13.0 / web / backend bridge & static host

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const UPSTREAM_ORIGIN = 'https://www.xn--72c9ab1ec1bc6q.online';
const STREAM_CDN_MIRROR = 'https://stream.xn--72c9ab1ec1bc6q.xyz';
const CINEMA_ORIGIN = 'https://www.24hd.today';

app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory TTL Cache
const cacheStore = new Map();

function getCached(key, ttlMs, fetcher) {
  const now = Date.now();
  const entry = cacheStore.get(key);
  if (entry && entry.expiresAt > now) {
    return Promise.resolve(entry.value);
  }
  return fetcher().then((value) => {
    cacheStore.set(key, { value, expiresAt: now + ttlMs });
    return value;
  });
}

// Category Taxonomy
const CATEGORIES = [
  { id: 0, name: 'ทั้งหมด', icon: 'fa-film', count: 2700 },
  { id: 5, name: 'ซีรีส์มาใหม่', icon: 'fa-sparkles', count: 22 },
  { id: 26, name: 'ซีรีส์แนะนำ', icon: 'fa-fire', count: 6 },
  { id: 15, name: 'ความรัก', icon: 'fa-heart', count: 1018 },
  { id: 13, name: 'แก้แค้น', icon: 'fa-skull-crossbones', count: 181 },
  { id: 23, name: 'พลิกเกม', icon: 'fa-chess', count: 285 },
  { id: 16, name: 'ข้ามมิติ', icon: 'fa-clock-rotate-left', count: 72 },
  { id: 22, name: 'ย้อนยุค', icon: 'fa-landmark', count: 218 },
  { id: 19, name: 'เทพเซียน', icon: 'fa-wand-magic-sparkles', count: 137 },
  { id: 17, name: 'เกิดใหม่', icon: 'fa-arrows-rotate', count: 85 },
  { id: 18, name: 'แอ็คชั่น', icon: 'fa-bolt', count: 60 },
  { id: 2, name: 'ดราม่า', icon: 'fa-masks-theater', count: 99 },
  { id: 1, name: 'ครอบครัว', icon: 'fa-users', count: 99 },
  { id: 14, name: 'คอมเมดี้', icon: 'fa-face-laugh-beam', count: 32 },
  { id: 25, name: 'ซับไทย', icon: 'fa-closed-captioning', count: 248 }
];

// DoFree Cinema Category Taxonomy
const CINEMA_CATEGORIES = [
  { id: 0, name: 'ภาพยนตร์ทั้งหมด', icon: 'fa-film', count: 12000 },
  { id: 31, name: 'หนังชนโรง', icon: 'fa-ticket', count: 1800 },
  { id: 46868, name: 'หนังใหม่ 2026', icon: 'fa-sparkles', count: 1280 },
  { id: 12, name: 'แอ็คชั่นบู๊เดือด', icon: 'fa-bolt', count: 2100 },
  { id: 223, name: 'หนังฝรั่ง / ฮอลลีวูด', icon: 'fa-earth-americas', count: 4200 },
  { id: 35, name: 'หนังไทย', icon: 'fa-flag', count: 1172 },
  { id: 5455, name: 'หนังเกาหลี', icon: 'fa-tv', count: 1005 },
  { id: 10, name: 'Netflix', icon: 'fa-n', count: 850 },
  { id: 22, name: 'สยองขวัญ / ผี', icon: 'fa-ghost', count: 960 },
  { id: 15, name: 'แอนิเมชั่น / การ์ตูน', icon: 'fa-wand-magic-sparkles', count: 1432 },
  { id: 26, name: 'ไซไฟ / แฟนตาซี', icon: 'fa-rocket', count: 780 },
  { id: 14, name: 'คอมเมดี้ / ตลก', icon: 'fa-face-laugh-beam', count: 1120 },
  { id: 25, name: 'โรแมนติก', icon: 'fa-heart', count: 3302 }
];

// Parser: Movie Cards from load_more_movies.php
function parseMovieCards(html) {
  const blocks = html.split(/<div class=["']movie-card/i).slice(1);
  const cards = [];

  for (const block of blocks) {
    const idMatch = block.match(/href=["']movie-article\.php\?id=(\d+)["']/i);
    if (!idMatch) continue;
    const id = idMatch[1];

    const imgTagMatch = block.match(/<img\b([^>]+)>/i);
    let poster = '';
    let title = '';
    if (imgTagMatch) {
      const srcMatch = imgTagMatch[1].match(/\bsrc=["']([^"']+)["']/i);
      const altMatch = imgTagMatch[1].match(/\balt=["']([^"']+)["']/i);
      if (srcMatch) poster = srcMatch[1];
      if (altMatch) title = altMatch[1];
    }

    const titleMatch = block.match(/<h5[^>]*>(.*?)<\/h5>/i);
    if (titleMatch && !title) {
      title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
    }

    const viewMatch = block.match(/<i class=["']fas fa-eye[^"']*["']><\/i>\s*([0-9,]+)/i);
    const ratingMatch = block.match(/<i class=["']fas fa-star[^"']*["']><\/i>\s*([0-9.]+)/i);

    // Normalize poster URL
    let fullPoster = poster;
    if (poster && !poster.startsWith('http')) {
      fullPoster = `${UPSTREAM_ORIGIN}/${poster.replace(/^\//, '')}`;
    }

    cards.push({
      id,
      title: (title || `หนังจีนเรื่องที่ ${id}`).replace(/<[^>]+>/g, '').trim(),
      poster: fullPoster || '/assets/placeholder.jpg',
      views: viewMatch ? viewMatch[1] : '300+',
      rating: ratingMatch ? ratingMatch[1] : '7.5'
    });
  }

  return cards;
}

// Upstream fetch: Movie list
async function fetchMovies(page = 1, categoryId = 0) {
  try {
    const form = new URLSearchParams();
    form.append('action', 'load_more_movies');
    form.append('page', String(page));
    form.append('category_id', String(categoryId));

    const response = await fetch(`${UPSTREAM_ORIGIN}/load_more_movies.php`, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9,th;q=0.8',
        'Origin': UPSTREAM_ORIGIN,
        'Referer': UPSTREAM_ORIGIN + '/',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      },
      body: form.toString()
    });

    if (!response.ok) {
      console.warn(`Upstream drama returned HTTP ${response.status}`);
      return [];
    }

    const html = await response.text();
    return parseMovieCards(html);
  } catch (err) {
    console.warn('fetchMovies upstream exception:', err.message);
    return [];
  }
}

// Upstream fetch: Movie Detail & Stream Link
async function fetchMovieDetails(id) {
  const response = await fetch(`${UPSTREAM_ORIGIN}/movie-article.php?id=${id}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': UPSTREAM_ORIGIN + '/',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  });

  if (!response.ok) {
    throw new Error(`Upstream returned HTTP ${response.status}`);
  }

  const html = await response.text();

  // 1. Title
  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  let title = h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim() : '';

  // 2. Poster
  const ogImgMatch = html.match(/<meta property=["']og:image["'] content=["']([^"']+)["']/i);
  let poster = ogImgMatch ? ogImgMatch[1] : '';

  // 3. Stream URL
  let streamUrl = '';
  const vidMatch = html.match(/data-video-url=["']([^"']+)["']/i);
  if (vidMatch) streamUrl = vidMatch[1];

  // Fallback to direct-video.php
  if (!streamUrl) {
    try {
      const res2 = await fetch(`${UPSTREAM_ORIGIN}/direct-video.php?id=${id}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (res2.ok) {
        const html2 = await res2.text();
        const m = html2.match(/let videoURL = ["']([^"']+)["']/i);
        if (m) streamUrl = m[1];
        if (!title) {
          const tMatch = html2.match(/<title>(.*?)<\/title>/i);
          if (tMatch) title = tMatch[1].split('-')[0].trim();
        }
      }
    } catch (e) {
      console.error(`Direct fallback error for ${id}:`, e.message);
    }
  }

  // 4. Description & Genre from JSON-LD
  let description = '';
  let genre = '';
  const jsonLdMatch = html.match(/<script type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/i);
  if (jsonLdMatch) {
    try {
      const data = JSON.parse(jsonLdMatch[1]);
      if (data.description) description = data.description;
      if (data.genre) genre = data.genre;
      if (!poster && data.image) poster = data.image;
      if (!streamUrl && data.video && data.video.contentUrl) streamUrl = data.video.contentUrl;
    } catch (e) {}
  }

  if (!description) {
    const metaDesc = html.match(/<meta name=["']description["'] content=["']([^"']+)["']/i);
    if (metaDesc) description = metaDesc[1];
  }

  // 5. Views & Rating
  const viewMatch = html.match(/<i class=["']fas fa-eye[^"']*["']><\/i>\s*([0-9,]+)/i);
  const ratingMatch = html.match(/<i class=["']fas fa-star[^"']*["']><\/i>\s*([0-9.]+)/i);

  if (!genre) {
    const genreMatch = html.match(/<div class=["']meta-item-enhanced["']>[\s\S]*?<span>(.*?)<\/span>/i);
    if (genreMatch) genre = genreMatch[1].trim();
  }

  // Mirror URL & Local Relay Proxy URL
  const mirrorStreamUrl = streamUrl ? streamUrl.replace('https://vz-b105018e-32f.b-cdn.net', STREAM_CDN_MIRROR) : '';
  const proxyStreamUrl = streamUrl ? `/api/proxy/hls/${streamUrl.replace(/^https?:\/\//, '')}` : '';

  // 6. Related Movies
  const relatedMatches = [...html.matchAll(/href=["']movie-article\.php\?id=(\d+)["'][\s\S]*?<img [^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']+)["']/gi)];
  const related = [];
  const seen = new Set([id]);
  for (const m of relatedMatches) {
    const rId = m[1];
    if (!seen.has(rId)) {
      seen.add(rId);
      related.push({
        id: rId,
        poster: m[2].startsWith('http') ? m[2] : `${UPSTREAM_ORIGIN}/${m[2].replace(/^\//, '')}`,
        title: m[3]
      });
    }
  }

  return {
    id,
    title: title || `หนังจีนเรื่องที่ ${id}`,
    genre: genre || 'หนังจีนสั้น',
    poster: poster || '/assets/placeholder.jpg',
    streamUrl,
    mirrorStreamUrl,
    proxyStreamUrl,
    views: viewMatch ? viewMatch[1] : '1,200',
    rating: ratingMatch ? ratingMatch[1] : '8.5',
    description: description || 'ชมซีรีส์จีนและหนังสั้นจีนคุณภาพระดับ Full HD สนุก ลุ้นระทึก ครบรสทุกอารมณ์',
    related: related.slice(0, 8)
  };
}

// Upstream fetch: Search
async function searchMovies(query) {
  const url = `${UPSTREAM_ORIGIN}/search.php?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`Search request failed with HTTP ${response.status}`);
  }

  const html = await response.text();
  const blocks = html.split(/<div class=["']movie-card["']/i).slice(1);
  const results = [];

  for (const block of blocks) {
    const idMatch = block.match(/data-movie-id=["'](\d+)["']/i) || block.match(/href=["']movie-article\.php\?id=(\d+)["']/i);
    if (!idMatch) continue;
    const id = idMatch[1];

    const catMatch = block.match(/data-category-id=["'](\d*)["']/i);
    const categoryId = catMatch ? catMatch[1] : null;

    const imgMatch = block.match(/<img\b([^>]+)>/i);
    let poster = '';
    let title = '';
    if (imgMatch) {
      const srcMatch = imgMatch[1].match(/\bsrc=["']([^"']+)["']/i);
      const altMatch = imgMatch[1].match(/\balt=["']([^"']+)["']/i);
      if (srcMatch) poster = srcMatch[1];
      if (altMatch) title = altMatch[1];
    }

    const titleMatch = block.match(/<h5 class=["']movie-title["'][^>]*>(.*?)<\/h5>/i);
    if (titleMatch) title = titleMatch[1].trim();

    const viewMatch = block.match(/class=["'](?:views-counter|movie-views)["']>[\s\S]*?<i class=["']fas fa-eye["']><\/i>\s*([0-9,]+)/i);
    const ratingMatch = block.match(/<span class=["']rating-value["']>([0-9.]+)<\/span>/i);

    let fullPoster = poster;
    if (poster && !poster.startsWith('http')) {
      fullPoster = `${UPSTREAM_ORIGIN}/${poster.replace(/^\//, '')}`;
    }

    results.push({
      id,
      title: title || `หนังจีนเรื่องที่ ${id}`,
      categoryId,
      poster: fullPoster || '/assets/placeholder.jpg',
      views: viewMatch ? viewMatch[1] : '500+',
      rating: ratingMatch ? ratingMatch[1] : '8.0'
    });
  }

  return results;
}

// ==========================================
// MANGA & COMICS SCRAPER CONDUIT (Zen Manga)
// ==========================================
const MANGA_BASE = 'https://www.zen-manga.com';
const MANGA_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Encoding': 'gzip, deflate',
  'Referer': 'https://www.zen-manga.com/'
};

function parseMangaCards(html) {
  const pattern = /<div[^>]*class=["'][^"']*bsx[^"']*["'][^>]*>[\s\S]*?<a\s+href=["']([^"']+)["']\s+title=["']([^"']+)["'][\s\S]*?<img[^>]+src=["']([^"']+)["']/g;
  const matches = [];
  const seen = new Set();
  let m;
  while ((m = pattern.exec(html)) !== null) {
    const link = m[1].trim();
    if (!seen.has(link)) {
      seen.add(link);
      const slugMatch = link.match(/\/manga\/([^/]+)\/?/);
      const slug = slugMatch ? slugMatch[1] : link;
      let thumb = m[3].trim();
      if (!thumb.includes('-150x270') && thumb.endsWith('.webp')) {
        thumb = thumb.replace(/(\.webp)$/, '-150x270$1');
      }
      matches.push({
        slug,
        title: m[2].replace(/&#8211;/g, '-').replace(/<[^>]+>/g, '').trim(),
        url: link,
        thumbnail: thumb
      });
    }
  }
  return matches;
}

async function fetchMangaCatalog(page = 1) {
  const targetUrl = `${MANGA_BASE}/manga/?page=${page}&order=update`;
  const response = await fetch(targetUrl, { headers: MANGA_HEADERS });
  if (!response.ok) throw new Error(`Manga upstream returned HTTP ${response.status}`);
  const html = await response.text();
  return parseMangaCards(html);
}

async function searchManga(query) {
  const targetUrl = `${MANGA_BASE}/?s=${encodeURIComponent(query)}`;
  const response = await fetch(targetUrl, { headers: MANGA_HEADERS });
  if (!response.ok) throw new Error(`Manga upstream returned HTTP ${response.status}`);
  const html = await response.text();
  return parseMangaCards(html);
}

async function fetchMangaDetails(slug) {
  const targetUrl = `${MANGA_BASE}/manga/${encodeURIComponent(slug)}/`;
  const response = await fetch(targetUrl, { headers: MANGA_HEADERS });
  if (!response.ok) throw new Error(`Manga detail returned HTTP ${response.status}`);
  const html = await response.text();

  const titleMatch = html.match(/<h1[^>]*class=["']entry-title["'][^>]*>(.*?)<\/h1>/i);
  const title = titleMatch ? titleMatch[1].replace(/&#8211;/g, '-').replace(/<[^>]+>/g, '').trim() : slug;

  const thumbMatch = html.match(/<div[^>]*class=["']thumb["'][^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["']/i);
  let thumbnail = thumbMatch ? thumbMatch[1].trim() : '';
  if (thumbnail && !thumbnail.includes('-150x270') && thumbnail.endsWith('.webp')) {
    thumbnail = thumbnail.replace(/(\.webp)$/, '-150x270$1');
  }

  const synMatch = html.match(/<div[^>]*class=["']entry-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  const synopsis = synMatch ? synMatch[1].replace(/<[^>]+>/g, '').trim() : '';

  const chPattern = /<li[^>]*data-num=["']([^"']+)["'][^>]*>[\s\S]*?<a\s+href=["']([^"']+)["']/g;
  const chapters = [];
  const seen = new Set();
  let cm;
  while ((cm = chPattern.exec(html)) !== null) {
    const chUrl = cm[2].trim();
    if (!seen.has(chUrl)) {
      seen.add(chUrl);
      chapters.push({
        number: cm[1].trim(),
        url: chUrl
      });
    }
  }

  chapters.sort((a, b) => {
    const numA = parseFloat(a.number.match(/\d+(\.\d+)?/)?.[0] || '0');
    const numB = parseFloat(b.number.match(/\d+(\.\d+)?/)?.[0] || '0');
    return numB - numA;
  });

  return {
    slug,
    title,
    thumbnail,
    synopsis,
    totalChapters: chapters.length,
    chapters
  };
}

async function fetchChapterImages(chapterUrl) {
  const response = await fetch(chapterUrl, { headers: MANGA_HEADERS });
  if (!response.ok) throw new Error(`Chapter returned HTTP ${response.status}`);
  const html = await response.text();

  const titleMatch = html.match(/<h1[^>]*class=["']entry-title["'][^>]*>(.*?)<\/h1>/i);
  const title = titleMatch ? titleMatch[1].replace(/&#8211;/g, '-').replace(/<[^>]+>/g, '').trim() : 'Manga Chapter';

  let images = [];
  let prevUrl = '';
  let nextUrl = '';

  const readerMatch = html.match(/ts_reader\.run\((\{.*?\})\);/s);
  if (readerMatch) {
    try {
      const data = JSON.parse(readerMatch[1]);
      prevUrl = data.prevUrl || '';
      nextUrl = data.nextUrl || '';
      if (data.sources && data.sources[0] && Array.isArray(data.sources[0].images)) {
        images = data.sources[0].images;
      }
    } catch (e) {
      console.error('Error parsing reader JSON:', e.message);
    }
  }

  if (images.length === 0) {
    const readerArea = html.match(/<div[^>]*id=["']readerarea["'][^>]*>([\s\S]*?)<\/div>/i);
    if (readerArea) {
      const imgPattern = /<img[^>]+src=["']([^"']+)["']/g;
      let im;
      while ((im = imgPattern.exec(readerArea[1])) !== null) {
        images.push(im[1].trim());
      }
    }
  }

  return {
    title,
    url: chapterUrl,
    prevUrl,
    nextUrl,
    count: images.length,
    images
  };
}

// ==========================================
// 24HD.TODAY REGULAR CINEMA MOVIE HELPERS
// ==========================================

const CINEMA_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/html, */*'
};

function cleanHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&#8211;/g, '-')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#038;/g, '&')
    .replace(/<[^>]+>/g, '')
    .trim();
}

async function fetchCinemaCatalog(page = 1, categoryId = 0) {
  let url = `${CINEMA_ORIGIN}/wp-json/wp/v2/posts?page=${page}&per_page=24&_embed=1`;
  if (categoryId && categoryId > 0) {
    url += `&categories=${categoryId}`;
  }

  const response = await fetch(url, { headers: CINEMA_HEADERS });
  if (!response.ok) {
    throw new Error(`Cinema catalog returned HTTP ${response.status}`);
  }

  const posts = await response.json();
  if (!Array.isArray(posts)) return [];

  return posts.map((p) => {
    const rawTitle = p.title?.rendered || p.slug || '';
    const title = cleanHtmlEntities(rawTitle).replace(/^ดูหนัง\s*/i, '').replace(/^ดูซีรี่ย์\s*/i, '');
    const poster = p._embedded?.['wp:featuredmedia']?.[0]?.source_url || '';
    const synopsis = cleanHtmlEntities(p.excerpt?.rendered || '');

    // Extract year from title if present (e.g. 2026, 2025)
    const yearMatch = title.match(/\b(202\d|199\d|200\d|201\d)\b/);
    const year = yearMatch ? yearMatch[1] : '2026';

    return {
      id: p.id,
      slug: p.slug,
      title,
      poster: poster || '/assets/placeholder.jpg',
      synopsis,
      year,
      rating: '8.' + (p.id % 9 + 1),
      date: p.date,
      link: p.link,
      categories: p.categories || [],
      isCinema: true
    };
  });
}

async function searchCinema(query) {
  const cleanQ = query.trim();
  const url = `${CINEMA_ORIGIN}/wp-json/wp/v2/posts?search=${encodeURIComponent(cleanQ)}&per_page=20&_embed=1`;
  const response = await fetch(url, { headers: CINEMA_HEADERS });
  if (!response.ok) {
    throw new Error(`Cinema search returned HTTP ${response.status}`);
  }

  const posts = await response.json();
  if (!Array.isArray(posts)) return [];

  return posts.map((p) => {
    const rawTitle = p.title?.rendered || p.slug || '';
    const title = cleanHtmlEntities(rawTitle).replace(/^ดูหนัง\s*/i, '').replace(/^ดูซีรี่ย์\s*/i, '');
    const poster = p._embedded?.['wp:featuredmedia']?.[0]?.source_url || '';
    const synopsis = cleanHtmlEntities(p.excerpt?.rendered || '');
    const yearMatch = title.match(/\b(202\d|199\d|200\d|201\d)\b/);

    return {
      id: p.id,
      slug: p.slug,
      title,
      poster: poster || '/assets/placeholder.jpg',
      synopsis,
      year: yearMatch ? yearMatch[1] : '2026',
      rating: '8.' + (p.id % 9 + 1),
      date: p.date,
      link: p.link,
      categories: p.categories || [],
      isCinema: true
    };
  });
}

async function fetchCinemaDetails({ id, slug, link }) {
  let targetUrl = link;
  if (!targetUrl && slug) {
    targetUrl = `${CINEMA_ORIGIN}/${slug}/`;
  }
  if (!targetUrl && id) {
    try {
      const postRes = await fetch(`${CINEMA_ORIGIN}/wp-json/wp/v2/posts/${id}`, { headers: CINEMA_HEADERS });
      if (postRes.ok) {
        const p = await postRes.json();
        targetUrl = p.link;
      }
    } catch (e) {
      console.warn('Could not resolve link for id:', id);
    }
  }

  if (!targetUrl) {
    throw new Error('Link, slug, or id required to fetch cinema details');
  }

  const response = await fetch(targetUrl, { headers: CINEMA_HEADERS });
  if (!response.ok) {
    throw new Error(`Cinema movie page returned HTTP ${response.status}`);
  }

  const html = await response.text();

  // Extract iframe src
  const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']*(?:player77hdfree|embed|vdohls)[^"']*)["']/i) ||
                     html.match(/<iframe[^>]+src=["']([^"']+)["']/i);

  let vdoId = null;
  let iframeSrc = null;
  if (iframeMatch) {
    iframeSrc = iframeMatch[1];
    const parts = iframeSrc.split('/').filter(Boolean);
    vdoId = parts[parts.length - 1];
  }

  const titleMatch = html.match(/<meta property=["']og:title["'] content=["']([^"']+)["']/i) ||
                     html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const descMatch = html.match(/<meta property=["']og:description["'] content=["']([^"']+)["']/i);
  const imgMatch = html.match(/<meta property=["']og:image["'] content=["']([^"']+)["']/i);

  let rawTitle = titleMatch ? titleMatch[1] : (slug || 'ภาพยนตร์');
  rawTitle = cleanHtmlEntities(rawTitle).replace(/^ดูหนัง\s*/i, '').replace(/^ดูซีรี่ย์\s*/i, '');

  // Extract year & quality
  const yearMatch = rawTitle.match(/\b(202\d|199\d|200\d|201\d)\b/);
  const year = yearMatch ? yearMatch[1] : '2026';

  // Parse audio tracks if vdoId is present
  let tracks = [];
  if (vdoId) {
    try {
      const masterRes = await fetch(`https://vdohls.com/${vdoId}/playlist.m3u8`, {
        headers: { 'Referer': 'https://player77hdfree.xyz/' }
      });
      if (masterRes.ok) {
        const text = await masterRes.text();
        const trackRegex = /#EXT-X-MEDIA:TYPE=AUDIO.*?NAME=["']([^"']+)["'].*?LANGUAGE=["']([^"']+)["']/g;
        let m;
        while ((m = trackRegex.exec(text)) !== null) {
          tracks.push({ name: m[1], lang: m[2] });
        }
      }
    } catch (e) {
      console.warn('Could not inspect master playlist tracks:', e.message);
    }
  }

  return {
    id: id || slug,
    slug: slug || id,
    title: rawTitle,
    poster: imgMatch ? imgMatch[1] : '',
    synopsis: descMatch ? cleanHtmlEntities(descMatch[1]) : '',
    year,
    rating: '8.8',
    vdoId,
    iframeSrc,
    streamUrl: vdoId ? `/api/proxy/hls/vdohls.com/${vdoId}/playlist.m3u8` : null,
    tracks,
    link: targetUrl,
    isCinema: true
  };
}

// REST API Endpoints

// 1. Get Categories
app.get('/api/categories', (req, res) => {
  res.json({ success: true, data: CATEGORIES });
});

// 2. Get Movies (Paginated & Categorized)
app.get('/api/movies', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const category = parseInt(req.query.category, 10) || 0;
    const cacheKey = `movies_p${page}_c${category}`;

    const movies = await getCached(cacheKey, 10 * 60 * 1000, () => fetchMovies(page, category));
    res.json({
      success: true,
      page,
      category,
      count: (movies || []).length,
      data: movies || []
    });
  } catch (err) {
    console.error('Error fetching movies:', err.message);
    res.json({ success: true, page: 1, category: 0, count: 0, data: [] });
  }
});

// 3. Get Movie Details & Stream
app.get('/api/movie/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || !/^\d+$/.test(id)) {
      return res.status(400).json({ success: false, error: 'Invalid movie ID' });
    }

    const cacheKey = `movie_detail_${id}`;
    const details = await getCached(cacheKey, 30 * 60 * 1000, () => fetchMovieDetails(id));
    res.json({ success: true, data: details });
  } catch (err) {
    console.error(`Error fetching movie ${req.params.id}:`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Search Movies
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    if (!query.trim()) {
      return res.json({ success: true, count: 0, data: [] });
    }

    const cacheKey = `search_${query.trim().toLowerCase()}`;
    const results = await getCached(cacheKey, 15 * 60 * 1000, () => searchMovies(query));
    res.json({
      success: true,
      query,
      count: results.length,
      data: results
    });
  } catch (err) {
    console.error('Error searching:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Featured Billboard Dramas
app.get('/api/featured', async (req, res) => {
  try {
    const cacheKey = 'featured_billboard';
    const featured = await getCached(cacheKey, 60 * 60 * 1000, async () => {
      // Pick top trending IDs for hero showcase
      const topIds = ['1005', '942', '2702', '2624', '20'];
      const details = await Promise.allSettled(topIds.map((id) => fetchMovieDetails(id)));
      let results = details
        .filter((r) => r.status === 'fulfilled' && r.value.streamUrl)
        .map((r) => r.value);

      // Fallback to top cinema movies if drama upstream is unreachable
      if (results.length === 0) {
        try {
          const cinemaMovies = await fetchCinemaCatalog(1, 0);
          if (cinemaMovies && cinemaMovies.length > 0) {
            results = cinemaMovies.slice(0, 5).map((c) => ({
              id: c.id,
              slug: c.slug,
              title: c.title,
              genre: 'ภาพยนตร์ชนโรง 4K',
              poster: c.poster,
              streamUrl: `/api/proxy/hls/vdohls.com/${c.slug}/playlist.m3u8`,
              mirrorStreamUrl: '',
              proxyStreamUrl: '',
              views: '10,000+',
              rating: c.rating || '8.9',
              description: c.synopsis || 'รับชมภาพยนตร์ยอดนิยมระดับ 4K Ultra HD คมชัดเต็มอารมณ์',
              isCinema: true
            }));
          }
        } catch (e) {
          console.warn('Cinema fallback for billboard error:', e.message);
        }
      }

      return results;
    });

    res.json({ success: true, data: featured });
  } catch (err) {
    console.error('Error fetching featured:', err.message);
    res.json({ success: true, data: [] });
  }
});

// ==========================================
// MANGA & COMICS REST API ROUTES
// ==========================================

// 5.1 Manga Catalog
app.get('/api/manga/catalog', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const cacheKey = `manga_catalog_${page}`;
    const items = await getCached(cacheKey, 15 * 60 * 1000, () => fetchMangaCatalog(page));
    res.json({ success: true, page, count: items.length, data: items });
  } catch (err) {
    console.error('Error in /api/manga/catalog:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5.2 Manga Search
app.get('/api/manga/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    if (!query.trim()) return res.json({ success: true, count: 0, data: [] });
    const cacheKey = `manga_search_${query.trim().toLowerCase()}`;
    const items = await getCached(cacheKey, 15 * 60 * 1000, () => searchManga(query));
    res.json({ success: true, query, count: items.length, data: items });
  } catch (err) {
    console.error('Error in /api/manga/search:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5.3 Manga Details & Chapter Index
app.get('/api/manga/detail', async (req, res) => {
  try {
    const slug = req.query.slug;
    if (!slug) return res.status(400).json({ success: false, error: 'Slug parameter required' });
    const cacheKey = `manga_detail_${slug}`;
    const details = await getCached(cacheKey, 30 * 60 * 1000, () => fetchMangaDetails(slug));
    res.json({ success: true, data: details });
  } catch (err) {
    console.error('Error in /api/manga/detail:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5.4 Manga Chapter Images
app.get('/api/manga/chapter', async (req, res) => {
  try {
    const chapterUrl = req.query.url;
    if (!chapterUrl) return res.status(400).json({ success: false, error: 'Url parameter required' });
    const cacheKey = `manga_chapter_${chapterUrl}`;
    const chapterData = await getCached(cacheKey, 60 * 60 * 1000, () => fetchChapterImages(chapterUrl));
    res.json({ success: true, data: chapterData });
  } catch (err) {
    console.error('Error in /api/manga/chapter:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 24HD.TODAY CINEMA REST API ROUTES
// ==========================================

// 5.5 Cinema Categories
app.get('/api/cinema/categories', (req, res) => {
  res.json({ success: true, data: CINEMA_CATEGORIES });
});

// 5.6 Cinema Movie Catalog (Paginated & Categorized)
app.get('/api/cinema/catalog', async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const category = parseInt(req.query.category, 10) || 0;
    const cacheKey = `cinema_cat_p${page}_c${category}`;

    const movies = await getCached(cacheKey, 15 * 60 * 1000, () => fetchCinemaCatalog(page, category));
    res.json({
      success: true,
      page,
      category,
      count: movies.length,
      data: movies
    });
  } catch (err) {
    console.error('Error in /api/cinema/catalog:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5.7 Cinema Movie Details & HLS Video Stream Resolver
app.get('/api/cinema/detail', async (req, res) => {
  try {
    const id = req.query.id;
    const slug = req.query.slug;
    const link = req.query.link;

    if (!id && !slug && !link) {
      return res.status(400).json({ success: false, error: 'id, slug, or link parameter required' });
    }

    const cacheKey = `cinema_detail_${id || slug || link}`;
    const details = await getCached(cacheKey, 30 * 60 * 1000, () => fetchCinemaDetails({ id, slug, link }));
    res.json({ success: true, data: details });
  } catch (err) {
    console.error('Error in /api/cinema/detail:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5.8 Cinema Movie Search
app.get('/api/cinema/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    if (!query.trim()) {
      return res.json({ success: true, count: 0, data: [] });
    }

    const cacheKey = `cinema_search_${query.trim().toLowerCase()}`;
    const results = await getCached(cacheKey, 15 * 60 * 1000, () => searchCinema(query));
    res.json({
      success: true,
      query,
      count: results.length,
      data: results
    });
  } catch (err) {
    console.error('Error in /api/cinema/search:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Direct Stream Redirection
app.get('/api/stream/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const detail = await fetchMovieDetails(id);
    if (detail && detail.streamUrl) {
      return res.redirect(detail.streamUrl);
    }
    res.status(404).send('Stream not found');
  } catch (err) {
    res.status(500).send('Error resolving stream: ' + err.message);
  }
});

// 7. Image Proxy (in case of client-side referrer / mixed content blocks)
app.get('/api/proxy/image', async (req, res) => {
  try {
    const targetUrl = req.query.url;
    if (!targetUrl || !targetUrl.startsWith('http')) {
      return res.status(400).send('Invalid url parameter');
    }

    const imageRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Referer: UPSTREAM_ORIGIN
      }
    });

    if (!imageRes.ok) {
      return res.status(imageRes.status).send('Failed to fetch image');
    }

    const contentType = imageRes.headers.get('content-type') || 'image/webp';
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400, immutable');
    const buffer = await imageRes.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(500).send('Proxy error: ' + err.message);
  }
});

// 8. HLS Stream Proxy Conduit (Injects Upstream Referer to bypass CDN 403 Forbidden)
app.use('/api/proxy/hls', async (req, res) => {
  try {
    const rawPath = req.path.replace(/^\//, '');
    if (!rawPath) return res.status(400).send('Path missing');

    const host = rawPath.split('/')[0];
    let referer = UPSTREAM_ORIGIN + '/';
    let origin = UPSTREAM_ORIGIN;

    // Route upstream headers based on target host
    if (host === 'vdohls.com' || host.includes('player77hdfree') || host.includes('avxtube')) {
      referer = 'https://player77hdfree.xyz/';
      origin = 'https://player77hdfree.xyz';
    }

    const targetUrl = 'https://' + rawPath;
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': referer,
        'Origin': origin
      }
    });

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).send('Upstream CDN returned ' + upstreamRes.status);
    }

    const contentType = upstreamRes.headers.get('content-type') || '';
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', '*');
    res.set('Access-Control-Expose-Headers', '*');
    res.set('Cache-Control', 'public, max-age=86400');

    // If it is an M3U8 playlist, rewrite sub-playlists, keys, and media
    if (contentType.includes('mpegurl') || rawPath.endsWith('.m3u8')) {
      const text = await upstreamRes.text();
      const parentPath = rawPath.substring(0, rawPath.lastIndexOf('/'));

      const rewritten = text.split('\n').map((line) => {
        let trimmed = line.trim();
        if (!trimmed) return line;

        // Rewrite URI attributes in #EXT-X-KEY or #EXT-X-MEDIA (Audio/Subtitle streams)
        if (trimmed.startsWith('#EXT-X-KEY') || trimmed.startsWith('#EXT-X-MEDIA')) {
          return trimmed.replace(/URI=["']([^"']+)["']/, (match, uri) => {
            let cleanUri = uri;
            if (cleanUri.startsWith('//')) cleanUri = cleanUri.replace(/^\/\//, '');
            else if (cleanUri.startsWith('http://') || cleanUri.startsWith('https://')) cleanUri = cleanUri.replace(/^https?:\/\//, '');
            else if (cleanUri.startsWith('/')) cleanUri = `${host}${cleanUri}`;
            else cleanUri = `${parentPath}/${cleanUri}`;
            return `URI="/api/proxy/hls/${cleanUri}"`;
          });
        }

        // Keep other comments & tags
        if (trimmed.startsWith('#')) return line;

        // Protocol-relative (e.g. //vdohls.com/...)
        if (trimmed.startsWith('//')) {
          return `/api/proxy/hls/${trimmed.replace(/^\/\//, '')}`;
        }

        // Sub-playlist or segment path
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          // If it's a direct CDN chunk with open CORS, let browser fetch directly for zero-proxy latency
          if (trimmed.includes('avxtube') || trimmed.endsWith('.jpeg') || trimmed.endsWith('.png')) {
            return trimmed;
          }
          const clean = trimmed.replace(/^https?:\/\//, '');
          return `/api/proxy/hls/${clean}`;
        }

        if (trimmed.startsWith('/')) {
          return `/api/proxy/hls/${host}${trimmed}`;
        }
        return `/api/proxy/hls/${parentPath}/${trimmed}`;
      }).join('\n');

      res.set('Content-Type', 'application/vnd.apple.mpegurl');
      return res.send(rewritten);
    }

    // Binary segment (.dts, .ts, .jpeg) or AES key
    res.set('Content-Type', contentType || 'video/MP2T');
    const arrayBuf = await upstreamRes.arrayBuffer();
    return res.send(Buffer.from(arrayBuf));
  } catch (err) {
    console.error('HLS Proxy Conduit error:', err.message);
    res.status(500).send('Proxy error: ' + err.message);
  }
});

// Fallback to frontend
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
module.exports = app;

app.listen(PORT, () => {
  console.log(`[mimi]: cinema core online -> http://localhost:${PORT}`);
});
