const express  = require('express')
const multer   = require('multer')
const crypto   = require('crypto')
const Razorpay = require('razorpay')
const { createClient } = require('@supabase/supabase-js')
const { requireAuth, requireAdmin } = require('../middleware/admin.middleware')
const { uploadFile, generatePresignedUrl, deleteFile } = require('../services/s3.service')

const router  = express.Router()

// Allowed MIME types for digital product uploads
const ALLOWED_PRODUCT_MIMES = new Set([
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'text/csv',
])

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_PRODUCT_MIMES.has(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`File type "${file.mimetype}" is not allowed`), false)
    }
  },
})
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

// ── Public: list published products (no file_key) ──────────────
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('digital_products')
      .select('id, name, description, category, price, preview_url, thumbnail_url, created_at')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json({ products: data })
  } catch (err) {
    console.error('GET /products error:', err.message)
    res.status(500).json({ error: 'Failed to load products' })
  }
})

// ── Admin: list all products ────────────────────────────────────
router.get('/admin', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('digital_products')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json({ products: data })
  } catch (err) {
    console.error('GET /products/admin error:', err.message)
    res.status(500).json({ error: 'Failed to load products' })
  }
})

// ── Admin: upload new product ───────────────────────────────────
router.post('/', requireAuth, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { name, description, category, price, preview_url, thumbnail_url } = req.body
    if (!name || !price) return res.status(400).json({ error: 'name and price are required' })
    if (!req.file)       return res.status(400).json({ error: 'file is required' })

    const ext     = req.file.originalname.split('.').pop()
    const fileKey = `products/${crypto.randomBytes(16).toString('hex')}.${ext}`
    await uploadFile(req.file.buffer, fileKey, req.file.mimetype)

    const { data, error } = await supabase
      .from('digital_products')
      .insert({
        name,
        description: description || '',
        category:    category    || 'General',
        price:       parseFloat(price),
        file_key:    fileKey,
        preview_url:   preview_url   || null,
        thumbnail_url: thumbnail_url || null,
        is_published: false,
      })
      .select()
      .single()
    if (error) throw error
    res.status(201).json({ product: data })
  } catch (err) {
    console.error('POST /products error:', err.message)
    res.status(500).json({ error: 'Upload failed' })
  }
})

// ── Admin: update product ───────────────────────────────────────
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, description, category, price, preview_url, thumbnail_url, is_published } = req.body
    const updates = {}
    if (name          !== undefined) updates.name          = name
    if (description   !== undefined) updates.description   = description
    if (category      !== undefined) updates.category      = category
    if (price         !== undefined) updates.price         = parseFloat(price)
    if (preview_url   !== undefined) updates.preview_url   = preview_url
    if (thumbnail_url !== undefined) updates.thumbnail_url = thumbnail_url
    if (is_published  !== undefined) updates.is_published  = is_published

    const { data, error } = await supabase
      .from('digital_products')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single()
    if (error) throw error
    res.json({ product: data })
  } catch (err) {
    console.error('PUT /products/:id error:', err.message)
    res.status(500).json({ error: 'Update failed' })
  }
})

// ── Admin: delete product ───────────────────────────────────────
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { data: product, error: fetchErr } = await supabase
      .from('digital_products')
      .select('file_key')
      .eq('id', req.params.id)
      .single()
    if (fetchErr) throw fetchErr

    if (product?.file_key) {
      await deleteFile(product.file_key).catch(e => console.warn('S3 delete failed:', e.message))
    }

    const { error } = await supabase.from('digital_products').delete().eq('id', req.params.id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    console.error('DELETE /products/:id error:', err.message)
    res.status(500).json({ error: 'Delete failed' })
  }
})

// ── Auth: my purchases ──────────────────────────────────────────
// MUST be before /:id
router.get('/my-purchases', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('purchases')
      .select(`
        id, purchased_at, amount,
        digital_products (id, name, description, category, thumbnail_url)
      `)
      .eq('user_id', req.user.userId)
      .order('purchased_at', { ascending: false })
    if (error) throw error
    res.json({ purchases: data })
  } catch (err) {
    console.error('GET /products/my-purchases error:', err.message)
    res.status(500).json({ error: 'Failed to load purchases' })
  }
})

// ── Auth: download (presigned URL) ─────────────────────────────
router.get('/:id/download', requireAuth, async (req, res) => {
  try {
    // Check ownership
    const { data: purchase, error: purchaseErr } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', req.user.userId)
      .eq('product_id', req.params.id)
      .maybeSingle()
    if (purchaseErr) throw purchaseErr
    if (!purchase) return res.status(403).json({ error: 'Purchase required' })

    const { data: product, error: productErr } = await supabase
      .from('digital_products')
      .select('file_key')
      .eq('id', req.params.id)
      .single()
    if (productErr) throw productErr

    const url = await generatePresignedUrl(product.file_key, 86400)
    res.json({ url })
  } catch (err) {
    console.error('GET /products/:id/download error:', err.message)
    res.status(500).json({ error: 'Download failed' })
  }
})

// ── Auth: create Razorpay order ─────────────────────────────────
router.post('/purchase', requireAuth, async (req, res) => {
  try {
    const { productId } = req.body
    if (!productId) return res.status(400).json({ error: 'productId is required' })

    const { data: product, error } = await supabase
      .from('digital_products')
      .select('id, name, price, is_published')
      .eq('id', productId)
      .single()
    if (error || !product) return res.status(404).json({ error: 'Product not found' })
    if (!product.is_published) return res.status(400).json({ error: 'Product not available' })

    // Check not already purchased
    const { data: existing } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', req.user.userId)
      .eq('product_id', productId)
      .maybeSingle()
    if (existing) return res.status(400).json({ error: 'Already purchased' })

    const amountPaise = Math.round(product.price * 100)
    const order = await razorpay.orders.create({
      amount:   amountPaise,
      currency: 'INR',
      notes:    { userId: req.user.userId, productId },
    })

    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, productName: product.name })
  } catch (err) {
    console.error('POST /products/purchase error:', err.message)
    res.status(500).json({ error: 'Failed to create order' })
  }
})

// ── Auth: verify payment + record purchase ──────────────────────
router.post('/verify', requireAuth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, productId } = req.body
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !productId) {
      return res.status(400).json({ error: 'Missing payment fields' })
    }

    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    if (expectedSig !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' })
    }

    // Fetch order amount
    const order = await razorpay.orders.fetch(razorpay_order_id)

    const { error } = await supabase.from('purchases').insert({
      user_id:    req.user.userId,
      product_id: productId,
      order_id:   razorpay_order_id,
      payment_id: razorpay_payment_id,
      amount:     order.amount / 100,
    })
    if (error) throw error

    res.json({ success: true })
  } catch (err) {
    console.error('POST /products/verify error:', err.message)
    res.status(500).json({ error: 'Verification failed' })
  }
})

module.exports = router
