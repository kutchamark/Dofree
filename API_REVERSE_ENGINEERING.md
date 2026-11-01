<!-- API_REVERSE_ENGINEERING.md -->
<!-- markdown / API_REVERSE_ENGINEERING.md / documentation / web / xn--72c9ab1ec1bc6q.online -->

# Reverse Engineering & API Specification Report

## 1. Target Overview
- **Domain**: `https://www.xn--72c9ab1ec1bc6q.online` (Punycode for `ซีรี่ย์จีน.online`)
- **Origin Server**: Cloudflare CDN Edge, PHP 8 backend
- **Media CDN**: BunnyCDN (`https://vz-b105018e-32f.b-cdn.net/`) and Stream Mirror (`https://stream.xn--72c9ab1ec1bc6q.xyz/`)
- **Protocol**: HTTP/2, TLS 1.3
- **CORS Policy on Media**: `access-control-allow-origin: *` (Full cross-origin streaming authorized)

---

## 2. Reverse Engineered Endpoints & Interfaces

### 2.1 Video Stream Extraction
- **Endpoint**: `GET /movie-article.php?id={id}` & `GET /direct-video.php?id={id}`
- **Method**: `GET`
- **Payload Extraction**:
  - `data-video-url="https://vz-b105018e-32f.b-cdn.net/{uuid}/playlist.m3u8"`
  - `let videoURL = 'https://vz-b105018e-32f.b-cdn.net/{uuid}/playlist.m3u8'`
  - `let videoCDN = 'https://stream.xn--72c9ab1ec1bc6q.xyz'`
- **Delivery Protocol**: HLS (HTTP Live Streaming), Master M3U8 Playlist with multi-bitrate chunks.
- **Access Control**: No token or cookie validation required. Referrer check disabled on CDN. Direct playback authorized on any HLS player.

### 2.2 Paginated Movie Inventory
- **Endpoint**: `POST /load_more_movies.php`
- **Method**: `POST`
- **Headers**:
  - `Content-Type: application/x-www-form-urlencoded`
  - `User-Agent: Mozilla/5.0`
- **Parameters**:
  - `action`: `load_more_movies` (Literal)
  - `page`: Integer (1-indexed)
  - `category_id`: Integer (`0` for all movies, or category ID)
- **Response Format**: Raw HTML markup containing 30 `.movie-card` elements per page.
- **Card Fields**:
  - Movie ID: extracted from `href="movie-article.php?id={id}"`
  - Title: `<h5 class="card-title">...</h5>`
  - Poster URL: `<img src="uploads/posters/{hash}.webp">`
  - Views: `<i class="fas fa-eye"></i> {views}`
  - Rating: `<i class="fas fa-star"></i> {rating}`

### 2.3 Catalog Search
- **Endpoint**: `GET /search.php?q={query}`
- **Method**: `GET`
- **Query Parameter**: `q` (URL-encoded Thai/English search term)
- **Response Format**: HTML document with `.movie-card` result items containing:
  - `data-movie-id="{id}"`
  - `data-category-id="{catId}"`
  - Poster image source
  - Title & rating metrics

### 2.4 Category Taxonomy & ID Mapping
| Category ID | Thai Name | Genre Translation | Volume |
|:---|:---|:---|:---|
| `0` | ทั้งหมด | All Dramas | 2,700+ |
| `5` | ซีรีส์มาใหม่ | New Releases | 22 |
| `26` | ซีรีส์แนะนำ | Recommended | 6 |
| `15` | ความรัก | Romance / Love | 1,018 |
| `13` | แก้แค้น | Revenge | 181 |
| `23` | พลิกเกม | Plot Twist / Game Changer | 285 |
| `16` | ข้ามมิติ | Time Travel / Isekai | 72 |
| `22` | ย้อนยุค | Historical / Period | 218 |
| `19` | เทพเซียน | Xianxia / Wuxia Fantasy | 137 |
| `17` | เกิดใหม่ | Rebirth / Reincarnation | 85 |
| `18` | แอ็คชั่น | Action | 60 |
| `2` | ดราม่า | Melodrama | 99 |
| `1` | ครอบครัว | Family Drama | 99 |
| `14` | คอมเมดี้ | Comedy | 32 |
| `25` | ซับไทย | Thai Subtitles | 248 |

---

## 3. Clone Application Architecture
- **Backend Bridge**: Node.js Express server (`server.js`) providing normalized JSON APIs (`/api/movies`, `/api/movie/:id`, `/api/search`, `/api/categories`, `/api/featured`) with in-memory TTL caching.
- **Frontend Layer**: Responsive single-page streaming interface styled with modern dark glassmorphism (Obsidian & Crimson palette), HLS.js adaptive player, keyboard shortcuts, watch history, and favorites.

---

## 4. 24HD.today Regular Cinema & Movies Architecture

### 4.1 Target Overview
- **Domain**: `https://www.24hd.today`
- **CMS / Architecture**: WordPress with Elementor, Public REST API enabled (`/wp-json/wp/v2/`)
- **Player Conduit**: `https://player77hdfree.xyz/embed/{vdoId}`
- **HLS Stream Master**: `https://vdohls.com/{vdoId}/playlist.m3u8`
- **Segment Storage**: High-speed distributed CDN clusters (`cdn-1.avxtube-*.xyz`)

### 4.2 Reverse Engineered REST Interfaces
1. **Catalog & Pagination**:
   - `GET /wp-json/wp/v2/posts?page={page}&per_page=24&_embed=1`
   - Filter by genre: `&categories={categoryId}`
   - Embedded metadata: featured webp media in `_embedded['wp:featuredmedia'][0].source_url`
2. **Global Search**:
   - `GET /wp-json/wp/v2/posts?search={query}&_embed=1`
3. **Stream & Embed Resolution**:
   - Post page contains: `<iframe src="https://player77hdfree.xyz/embed/{vdoId}">`
   - Master HLS: `https://vdohls.com/{vdoId}/playlist.m3u8`
   - Requires headers: `Referer: https://player77hdfree.xyz/` and `Origin: https://player77hdfree.xyz`
   - Multi-audio tracks: `#EXT-X-MEDIA:TYPE=AUDIO,NAME="Thai",LANGUAGE="tha",URI="//vdohls.com/..."`
   - Segments: Obfuscated JPEG/TS chunks with open CORS `Access-Control-Allow-Origin: *`.

### 4.3 Normalized Bridge Endpoints
- `GET /api/cinema/categories`: Curated list of film categories (ชนโรง, หนังใหม่ 2026, แอ็คชั่น, ฝรั่ง, ไทย, เกาหลี, Netflix, สยองขวัญ).
- `GET /api/cinema/catalog?page=1&category=0`: Paginated movie list.
- `GET /api/cinema/detail?slug={slug}&link={url}`: Returns title, poster, audio track descriptors, and proxied 1080p stream URL.
- `GET /api/cinema/search?q={query}`: Multi-keyword film search.
- `GET /api/proxy/hls/vdohls.com/{vdoId}/playlist.m3u8`: Relay conduit injecting the authorized referer and rewriting playlist URIs for seamless browser playback.

