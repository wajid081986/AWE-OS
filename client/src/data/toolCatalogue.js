// Central catalogue — used by Header dropdowns, ToolsPage sub-sections, and Home categories
export const TOOL_CATALOGUE = {
  pdf: {
    label: 'PDF Tools',
    icon: '📄',
    to: '/tools?cat=pdf',
    count: '14+',
    description: 'Merge, split, compress, convert and secure PDFs',
    accent: 'red',
    sections: [
      {
        title: 'Organize PDF',
        items: [
          { icon: '📎', label: 'Merge PDF',        to: '/tools/merge-pdf'        },
          { icon: '✂️', label: 'Split PDF',         to: '/tools/split-pdf'        },
          { icon: '🗑️', label: 'Remove Pages',     to: '/tools/remove-pages-pdf' },
          { icon: '📄', label: 'Extract Pages',    to: '/tools/extract-pages-pdf'},
          { icon: '📋', label: 'Organize PDF',     to: '/tools/organize-pdf'     },
          { icon: '📱', label: 'Scan to PDF',      to: '/tools/scan-to-pdf',     comingSoon: true },
        ],
      },
      {
        title: 'Optimize PDF',
        items: [
          { icon: '🗜️', label: 'Compress PDF',     to: '/tools/compress-pdf'     },
        ],
      },
      {
        title: 'Convert to PDF',
        items: [
          { icon: '🖼️', label: 'JPG to PDF',       to: '/tools/jpg-to-pdf'       },
          { icon: '📝', label: 'Word to PDF',      to: '/tools/word-to-pdf',     comingSoon: true },
          { icon: '📊', label: 'PowerPoint to PDF',to: '/tools/powerpoint-to-pdf',comingSoon: true},
          { icon: '📈', label: 'Excel to PDF',     to: '/tools/excel-to-pdf',    comingSoon: true },
        ],
      },
      {
        title: 'Convert from PDF',
        items: [
          { icon: '📸', label: 'PDF to JPG',       to: '/tools/pdf-to-jpg'       },
          { icon: '📝', label: 'PDF to Word',      to: '/tools/pdf-to-word',     comingSoon: true },
          { icon: '📈', label: 'PDF to Excel',     to: '/tools/pdf-to-excel',    comingSoon: true },
        ],
      },
      {
        title: 'Edit PDF',
        items: [
          { icon: '🔄', label: 'Rotate PDF',       to: '/tools/rotate-pdf'       },
          { icon: '💧', label: 'Add Watermark',    to: '/tools/watermark-pdf'    },
          { icon: '🔢', label: 'Add Page Numbers', to: '/tools/page-numbers-pdf' },
        ],
      },
      {
        title: 'PDF Security',
        items: [
          { icon: '🔐', label: 'Protect PDF',      to: '/tools/protect-pdf'      },
          { icon: '🔓', label: 'Unlock PDF',       to: '/tools/unlock-pdf'       },
        ],
      },
    ],
  },

  calculators: {
    label: 'Calculators',
    icon: '🧮',
    to: '/tools?cat=calculators',
    count: '6+',
    description: 'BMI, Loan, GPA, Age, Percentage and more',
    accent: 'green',
    sections: [
      {
        title: 'Health',
        items: [
          { icon: '⚖️', label: 'BMI Calculator',        to: '/tools/bmi-calculator'        },
          { icon: '🎂', label: 'Age Calculator',         to: '/tools/age-calculator'        },
        ],
      },
      {
        title: 'Finance',
        items: [
          { icon: '🏦', label: 'Loan EMI Calculator',   to: '/tools/loan-calculator'       },
          { icon: '📊', label: 'Percentage Calculator', to: '/tools/percentage-calculator' },
          { icon: '💰', label: 'Interest Calculator',   to: '/tools/interest-calculator',  comingSoon: true },
        ],
      },
      {
        title: 'Education',
        items: [
          { icon: '🎓', label: 'GPA Calculator',        to: '/tools/gpa-calculator'        },
        ],
      },
    ],
  },

  converters: {
    label: 'Converters',
    icon: '🔄',
    to: '/tools?cat=converters',
    count: '8+',
    description: 'Unit conversion, text tools, file converters',
    accent: 'purple',
    sections: [
      {
        title: 'Unit Conversion',
        items: [
          { icon: '📐', label: 'Unit Converter',        to: '/tools/unit-converter'        },
          { icon: '🎨', label: 'Color Picker',          to: '/tools/color-picker'          },
        ],
      },
      {
        title: 'Text Tools',
        items: [
          { icon: '📝', label: 'Word Counter',          to: '/tools/word-counter'          },
          { icon: '🔐', label: 'Password Generator',    to: '/tools/password-generator'    },
        ],
      },
      {
        title: 'File Conversion',
        items: [
          { icon: '📊', label: 'CSV to JSON',           to: '/tools/csv-to-json',          comingSoon: true },
          { icon: '🖼️', label: 'Image Compressor',      to: '/tools/image-compressor',     comingSoon: true },
        ],
      },
    ],
  },

  ai: {
    label: 'AI Tools',
    icon: '🤖',
    to: '/tools?cat=ai_tools',
    count: '2+',
    description: 'AI-powered writing, resume building and more',
    accent: 'blue',
    sections: [
      {
        title: 'Writing',
        items: [
          { icon: '✍️', label: 'AI Content Writer',    to: '/tools/ai-content-writer',    comingSoon: true },
          { icon: '📄', label: 'Resume Builder',       to: '/tools/resume-builder',       comingSoon: true },
        ],
      },
      {
        title: 'Coming Soon',
        items: [
          { icon: '📖', label: 'AI Summarizer',        to: '/tools/ai-summarizer',        comingSoon: true },
          { icon: '🔊', label: 'Text to Speech',       to: '/tools/text-to-speech',       comingSoon: true },
          { icon: '🕵️', label: 'Plagiarism Checker',  to: '/tools/plagiarism-checker',   comingSoon: true },
        ],
      },
    ],
  },
}

// Flat array of all non-coming-soon tools for search / related tools
export const ALL_STATIC_TOOLS = Object.values(TOOL_CATALOGUE).flatMap(cat =>
  cat.sections.flatMap(sec =>
    sec.items.filter(i => !i.comingSoon).map(i => ({ ...i, category: cat.label }))
  )
)
