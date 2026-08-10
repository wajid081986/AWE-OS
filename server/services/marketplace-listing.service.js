'use strict';

const crypto   = require('crypto');
const supabase = require('../db/supabase');

// Same tiny helpers `store.seller.routes.js` uses for its human-seller
// listing-creation path — duplicated rather than imported, since that file's
// `module.exports` is the router itself (required directly by server/index.js)
// and changing its shape isn't worth it for two pure functions.
function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
    .slice(0, 60);
}

async function uniqueSlug(base) {
  let candidate = base || 'item';
  for (let i = 0; i < 5; i++) {
    const { data } = await supabase.from('digital_products').select('id').eq('slug', candidate).maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${crypto.randomBytes(3).toString('hex')}`;
  }
  return `${base}-${crypto.randomBytes(6).toString('hex')}`;
}

const BUNDLE_MIME_TYPES = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.json': 'application/json',
  '.jsx':  'text/plain',
  '.js':   'application/javascript',
  '.md':   'text/markdown',
};

function mimeTypeForAssetUrl(assetUrl) {
  if (!assetUrl) return null;
  const ext = assetUrl.slice(assetUrl.lastIndexOf('.'));
  return BUNDLE_MIME_TYPES[ext] || 'application/octet-stream';
}

// Best-effort: called from the tools approval path, must never throw back
// into that handler. Creates a digital_products row using the exact same
// insert shape/target table human sellers use (POST /api/store/seller/products),
// with status: 'pending' — the DB trigger fn_sync_digital_products_status_published
// forces is_published=false on insert, so nothing goes live until an admin
// approves it via the existing Store Approvals queue. seller_id is left null
// ("Platform" — already a supported case in that queue's UI and in historical
// pre-marketplace rows).
async function createMarketplaceListing(tool) {
  try {
    const listing = tool?.packaging_metadata?.listing;
    if (!listing) {
      console.warn(`[MARKETPLACE LISTING] Skipped for tool ${tool?.id}: no packaging_metadata.listing`);
      return null;
    }

    const slug = await uniqueSlug(slugify(listing.title || tool.name));

    const { data, error } = await supabase
      .from('digital_products')
      .insert({
        title:         listing.title || tool.name,
        description:   listing.description || '',
        category:      listing.category || 'General',
        price:         Number(listing.price) || 0,
        file_key:      tool.asset_url || null,
        file_type:     mimeTypeForAssetUrl(tool.asset_url),
        thumbnail_url: null,
        seller_id:     null,
        slug,
        tags:          Array.isArray(listing.tags) ? listing.tags : [],
        status:        'pending',
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`[MARKETPLACE LISTING] Created pending listing ${data.id} for tool ${tool.id}`);
    return data;
  } catch (err) {
    console.error(`[MARKETPLACE LISTING] Failed for tool ${tool?.id}:`, err.message);
    return null;
  }
}

module.exports = { createMarketplaceListing };
