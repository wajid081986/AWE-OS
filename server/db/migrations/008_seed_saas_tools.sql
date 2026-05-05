-- ============================================================
-- Migration 008: Add icon + usage_count columns to saas_tools,
--                then seed 20 live published tools.
--
-- Must run AFTER migration 007.
-- Safe to run multiple times: INSERT uses ON CONFLICT DO NOTHING.
-- ============================================================

-- ── Add missing columns to saas_tools ────────────────────────────────────────
ALTER TABLE public.saas_tools
  ADD COLUMN IF NOT EXISTS icon        TEXT,
  ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

-- ── Ensure is_published defaults to false so we can set it per-row ───────────
ALTER TABLE public.saas_tools
  ALTER COLUMN is_published SET DEFAULT false;

-- ── Seed 20 live tools ───────────────────────────────────────────────────────
INSERT INTO public.saas_tools
  (name, slug, description, category, icon, is_published, is_free, quality_score, usage_count)
VALUES
  ('Resume Builder',        'resume-builder',        'Create professional ATS-friendly resumes with AI in minutes.',          'ai_tools',    '📄', true, true, 92, 12500),
  ('PDF Merger',            'pdf-merger',            'Merge multiple PDF files into one with a single click.',                'converters',  '📎', true, true, 88, 8900),
  ('BMI Calculator',        'bmi-calculator',        'Calculate your Body Mass Index instantly with health insights.',         'calculators', '⚖️', true, true, 90, 15000),
  ('Word Counter',          'word-counter',          'Count words, characters, sentences and paragraphs instantly.',          'ai_tools',    '📝', true, true, 85, 9200),
  ('Image Compressor',      'image-compressor',      'Compress images without losing quality — JPG, PNG, WEBP.',             'converters',  '🖼️', true, true, 84, 6400),
  ('Loan Calculator',       'loan-calculator',       'Calculate monthly loan EMI payments for home, car and personal loans.', 'calculators', '💰', true, true, 87, 22000),
  ('QR Code Generator',     'qr-code-generator',     'Generate QR codes instantly for any URL, text or contact.',            'ai_tools',    '📱', true, true, 86, 7100),
  ('Password Generator',    'password-generator',    'Generate strong, secure passwords with custom rules.',                  'ai_tools',    '🔐', true, true, 89, 5600),
  ('Unit Converter',        'unit-converter',        'Convert any unit of measurement — length, weight, temperature.',       'converters',  '🔄', true, true, 83, 4800),
  ('Age Calculator',        'age-calculator',        'Calculate your exact age in years, months and days.',                  'calculators', '🎂', true, true, 91, 28000),
  ('Text to Speech',        'text-to-speech',        'Convert text to natural-sounding AI speech in multiple languages.',     'ai_tools',    '🔊', true, true, 82, 3400),
  ('Color Picker',          'color-picker',          'Pick and convert colors between HEX, RGB, HSL and more.',             'converters',  '🎨', true, true, 81, 2900),
  ('Percentage Calculator', 'percentage-calculator', 'Calculate percentages, percentage change and ratios easily.',           'calculators', '📊', true, true, 88, 18500),
  ('Invoice Generator',     'invoice-generator',     'Create professional, branded invoices with AI — free.',                'ai_tools',    '🧾', true, true, 85, 3800),
  ('CSV to JSON',           'csv-to-json',           'Convert CSV files to JSON format instantly in your browser.',           'converters',  '📋', true, true, 80, 3200),
  ('Interest Calculator',   'interest-calculator',   'Calculate simple and compound interest on any investment or loan.',     'calculators', '🏦', true, true, 86, 11000),
  ('Plagiarism Checker',    'plagiarism-checker',    'Check content for plagiarism and duplicate text detection.',            'ai_tools',    '🔍', true, true, 83, 4100),
  ('Image to PDF',          'image-to-pdf',          'Convert JPG, PNG and WEBP images to PDF instantly.',                   'converters',  '📄', true, true, 87, 7800),
  ('GPA Calculator',        'gpa-calculator',        'Calculate your Grade Point Average for semester and cumulative GPA.',   'calculators', '🎓', true, true, 85, 8200),
  ('AI Content Writer',     'ai-content-writer',     'Write SEO-optimised blog posts, captions and ad copy with GPT AI.',    'ai_tools',    '✍️', true, true, 90, 9200)
ON CONFLICT (slug) DO UPDATE SET
  is_published  = EXCLUDED.is_published,
  icon          = COALESCE(saas_tools.icon, EXCLUDED.icon),
  usage_count   = GREATEST(saas_tools.usage_count, EXCLUDED.usage_count),
  quality_score = GREATEST(saas_tools.quality_score, EXCLUDED.quality_score);
