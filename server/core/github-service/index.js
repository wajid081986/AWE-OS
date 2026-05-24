'use strict';

/**
 * AWE-OS — GitHub Contents API service
 *
 * Shared service for all GitHub file-push operations.
 * Both admin-blog.js and admin-seo.js delegate here.
 *
 * Exports:
 *   pushBlogPost(newPost)            → { success, slug, id, liveUrl, commitUrl }
 *   pushCityPage(newPage, slug)      → { success, slug, id, updated, liveUrl, commitUrl }
 *   getFileFromGitHub(filePath)      → { content, sha }   (raw helper)
 *   pushFileToGitHub(filePath, opts) → pushRes JSON        (raw helper)
 */

const vm = require('vm');

const REPO     = 'wajid081986/AWE-OS';
const BRANCH   = 'main';
const API_BASE = 'https://api.github.com';

function getHeaders() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN not set — add it in Render dashboard');
  return {
    Authorization: `token ${token}`,
    Accept:        'application/vnd.github.v3+json',
    'User-Agent':  'AWE-OS-Service',
  };
}

// ── Low-level helpers ──────────────────────────────────────────────────────────

async function getFileFromGitHub(filePath) {
  const headers = getHeaders();
  const res = await fetch(`${API_BASE}/repos/${REPO}/contents/${filePath}?ref=${BRANCH}`, { headers });
  if (!res.ok) {
    if (res.status === 404) return { content: null, sha: null };
    throw new Error(`GitHub GET failed: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  return {
    content: Buffer.from(data.content, 'base64').toString('utf8'),
    sha:     data.sha,
  };
}

async function pushFileToGitHub(filePath, { message, content, sha }) {
  const headers = getHeaders();
  const body = { message, content: Buffer.from(content, 'utf8').toString('base64'), branch: BRANCH };
  if (sha) body.sha = sha;

  const res  = await fetch(`${API_BASE}/repos/${REPO}/contents/${filePath}`, {
    method:  'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'GitHub push failed');
  return data;
}

// ── Safe array serializer — pure JSON inside ES module export ─────────────────
// Replaces the old regex-based serializeJs which corrupted strings with apostrophes.

function serializeJsArray(arr, exportName) {
  return `export const ${exportName} = ${JSON.stringify(arr, null, 2)};\n`;
}

// ── Safe array parser — handles both old JS format and new JSON format ─────────

function parseJsArray(content, exportName) {
  // Strategy 1: vm.runInNewContext (handles both JS-with-unquoted-keys and JSON)
  try {
    const cjs = content.replace(/export\s+const\s+/g, 'var ');
    const ctx = Object.create(null);
    vm.runInNewContext(cjs, ctx, { timeout: 5000 });
    if (Array.isArray(ctx[exportName])) return ctx[exportName];
  } catch (_e1) {
    // Strategy 2: extract JSON array directly (works when content is JSON-format)
    try {
      const match = content.match(/export\s+const\s+\w+\s*=\s*(\[[\s\S]*?\]);?\s*$/);
      if (match) return JSON.parse(match[1]);
    } catch (_e2) {}
  }
  return [];
}

// ── Blog post publisher ────────────────────────────────────────────────────────

async function pushBlogPost(newPost) {
  const FILE_PATH = 'client/src/data/blogPosts.js';
  const { content: currentContent, sha: fileSha } = await getFileFromGitHub(FILE_PATH);
  if (!currentContent) throw new Error('blogPosts.js not found in repository');

  // Assign next sequential id
  const idMatches = [...currentContent.matchAll(/\bid:\s*(\d+)/g)];
  const maxId     = idMatches.length ? Math.max(...idMatches.map(m => parseInt(m[1]))) : 0;
  newPost.id      = maxId + 1;

  // Insert at top of BLOG_POSTS array
  const MARKER      = 'export const BLOG_POSTS = [';
  const insertPoint = currentContent.indexOf(MARKER) + MARKER.length;
  if (insertPoint === MARKER.length - 1) throw new Error('BLOG_POSTS array marker not found in blogPosts.js');

  const divider     = '─'.repeat(77);
  const commentLine = `\n  // ${divider}\n  // ${newPost.id}. ${newPost.title}\n  // ${divider}\n`;

  const postString = JSON.stringify(newPost, null, 2)
    .replace(/"([^"]+)":/g, '$1:')
    .replace(/"((?:[^"\\])*)"/g, (_, s) => s.includes("'") ? `"${s}"` : `'${s}'`);

  const newContent =
    currentContent.slice(0, insertPoint) +
    commentLine +
    '  ' + postString.replace(/\n/g, '\n  ') +
    ',' +
    currentContent.slice(insertPoint);

  const pushData = await pushFileToGitHub(FILE_PATH, {
    message: `blog: add "${newPost.title}"`,
    content: newContent,
    sha:     fileSha,
  });

  return {
    success:   true,
    slug:      newPost.slug,
    id:        newPost.id,
    liveUrl:   `https://www.awe-os.com/blog/${newPost.slug}`,
    commitUrl: pushData.commit?.html_url,
  };
}

// ── City page publisher ────────────────────────────────────────────────────────

async function pushCityPage(newPage, slug) {
  const FILE_PATH = 'client/src/data/cityPages.js';
  let { content: currentContent, sha: fileSha } = await getFileFromGitHub(FILE_PATH);

  if (!currentContent) {
    currentContent = 'export const CITY_PAGES = [\n]\n';
    fileSha        = null;
  }

  let existingPages = parseJsArray(currentContent, 'CITY_PAGES');

  newPage.publishedAt = new Date().toISOString().split('T')[0];
  newPage.slug        = slug;

  // Upsert: update in-place if slug exists, otherwise prepend
  const existingIndex = existingPages.findIndex(p => p.slug === slug);
  let isUpdate = false;
  if (existingIndex !== -1) {
    newPage.id                   = existingPages[existingIndex].id;
    existingPages[existingIndex] = newPage;
    isUpdate = true;
  } else {
    const maxId = existingPages.reduce((max, p) => Math.max(max, p.id || 0), 0);
    newPage.id  = maxId + 1;
    existingPages.unshift(newPage);
  }

  const newContent = serializeJsArray(existingPages, 'CITY_PAGES');

  const pushData = await pushFileToGitHub(FILE_PATH, {
    message: isUpdate
      ? `seo: update city page "${newPage.title || slug}"`
      : `seo: add city page "${newPage.title || slug}"`,
    content: newContent,
    sha:     fileSha,
  });

  return {
    success:   true,
    slug,
    id:        newPage.id,
    updated:   isUpdate,
    liveUrl:   `https://www.awe-os.com/${slug}`,
    commitUrl: pushData.commit?.html_url,
  };
}

// ── Generic array-page publisher (reused by comparison + faq) ─────────────────

async function pushGenericArrayPage(newPage, slug, { filePath, arrayName, urlPrefix, commitPrefix }) {
  let { content: currentContent, sha: fileSha } = await getFileFromGitHub(filePath);

  if (!currentContent) {
    currentContent = `export const ${arrayName} = [\n]\n`;
    fileSha        = null;
  }

  let existingPages = parseJsArray(currentContent, arrayName);

  newPage.publishedAt = new Date().toISOString().split('T')[0];
  newPage.slug        = slug;

  const existingIndex = existingPages.findIndex(p => p.slug === slug);
  let isUpdate = false;
  if (existingIndex !== -1) {
    newPage.id                   = existingPages[existingIndex].id;
    existingPages[existingIndex] = newPage;
    isUpdate = true;
  } else {
    const maxId = existingPages.reduce((max, p) => Math.max(max, p.id || 0), 0);
    newPage.id  = maxId + 1;
    existingPages.unshift(newPage);
  }

  const newContent = serializeJsArray(existingPages, arrayName);

  const pushData = await pushFileToGitHub(filePath, {
    message: isUpdate
      ? `${commitPrefix}: update "${newPage.title || slug}"`
      : `${commitPrefix}: add "${newPage.title || slug}"`,
    content: newContent,
    sha:     fileSha,
  });

  return {
    success:   true,
    slug,
    id:        newPage.id,
    updated:   isUpdate,
    liveUrl:   `https://www.awe-os.com/${urlPrefix}/${slug}`,
    commitUrl: pushData.commit?.html_url,
  };
}

// ── Comparison page publisher ──────────────────────────────────────────────────

async function pushComparisonPage(page, slug) {
  return pushGenericArrayPage(page, slug, {
    filePath:      'client/src/data/comparisonPages.js',
    arrayName:     'COMPARISON_PAGES',
    urlPrefix:     'compare',
    commitPrefix:  'seo',
  });
}

// ── FAQ page publisher ─────────────────────────────────────────────────────────

async function pushFaqPage(page, slug) {
  return pushGenericArrayPage(page, slug, {
    filePath:      'client/src/data/faqPages.js',
    arrayName:     'FAQ_PAGES',
    urlPrefix:     'faq',
    commitPrefix:  'seo',
  });
}

module.exports = { pushBlogPost, pushCityPage, pushComparisonPage, pushFaqPage, getFileFromGitHub, pushFileToGitHub };
