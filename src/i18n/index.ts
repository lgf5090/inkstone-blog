export const LOCALES = ['en', 'zh-CN', 'zh-TW', 'ja', 'ko', 'es', 'id', 'th', 'tr', 'vi'] as const
export type BlogLocale = (typeof LOCALES)[number]

export const LOCALE_LABELS: Record<BlogLocale, string> = {
  en: 'English', 'zh-CN': '简体中文', 'zh-TW': '繁體中文', ja: '日本語', ko: '한국어',
  es: 'Español', id: 'Bahasa Indonesia', th: 'ไทย', tr: 'Türkçe', vi: 'Tiếng Việt',
}

export type MessageKey =
  | 'nav.home' | 'nav.archive' | 'nav.categories' | 'nav.tags' | 'nav.series'
  | 'nav.friends' | 'nav.moments' | 'nav.albums' | 'nav.projects' | 'nav.skills'
  | 'nav.devices' | 'nav.games' | 'nav.anime' | 'nav.timeline' | 'nav.compass'
  | 'nav.about' | 'nav.search' | 'nav.rss'
  | 'common.readMore' | 'common.minRead' | 'common.posts' | 'common.tags'
  | 'common.categories' | 'common.series' | 'common.noPosts' | 'common.loadError'
  | 'common.retry' | 'common.page' | 'common.previous' | 'common.next'
  | 'common.backHome' | 'common.untitled' | 'common.pinned' | 'common.updated'
  | 'common.published' | 'common.tableOfContents' | 'common.previousPost'
  | 'common.nextPost' | 'common.share' | 'common.copied' | 'common.postNavigation'
  | 'common.tocSearch' | 'common.tocFold' | 'common.tocUnfold' | 'common.readingProgress' | 'common.noHeadingsMatch'
  | 'common.latest' | 'common.copyFailed' | 'common.link' | 'common.repository' | 'common.episodes' | 'common.photos' | 'search.title' | 'search.placeholder' | 'search.empty' | 'search.results'
  | 'theme.toggle' | 'blog.poweredBy' | 'blog.notFound' | 'blog.notFoundHint'
  | 'collections.empty' | 'collections.friends' | 'collections.moments'
  | 'collections.albums' | 'collections.projects' | 'collections.skills'
  | 'collections.devices' | 'collections.games' | 'collections.anime'
  | 'collections.timeline' | 'collections.compass'
  | 'page.about' | 'page.archiveTitle' | 'page.archiveHint'
  | 'common.recentPosts' | 'common.stats' | 'common.language' | 'appearance.title' | 'appearance.theme_auto' | 'appearance.theme_light' | 'appearance.theme_dark'
  | 'appearance.accent' | 'appearance.theme' | 'appearance.background' | 'appearance.density'
  | 'appearance.background_paper' | 'appearance.background_white'
  | 'appearance.density_comfortable' | 'appearance.density_compact'
  | 'appearance.accent_cinnabar' | 'appearance.accent_indigo' | 'appearance.accent_celadon'
  | 'appearance.accent_amber' | 'appearance.accent_terracotta' | 'appearance.accent_wisteria'
  | 'appearance.accent_graphite' | 'comments.title' | 'comments.empty' | 'comments.reply' | 'comments.leave' | 'comments.name'
  | 'comments.email' | 'comments.emailHint' | 'comments.content' | 'comments.posting' | 'comments.submit'
  | 'comments.moderated' | 'comments.closed' | 'comments.replyingTo' | 'comments.cancel'
  | 'comments.pending' | 'comments.published' | 'comments.notPublished' | 'comments.loadFailed'

type Dictionary = Record<MessageKey, string>

const en: Dictionary = {
  'nav.home': 'Home', 'nav.archive': 'Archive', 'nav.categories': 'Categories', 'nav.tags': 'Tags',
  'nav.series': 'Series', 'nav.friends': 'Friends', 'nav.moments': 'Moments', 'nav.albums': 'Albums',
  'nav.projects': 'Projects', 'nav.skills': 'Skills', 'nav.devices': 'Devices', 'nav.games': 'Games',
  'nav.anime': 'Anime', 'nav.timeline': 'Timeline', 'nav.compass': 'Compass', 'nav.about': 'About',
  'nav.search': 'Search', 'nav.rss': 'Subscribe',
  'common.recentPosts': 'Recent posts', 'common.stats': 'At a glance', 'common.language': 'Language', 'common.latest': 'Latest posts', 'common.link': 'Link', 'common.repository': 'Repository', 'common.episodes': 'episodes', 'common.photos': 'photos', 'common.readMore': 'Read more', 'common.minRead': 'min read', 'common.posts': 'posts',
  'common.tags': 'tags', 'common.categories': 'categories', 'common.series': 'series',
  'common.noPosts': 'No posts have been published yet.', 'common.loadError': 'The blog could not load.',
  'common.retry': 'Try again', 'common.page': 'Page', 'common.previous': 'Previous', 'common.next': 'Next',
  'common.backHome': 'Back to home', 'common.untitled': 'Untitled', 'common.pinned': 'Pinned',
  'common.updated': 'Updated', 'common.published': 'Published', 'common.tableOfContents': 'On this page',
  'common.previousPost': 'Previous post', 'common.nextPost': 'Next post', 'common.share': 'Share',
  'common.postNavigation': 'Post navigation',
  'common.tocSearch': 'Search headings', 'common.tocFold': 'Collapse', 'common.tocUnfold': 'Expand',
  'common.readingProgress': 'Reading progress', 'common.noHeadingsMatch': 'No headings match.',
  'common.copied': 'Link copied', 'common.copyFailed': 'Copy failed',
  'search.title': 'Search', 'search.placeholder': 'Search posts', 'search.empty': 'No posts matched this search.',
  'search.results': 'results',
  'theme.toggle': 'Toggle light or dark theme', 'blog.poweredBy': 'Powered by Inkstone notes',
  'blog.notFound': 'Page not found', 'blog.notFoundHint': 'The address may have moved or never existed.',
  'collections.empty': 'Nothing here yet.',
  'collections.friends': 'Friends', 'collections.moments': 'Moments', 'collections.albums': 'Albums',
  'collections.projects': 'Projects', 'collections.skills': 'Skills', 'collections.devices': 'Devices',
  'collections.games': 'Games', 'collections.anime': 'Anime', 'collections.timeline': 'Timeline',
  'collections.compass': 'Compass',
  'page.about': 'About', 'page.archiveTitle': 'Archive', 'page.archiveHint': 'Everything published, by year.',
  'appearance.title': 'Appearance', 'appearance.theme': 'Theme', 'appearance.background': 'Background', 'appearance.density': 'Density', 'appearance.theme_auto': 'Auto', 'appearance.theme_light': 'Light',
  'appearance.theme_dark': 'Dark', 'appearance.accent': 'Accent colour', 'appearance.background_paper': 'Paper',
  'appearance.background_white': 'Pure white', 'appearance.density_comfortable': 'Comfortable',
  'appearance.density_compact': 'Compact', 'appearance.accent_cinnabar': 'Cinnabar', 'appearance.accent_indigo': 'Indigo',
  'appearance.accent_celadon': 'Celadon', 'appearance.accent_amber': 'Amber', 'appearance.accent_terracotta': 'Terracotta',
  'appearance.accent_wisteria': 'Wisteria', 'appearance.accent_graphite': 'Graphite',
  'comments.title': 'Comments', 'comments.empty': 'No comments yet.', 'comments.reply': 'Reply',
  'comments.leave': 'Leave a comment', 'comments.name': 'Name', 'comments.email': 'Email',
  'comments.emailHint': 'Not published. Used only to verify the comment.', 'comments.content': 'Comment',
  'comments.posting': 'Posting…', 'comments.submit': 'Post comment', 'comments.moderated': 'Comments are moderated before they appear.',
  'comments.closed': 'Comments are closed on this post.', 'comments.replyingTo': 'Replying to',
  'comments.cancel': 'Cancel', 'comments.pending': 'Your comment is waiting for moderation.',
  'comments.published': 'Your comment is published.', 'comments.notPublished': 'Not published.',
  'comments.loadFailed': 'The comment could not be posted.',
}

const zhCN: Dictionary = {
  'nav.home': '首页', 'nav.archive': '归档', 'nav.categories': '分类', 'nav.tags': '标签',
  'nav.series': '系列', 'nav.friends': '友链', 'nav.moments': '瞬间', 'nav.albums': '相册',
  'nav.projects': '项目', 'nav.skills': '技能', 'nav.devices': '设备', 'nav.games': '游戏',
  'nav.anime': '番剧', 'nav.timeline': '时间线', 'nav.compass': '罗盘', 'nav.about': '关于',
  'nav.search': '搜索', 'nav.rss': '订阅',
  'common.recentPosts': '最近文章', 'common.stats': '站点概览', 'common.language': '语言', 'common.latest': '最新文章', 'common.link': '链接', 'common.repository': '仓库', 'common.episodes': '集', 'common.photos': '张照片', 'common.readMore': '阅读全文', 'common.minRead': '分钟阅读', 'common.posts': '篇文章',
  'common.tags': '个标签', 'common.categories': '个分类', 'common.series': '个系列',
  'common.noPosts': '还没有发布文章。', 'common.loadError': '博客加载失败。', 'common.retry': '重试',
  'common.page': '第', 'common.previous': '上一页', 'common.next': '下一页', 'common.backHome': '返回首页',
  'common.untitled': '未命名', 'common.pinned': '置顶', 'common.updated': '更新于',
  'common.published': '发布于', 'common.tableOfContents': '本页目录', 'common.previousPost': '上一篇',
  'common.nextPost': '下一篇', 'common.share': '分享', 'common.copied': '链接已复制', 'common.copyFailed': '复制失败',
  'common.postNavigation': '文章导航',
  'common.tocSearch': '搜索标题', 'common.tocFold': '折叠', 'common.tocUnfold': '展开',
  'common.readingProgress': '阅读进度', 'common.noHeadingsMatch': '没有匹配的标题。',
  'search.title': '搜索', 'search.placeholder': '搜索文章', 'search.empty': '没有匹配的文章。',
  'search.results': '条结果',
  'theme.toggle': '切换明暗主题', 'blog.poweredBy': '由 Inkstone 笔记驱动',
  'blog.notFound': '页面不存在', 'blog.notFoundHint': '这个地址可能已经移动，或从未存在。',
  'collections.empty': '还没有内容。',
  'collections.friends': '友链', 'collections.moments': '瞬间', 'collections.albums': '相册',
  'collections.projects': '项目', 'collections.skills': '技能', 'collections.devices': '设备',
  'collections.games': '游戏', 'collections.anime': '番剧', 'collections.timeline': '时间线',
  'collections.compass': '罗盘',
  'page.about': '关于', 'page.archiveTitle': '归档', 'page.archiveHint': '按年份浏览全部已发布内容。',
  'appearance.title': '外观', 'appearance.theme': '主题', 'appearance.background': '背景', 'appearance.density': '密度', 'appearance.theme_auto': '跟随系统', 'appearance.theme_light': '浅色',
  'appearance.theme_dark': '深色', 'appearance.accent': '强调色', 'appearance.background_paper': '暖纸',
  'appearance.background_white': '纯白', 'appearance.density_comfortable': '舒适',
  'appearance.density_compact': '紧凑', 'appearance.accent_cinnabar': '朱砂', 'appearance.accent_indigo': '靛蓝',
  'appearance.accent_celadon': '青瓷', 'appearance.accent_amber': '琥珀', 'appearance.accent_terracotta': '陶土',
  'appearance.accent_wisteria': '紫藤', 'appearance.accent_graphite': '石墨',
  'comments.title': '评论', 'comments.empty': '还没有评论。', 'comments.reply': '回复',
  'comments.leave': '留下评论', 'comments.name': '昵称', 'comments.email': '邮箱',
  'comments.emailHint': '不会公开，仅用于验证评论。', 'comments.content': '评论内容',
  'comments.posting': '发送中…', 'comments.submit': '发表评论', 'comments.moderated': '评论会在审核后显示。',
  'comments.closed': '这篇文章的评论已关闭。', 'comments.replyingTo': '回复',
  'comments.cancel': '取消', 'comments.pending': '评论已提交，等待审核。',
  'comments.published': '评论已发布。', 'comments.notPublished': '不会公开。',
  'comments.loadFailed': '评论发送失败。',
}

const zhTW: Dictionary = { ...zhCN,
  'nav.home': '首頁', 'nav.archive': '歸檔', 'nav.series': '系列', 'nav.friends': '友鏈',
  'nav.moments': '瞬間', 'nav.albums': '相簿', 'nav.devices': '裝置', 'nav.games': '遊戲',
  'nav.timeline': '時間線', 'nav.about': '關於', 'common.readMore': '閱讀全文',
  'common.noPosts': '還沒有發布文章。', 'common.loadError': '部落格載入失敗。',
  'common.retry': '重試', 'common.previous': '上一頁', 'common.next': '下一頁',
  'common.backHome': '返回首頁', 'common.pinned': '置頂', 'common.updated': '更新於',
  'common.published': '發布於', 'common.tableOfContents': '本頁目錄',
  'common.previousPost': '上一篇', 'common.nextPost': '下一篇', 'search.empty': '沒有符合的文章。',
  'common.postNavigation': '文章導覽',
  'collections.albums': '相簿', 'collections.games': '遊戲', 'collections.devices': '裝置',
  'page.archiveTitle': '歸檔',
}

const ja: Dictionary = { ...en,
  'nav.home': 'ホーム', 'nav.archive': 'アーカイブ', 'nav.categories': 'カテゴリ', 'nav.tags': 'タグ',
  'nav.series': 'シリーズ', 'nav.friends': 'フレンド', 'nav.moments': 'つぶやき', 'nav.albums': 'アルバム',
  'nav.projects': 'プロジェクト', 'nav.skills': 'スキル', 'nav.devices': 'デバイス', 'nav.games': 'ゲーム',
  'nav.anime': 'アニメ', 'nav.timeline': 'タイムライン', 'nav.compass': 'コンパス', 'nav.about': 'About',
  'nav.search': '検索', 'common.readMore': '続きを読む', 'common.minRead': '分で読めます',
  'common.posts': '記事', 'common.noPosts': 'まだ記事がありません。', 'common.loadError': 'ブログを読み込めませんでした。',
  'common.retry': '再試行', 'common.previous': '前へ', 'common.next': '次へ', 'common.backHome': 'ホームへ戻る',
  'common.untitled': '無題', 'common.pinned': 'ピン留め', 'common.updated': '更新', 'common.published': '公開',
  'common.tableOfContents': 'このページの目次', 'common.previousPost': '前の記事', 'common.nextPost': '次の記事',
  'common.postNavigation': '記事ナビゲーション',
  'search.title': '検索', 'search.placeholder': '記事を検索', 'search.empty': '一致する記事がありません。',
  'collections.empty': 'まだ何もありません。', 'page.about': 'About', 'page.archiveTitle': 'アーカイブ',
  'page.archiveHint': '公開された記事を年別に表示します。',
}

const ko: Dictionary = { ...en,
  'nav.home': '홈', 'nav.archive': '보관소', 'nav.categories': '카테고리', 'nav.tags': '태그',
  'nav.series': '시리즈', 'nav.friends': '친구', 'nav.moments': '순간', 'nav.albums': '앨범',
  'nav.projects': '프로젝트', 'nav.skills': '기술', 'nav.devices': '기기', 'nav.games': '게임',
  'nav.anime': '애니', 'nav.timeline': '타임라인', 'nav.compass': '나침반', 'nav.about': '소개',
  'nav.search': '검색', 'common.readMore': '더 읽기', 'common.minRead': '분 소요',
  'common.posts': '개의 글', 'common.noPosts': '아직 글이 없습니다.', 'common.loadError': '블로그를 불러오지 못했습니다.',
  'common.retry': '다시 시도', 'common.previous': '이전', 'common.next': '다음', 'common.backHome': '홈으로',
  'common.untitled': '제목 없음', 'common.pinned': '고정됨', 'common.updated': '업데이트', 'common.published': '발행',
  'common.tableOfContents': '이 페이지의 목차', 'common.previousPost': '이전 글', 'common.nextPost': '다음 글',
  'common.postNavigation': '글 탐색',
  'search.title': '검색', 'search.placeholder': '글 검색', 'search.empty': '일치하는 글이 없습니다.',
  'collections.empty': '아직 내용이 없습니다.', 'page.about': '소개', 'page.archiveTitle': '보관소',
  'page.archiveHint': '발행된 모든 글을 연도별로 봅니다.',
}

const es: Dictionary = { ...en,
  'nav.home': 'Inicio', 'nav.archive': 'Archivo', 'nav.categories': 'Categorías', 'nav.tags': 'Etiquetas',
  'nav.series': 'Series', 'nav.friends': 'Amigos', 'nav.moments': 'Momentos', 'nav.albums': 'Álbumes',
  'nav.projects': 'Proyectos', 'nav.skills': 'Habilidades', 'nav.devices': 'Dispositivos', 'nav.games': 'Juegos',
  'nav.anime': 'Anime', 'nav.timeline': 'Cronología', 'nav.compass': 'Brújula', 'nav.about': 'Acerca de',
  'nav.search': 'Buscar', 'common.readMore': 'Leer más', 'common.minRead': 'min de lectura',
  'common.posts': 'publicaciones', 'common.noPosts': 'Todavía no hay publicaciones.', 'common.loadError': 'No se pudo cargar el blog.',
  'common.retry': 'Reintentar', 'common.previous': 'Anterior', 'common.next': 'Siguiente', 'common.backHome': 'Volver al inicio',
  'common.untitled': 'Sin título', 'common.pinned': 'Fijado', 'common.updated': 'Actualizado', 'common.published': 'Publicado',
  'common.tableOfContents': 'En esta página', 'common.previousPost': 'Publicación anterior', 'common.nextPost': 'Publicación siguiente',
  'common.postNavigation': 'Navegación de publicaciones',
  'search.title': 'Buscar', 'search.placeholder': 'Buscar publicaciones', 'search.empty': 'Ninguna publicación coincide.',
  'collections.empty': 'Todavía no hay nada aquí.', 'page.about': 'Acerca de', 'page.archiveTitle': 'Archivo',
  'page.archiveHint': 'Todo lo publicado, por año.',
}

const id: Dictionary = { ...en,
  'nav.home': 'Beranda', 'nav.archive': 'Arsip', 'nav.categories': 'Kategori', 'nav.tags': 'Tag',
  'nav.series': 'Seri', 'nav.friends': 'Teman', 'nav.moments': 'Momen', 'nav.albums': 'Album',
  'nav.projects': 'Proyek', 'nav.skills': 'Keahlian', 'nav.devices': 'Perangkat', 'nav.games': 'Game',
  'nav.anime': 'Anime', 'nav.timeline': 'Linimasa', 'nav.compass': 'Kompas', 'nav.about': 'Tentang',
  'nav.search': 'Cari', 'common.readMore': 'Baca selengkapnya', 'common.minRead': 'menit baca',
  'common.posts': 'postingan', 'common.noPosts': 'Belum ada postingan.', 'common.loadError': 'Blog tidak dapat dimuat.',
  'common.retry': 'Coba lagi', 'common.previous': 'Sebelumnya', 'common.next': 'Berikutnya', 'common.backHome': 'Kembali ke beranda',
  'common.untitled': 'Tanpa judul', 'common.pinned': 'Disematkan', 'common.updated': 'Diperbarui', 'common.published': 'Diterbitkan',
  'common.tableOfContents': 'Di halaman ini', 'common.previousPost': 'Postingan sebelumnya', 'common.nextPost': 'Postingan berikutnya',
  'common.postNavigation': 'Navigasi postingan',
  'search.title': 'Cari', 'search.placeholder': 'Cari postingan', 'search.empty': 'Tidak ada postingan yang cocok.',
  'collections.empty': 'Belum ada apa pun di sini.', 'page.about': 'Tentang', 'page.archiveTitle': 'Arsip',
  'page.archiveHint': 'Semua yang diterbitkan, per tahun.',
}

const th: Dictionary = { ...en,
  'nav.home': 'หน้าแรก', 'nav.archive': 'คลัง', 'nav.categories': 'หมวดหมู่', 'nav.tags': 'แท็ก',
  'nav.series': 'ซีรีส์', 'nav.friends': 'เพื่อน', 'nav.moments': 'โมเมนต์', 'nav.albums': 'อัลบั้ม',
  'nav.projects': 'โปรเจกต์', 'nav.skills': 'ทักษะ', 'nav.devices': 'อุปกรณ์', 'nav.games': 'เกม',
  'nav.anime': 'อนิเมะ', 'nav.timeline': 'ไทม์ไลน์', 'nav.compass': 'เข็มทิศ', 'nav.about': 'เกี่ยวกับ',
  'nav.search': 'ค้นหา', 'common.readMore': 'อ่านต่อ', 'common.minRead': 'นาที',
  'common.posts': 'บทความ', 'common.noPosts': 'ยังไม่มีบทความ', 'common.loadError': 'โหลดบล็อกไม่สำเร็จ',
  'common.retry': 'ลองอีกครั้ง', 'common.previous': 'ก่อนหน้า', 'common.next': 'ถัดไป', 'common.backHome': 'กลับหน้าแรก',
  'common.untitled': 'ไม่มีชื่อ', 'common.pinned': 'ปักหมุด', 'common.updated': 'อัปเดต', 'common.published': 'เผยแพร่',
  'common.tableOfContents': 'ในหน้านี้', 'common.previousPost': 'บทความก่อนหน้า', 'common.nextPost': 'บทความถัดไป',
  'common.postNavigation': 'การนำทางบทความ',
  'search.title': 'ค้นหา', 'search.placeholder': 'ค้นหาบทความ', 'search.empty': 'ไม่พบบทความที่ตรงกัน',
  'collections.empty': 'ยังไม่มีอะไรที่นี่', 'page.about': 'เกี่ยวกับ', 'page.archiveTitle': 'คลัง',
  'page.archiveHint': 'ทุกอย่างที่เผยแพร่ แยกตามปี',
}

const tr: Dictionary = { ...en,
  'nav.home': 'Ana sayfa', 'nav.archive': 'Arşiv', 'nav.categories': 'Kategoriler', 'nav.tags': 'Etiketler',
  'nav.series': 'Seriler', 'nav.friends': 'Arkadaşlar', 'nav.moments': 'Anlar', 'nav.albums': 'Albümler',
  'nav.projects': 'Projeler', 'nav.skills': 'Beceriler', 'nav.devices': 'Cihazlar', 'nav.games': 'Oyunlar',
  'nav.anime': 'Anime', 'nav.timeline': 'Zaman çizelgesi', 'nav.compass': 'Pusula', 'nav.about': 'Hakkında',
  'nav.search': 'Ara', 'common.readMore': 'Devamını oku', 'common.minRead': 'dk okuma',
  'common.posts': 'yazı', 'common.noPosts': 'Henüz yazı yok.', 'common.loadError': 'Blog yüklenemedi.',
  'common.retry': 'Tekrar dene', 'common.previous': 'Önceki', 'common.next': 'Sonraki', 'common.backHome': 'Ana sayfaya dön',
  'common.untitled': 'Başlıksız', 'common.pinned': 'Sabitlenmiş', 'common.updated': 'Güncellendi', 'common.published': 'Yayınlandı',
  'common.tableOfContents': 'Bu sayfada', 'common.previousPost': 'Önceki yazı', 'common.nextPost': 'Sonraki yazı',
  'common.postNavigation': 'Yazı gezinmesi',
  'search.title': 'Ara', 'search.placeholder': 'Yazı ara', 'search.empty': 'Eşleşen yazı yok.',
  'collections.empty': 'Burada henüz bir şey yok.', 'page.about': 'Hakkında', 'page.archiveTitle': 'Arşiv',
  'page.archiveHint': 'Yayınlanan her şey, yıla göre.',
}

const vi: Dictionary = { ...en,
  'nav.home': 'Trang chủ', 'nav.archive': 'Lưu trữ', 'nav.categories': 'Danh mục', 'nav.tags': 'Thẻ',
  'nav.series': 'Chuỗi bài', 'nav.friends': 'Bạn bè', 'nav.moments': 'Khoảnh khắc', 'nav.albums': 'Album',
  'nav.projects': 'Dự án', 'nav.skills': 'Kỹ năng', 'nav.devices': 'Thiết bị', 'nav.games': 'Trò chơi',
  'nav.anime': 'Anime', 'nav.timeline': 'Dòng thời gian', 'nav.compass': 'La bàn', 'nav.about': 'Giới thiệu',
  'nav.search': 'Tìm kiếm', 'common.readMore': 'Đọc tiếp', 'common.minRead': 'phút đọc',
  'common.posts': 'bài viết', 'common.noPosts': 'Chưa có bài viết.', 'common.loadError': 'Không thể tải blog.',
  'common.retry': 'Thử lại', 'common.previous': 'Trước', 'common.next': 'Sau', 'common.backHome': 'Về trang chủ',
  'common.untitled': 'Không tiêu đề', 'common.pinned': 'Ghim', 'common.updated': 'Cập nhật', 'common.published': 'Xuất bản',
  'common.tableOfContents': 'Trong trang này', 'common.previousPost': 'Bài trước', 'common.nextPost': 'Bài sau',
  'common.postNavigation': 'Điều hướng bài viết',
  'search.title': 'Tìm kiếm', 'search.placeholder': 'Tìm bài viết', 'search.empty': 'Không có bài viết phù hợp.',
  'collections.empty': 'Chưa có nội dung.', 'page.about': 'Giới thiệu', 'page.archiveTitle': 'Lưu trữ',
  'page.archiveHint': 'Tất cả nội dung đã xuất bản, theo năm.',
}

const dictionaries: Record<BlogLocale, Dictionary> = {
  en, 'zh-CN': zhCN, 'zh-TW': zhTW, ja, ko, es, id, th, tr, vi,
}

export function blogLocale(value: string | undefined): BlogLocale {
  return LOCALES.includes(value as BlogLocale) ? (value as BlogLocale) : 'en'
}

export function t(locale: BlogLocale, key: MessageKey): string {
  return dictionaries[locale]?.[key] ?? en[key]
}
