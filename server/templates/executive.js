const C = {
  sidebar:  '#2D3748',
  sideHdr:  '#1A202C',
  gold:     '#D97706',
  goldDim:  '#B45309',
  white:    '#FFFFFF',
  offWhite: '#F7FAFC',
  sideText: '#CBD5E1',
  sideMuted:'#94A3B8',
  dark:     '#1A202C',
  body:     '#2D3748',
  muted:    '#718096',
  rule:     '#E2E8F0',
};

const SIDE_W  = 175;
const SIDE_PX = 20;
const SIDE_CW = SIDE_W - SIDE_PX * 2;
const MAIN_X  = SIDE_W;
const MAIN_PX = 30;
const MAIN_RX = 30;

function executive(doc, data) {
  const { name, email, phone, summary, skills = [], experience = [], education = [], jobTitle } = data;

  const PW  = doc.page.width;
  const PH  = doc.page.height;
  const MCW = PW - MAIN_X - MAIN_PX - MAIN_RX;

  // ── Backgrounds ────────────────────────────────────────
  doc.rect(0, 0, SIDE_W, PH).fill(C.sidebar);
  doc.rect(0, 0, SIDE_W, 120).fill(C.sideHdr);
  // Gold accent strip at top right of sidebar
  doc.rect(SIDE_W - 4, 0, 4, PH).fill(C.gold);

  // ── Sidebar — name & title ──────────────────────────────
  doc.font('Helvetica-Bold').fontSize(20).fillColor(C.white)
     .text(name, SIDE_PX, 26, { width: SIDE_CW, lineGap: 0 });

  let sy = doc.y + 8;

  if (jobTitle) {
    doc.font('Helvetica').fontSize(10).fillColor(C.gold)
       .text(jobTitle, SIDE_PX, sy, { width: SIDE_CW, lineGap: 0 });
    sy = doc.y + 8;
  }

  doc.moveTo(SIDE_PX, sy).lineTo(SIDE_W - SIDE_PX, sy)
     .strokeColor(C.gold).lineWidth(1.5).stroke();
  sy += 12;

  // ── Sidebar contact ─────────────────────────────────────
  const sideSection = (title) => {
    sy += 14;
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.gold)
       .text(title.toUpperCase(), SIDE_PX, sy, { characterSpacing: 1.6 });
    sy = doc.y + 5;
    doc.moveTo(SIDE_PX, sy).lineTo(SIDE_W - SIDE_PX, sy)
       .strokeColor('#4A5568').lineWidth(0.5).stroke();
    sy += 8;
  };

  sideSection('Contact');
  [email, phone].filter(Boolean).forEach((item) => {
    doc.font('Helvetica').fontSize(9).fillColor(C.sideMuted)
       .text(item, SIDE_PX, sy, { width: SIDE_CW, lineGap: 0 });
    sy = doc.y + 5;
  });

  // ── Skills in sidebar ──────────────────────────────────
  if (skills.length) {
    sideSection('Core Skills');
    skills.forEach((skill) => {
      // Small bullet + text
      doc.rect(SIDE_PX, sy + 4, 3, 3).fill(C.gold);
      doc.font('Helvetica').fontSize(9).fillColor(C.sideText)
         .text(skill, SIDE_PX + 9, sy, { width: SIDE_CW - 9, lineGap: 0 });
      sy = doc.y + 5;
    });
  }

  // ── Education in sidebar ───────────────────────────────
  if (education.some(e => e.degree || e.institution)) {
    sideSection('Education');
    education.forEach((edu) => {
      if (!edu.degree && !edu.institution) return;
      if (edu.degree) {
        doc.font('Helvetica-Bold').fontSize(9).fillColor(C.offWhite)
           .text(edu.degree, SIDE_PX, sy, { width: SIDE_CW, lineGap: 0 });
        sy = doc.y + 3;
      }
      if (edu.institution) {
        doc.font('Helvetica').fontSize(8.5).fillColor(C.sideMuted)
           .text(edu.institution, SIDE_PX, sy, { width: SIDE_CW, lineGap: 0 });
        sy = doc.y + 3;
      }
      if (edu.year) {
        doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(C.gold)
           .text(edu.year, SIDE_PX, sy, { lineGap: 0 });
        sy = doc.y + 10;
      } else {
        sy += 8;
      }
    });
  }

  // ── Main content ───────────────────────────────────────
  const MX = MAIN_X + MAIN_PX;
  let my   = 36;

  const mainSection = (title) => {
    my += 14;
    // Gold underline heading
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.goldDim)
       .text(title.toUpperCase(), MX, my, { characterSpacing: 1.5 });
    my = doc.y + 4;
    doc.moveTo(MX, my).lineTo(MX + MCW, my).strokeColor(C.gold).lineWidth(1.2).stroke();
    my += 10;
  };

  const mainWrite = (str, font, size, color, indent = 0, gap = 6) => {
    doc.font(font).fontSize(size).fillColor(color)
       .text(str, MX + indent, my, { width: MCW - indent, lineGap: 1.6 });
    my = doc.y + gap;
  };

  // ── Summary ────────────────────────────────────────────
  if (summary) {
    mainSection('Executive Summary');
    mainWrite(summary, 'Helvetica', 10.5, C.body, 0, 16);
  }

  // ── Experience ─────────────────────────────────────────
  if (experience.some(e => e.role || e.company)) {
    mainSection('Professional Experience');
    experience.forEach((exp, i) => {
      if (!exp.role && !exp.company) return;

      if (exp.role || exp.duration) {
        const roleW = MCW * 0.66;
        doc.font('Helvetica-Bold').fontSize(11.5).fillColor(C.dark);
        const rh = doc.heightOfString(exp.role || '', { width: roleW });
        doc.text(exp.role || '', MX, my, { width: roleW, lineGap: 0 });
        if (exp.duration) {
          doc.font('Helvetica').fontSize(9).fillColor(C.goldDim)
             .text(exp.duration, MX + roleW, my, { width: MCW - roleW, align: 'right', lineGap: 0 });
        }
        my += rh + 4;
      }

      if (exp.company) {
        doc.font('Helvetica-Oblique').fontSize(10).fillColor(C.muted)
           .text(exp.company, MX, my, { width: MCW, lineGap: 0 });
        my = doc.y + 6;
      }

      if (exp.description) {
        doc.font('Helvetica').fontSize(10).fillColor(C.body)
           .text(exp.description, MX + 12, my, { width: MCW - 12, lineGap: 1.8 });
        my = doc.y + 4;
      }

      if (i < experience.length - 1) {
        my += 10;
        doc.moveTo(MX, my).lineTo(MX + 60, my).strokeColor(C.rule).lineWidth(0.4).stroke();
        my += 10;
      }
    });
    my += 6;
  }
}

module.exports = executive;
