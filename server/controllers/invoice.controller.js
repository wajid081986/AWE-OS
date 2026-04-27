const supabase = require('../db/supabase');

async function getInvoices(req, res) {
  const userId = req.user?.userId;
  const { status, search } = req.query;

  try {
    let query = supabase
      .from('invoices')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') query = query.eq('status', status);
    if (search) query = query.ilike('client_name', `%${search}%`);

    const { data: invoices, error } = await query;
    if (error) throw error;

    const list    = invoices || [];
    const paid    = list.filter(i => i.status === 'paid');
    const pending = list.filter(i => i.status === 'pending');
    const ago30   = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const overdue = pending.filter(i => new Date(i.created_at) < ago30);

    return res.json({
      success:  true,
      invoices: list,
      data:     list, // backward compat
      stats: {
        total_revenue:  paid.reduce((s, i) => s + Number(i.total_amount || 0), 0),
        paid_count:     paid.length,
        pending_count:  pending.length,
        overdue_count:  overdue.length,
      },
    });
  } catch (err) {
    console.error('[Invoice] getInvoices:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function getInvoice(req, res) {
  const userId = req.user?.userId;
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ success: false, message: 'Invoice not found' });
      throw error;
    }

    return res.json({ success: true, data });
  } catch (err) {
    console.error('[Invoice] getInvoice:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function createInvoice(req, res) {
  const userId = req.user?.userId;
  const {
    client_name, client_info, business_info, items,
    total_amount, currency, discount, tax_amount,
    notes, terms, due_date, invoice_number, status,
  } = req.body;

  if (!client_name || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, message: 'client_name and at least one item are required' });
  }

  try {
    // Auto-generate invoice number if not provided
    let invNum = invoice_number;
    if (!invNum) {
      const { data: last } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('user_id', userId)
        .not('invoice_number', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let next = 1;
      if (last?.invoice_number) {
        const m = last.invoice_number.match(/(\d+)$/);
        if (m) next = parseInt(m[1]) + 1;
      }
      invNum = `INV-${String(next).padStart(3, '0')}`;
    }

    const calcTotal = total_amount != null
      ? Number(total_amount)
      : items.reduce((s, i) => s + Number(i.qty || 1) * Number(i.rate || 0), 0)
          + Number(tax_amount || 0)
          - Number(discount || 0);

    const { data, error } = await supabase
      .from('invoices')
      .insert([{
        user_id:        userId,
        client_name,
        client_info:    client_info   || null,
        business_info:  business_info || null,
        items,
        total_amount:   calcTotal,
        currency:       currency || 'INR',
        discount:       Number(discount  || 0),
        tax_amount:     Number(tax_amount || 0),
        notes:          notes || null,
        terms:          terms || null,
        due_date:       due_date || null,
        invoice_number: invNum,
        status:         status || 'pending',
      }])
      .select('*')
      .single();

    if (error) throw error;
    return res.status(201).json({ success: true, data, message: 'Invoice created' });
  } catch (err) {
    console.error('[Invoice] createInvoice:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function updateInvoice(req, res) {
  const userId = req.user?.userId;
  const { id } = req.params;
  const {
    status, client_name, client_info, business_info,
    items, total_amount, notes, terms, due_date,
    currency, discount, tax_amount,
  } = req.body;

  try {
    const updates = {};
    if (status        !== undefined) updates.status        = status;
    if (client_name   !== undefined) updates.client_name   = client_name;
    if (client_info   !== undefined) updates.client_info   = client_info;
    if (business_info !== undefined) updates.business_info = business_info;
    if (items         !== undefined) updates.items         = items;
    if (total_amount  !== undefined) updates.total_amount  = Number(total_amount);
    if (notes         !== undefined) updates.notes         = notes;
    if (terms         !== undefined) updates.terms         = terms;
    if (due_date      !== undefined) updates.due_date      = due_date;
    if (currency      !== undefined) updates.currency      = currency;
    if (discount      !== undefined) updates.discount      = Number(discount);
    if (tax_amount    !== undefined) updates.tax_amount    = Number(tax_amount);
    if (status === 'paid') updates.paid_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ success: false, message: 'Invoice not found' });
      throw error;
    }

    return res.json({ success: true, data, message: 'Invoice updated' });
  } catch (err) {
    console.error('[Invoice] updateInvoice:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function deleteInvoice(req, res) {
  const userId = req.user?.userId;
  const { id } = req.params;

  try {
    const { data: inv, error: fetchErr } = await supabase
      .from('invoices')
      .select('id, status')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (fetchErr || !inv) return res.status(404).json({ success: false, message: 'Invoice not found' });

    if (inv.status === 'draft') {
      const { error } = await supabase.from('invoices').delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;
      return res.json({ success: true, message: 'Invoice deleted' });
    }

    // Soft delete for non-drafts
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    return res.json({ success: true, message: 'Invoice cancelled' });
  } catch (err) {
    console.error('[Invoice] deleteInvoice:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

async function getInvoiceStats(req, res) {
  const userId = req.user?.userId;

  try {
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('id, status, total_amount, created_at, client_name, invoice_number')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const list       = invoices || [];
    const now        = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const ago30      = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const paid       = list.filter(i => i.status === 'paid');
    const pending    = list.filter(i => i.status === 'pending');
    const thisMonth  = paid.filter(i => new Date(i.created_at) >= monthStart);

    return res.json({
      success: true,
      stats: {
        total_revenue:   paid.reduce((s, i) => s + Number(i.total_amount || 0), 0),
        monthly_revenue: thisMonth.reduce((s, i) => s + Number(i.total_amount || 0), 0),
        paid_count:      paid.length,
        pending_count:   pending.length,
        overdue_count:   pending.filter(i => new Date(i.created_at) < ago30).length,
        total_count:     list.length,
        recent:          list.slice(0, 5),
      },
    });
  } catch (err) {
    console.error('[Invoice] getInvoiceStats:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = { getInvoices, getInvoice, createInvoice, updateInvoice, deleteInvoice, getInvoiceStats };
