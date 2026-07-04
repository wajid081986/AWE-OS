'use strict';

/**
 * Shared Pinterest posting helper.
 * Extracted so both the admin-triggered social-publish route and the
 * auto-campaign one-shot tool post through the same client/error handling
 * (mirrors twitter.service.js's role for tweets).
 */

const PINTEREST_API = 'https://api.pinterest.com/v5';

function getPinterestHeaders() {
  const token = process.env.PINTEREST_ACCESS_TOKEN;
  if (!token) {
    throw new Error('PINTEREST_ACCESS_TOKEN not configured');
  }
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function resolveBoardId(boardId) {
  if (boardId) return boardId;

  const headers   = getPinterestHeaders();
  const boardsRes = await fetch(`${PINTEREST_API}/boards?page_size=5`, { headers });
  if (!boardsRes.ok) {
    throw new Error(`Pinterest boards fetch failed: ${boardsRes.status}`);
  }
  const boardsData = await boardsRes.json();
  const boards = boardsData.items || [];
  if (!boards.length) throw new Error('No Pinterest boards found. Create a board first.');
  return boards[0].id;
}

function classifyPinterestError(status, errData) {
  if (status === 401) return 'Pinterest token expired. Re-authenticate in Pinterest developer console.';
  if (status === 404) return 'Pinterest board not found.';
  return errData?.message || `Pinterest API error: ${status}`;
}

/**
 * Create a pin. Neither existing caller ever uploads a real per-post image
 * today — `imageUrl` defaults to the site's static OG image.
 */
async function createPin({ title, description, link, boardId, imageUrl }) {
  const headers         = getPinterestHeaders();
  const resolvedBoardId = await resolveBoardId(boardId);

  const pinPayload = {
    board_id:    resolvedBoardId,
    title:       (title || 'AWE-OS').slice(0, 100),
    description: (description || '').slice(0, 500),
    link:        link || 'https://www.awe-os.com',
    media_source: {
      source_type: 'image_url',
      url: imageUrl || 'https://www.awe-os.com/og-image.png',
    },
  };

  const pinRes = await fetch(`${PINTEREST_API}/pins`, {
    method:  'POST',
    headers,
    body:    JSON.stringify(pinPayload),
  });

  if (!pinRes.ok) {
    const errData = await pinRes.json().catch(() => ({}));
    throw new Error(classifyPinterestError(pinRes.status, errData));
  }

  const pin = await pinRes.json();
  return { pinId: pin.id, pinUrl: `https://pinterest.com/pin/${pin.id}` };
}

module.exports = { createPin, resolveBoardId, classifyPinterestError };
