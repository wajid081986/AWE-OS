const C = {
  sidebar:  '#1A1F36',
  sideHdr:  '#0F1629',
  teal:     '#14B8A6',
  tealDim:  '#0D9488',
  white:    '#FFFFFF',
  offWhite: '#F1F5F9',
  sideText: '#CBD5E1',
  sideMuted:'#94A3B8',
  dark:     '#0F172A',
  body:     '#334155',
  muted:    '#64748B',
  rule:     '#E2E8F0',
};

const SIDE_W   = 192;
const SIDE_PX  = 22;
const SIDE_CW  = SIDE_W - SIDE_PX * 2;
const SIDE_HDR = 126;
const STRIP_W  = 4;
const MAIN_X   = SIDE_W + STRIP_W;
const MAIN_PX  = 28;
const MAIN_RX  = 30;

function creative(doc, data) {
  const { name, email, phone, summary, skills = [], experience = [], education = [] } = data;

  const PW  = doc.page.width;
  const PH  = doc.page.height;
  const MCW = PW - MAIN_X - MAIN_PX - MAIN_RX;

  // ── Backgrounds ────────────────────────────────────────
  doc.rect(0, 0, SIDE_W, PH).fill(C.sidebar);
  doc.rect(0, 0, SIDE_W, SIDE_HDR).fill(C.sideHdr);
  doc.rect(SIDE_W, 0, STRIP_W, PH).fill(C.teal);

  // ── Sidebar — name & contact ────────────────────────────
  doc.font('Helvetica-Bold').fontSize(18).fillColor(C.white)
     .text(name, SIDE_PX, 26, { width: SIDE_CW, lineGap: 0 });

  const nameBottom = doc.y + 8;
  doc.moveTo(SIDE_PX, nameBottom).lineTo(SIDE_PX + 44, nameBottom)
     .strokeColor(C.teal).lineWidth(2.5).stroke();

  let sy = nameBottom + 16;
  [email, phone].filter(Boolean).forEach((item) => {
    doc.font('Helvetica').fontSize(8.5).fillColor(C.sideMuted)
       .text(item, SIDE_PX, sy, { width: SIDE_CW, lineGap: 0 });
    sy = doc.y + 5;
  });

  sy = Math.max(sy + 4, SIDE_HDR + 16);

  // ── Sidebar section helpers ────────────────────────────
  const sideSection = (title) => {
    sy += 12;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.teal)
       .text(title.toUpperCase(), SIDE_PX, sy, { characterSpacing: 1.4 });
    sy = doc.y + 5;
    doc.moveTo(SIDE_PX, sy).lineTo(SIDE_W - SIDE_PX, sy)
       .strokeColor('#2D3748').lineWidth(0.6).stroke();
    sy += 9;
  };

  // ── Skills in sidebar ──────────────────────────────────
  if (skills.length) {
    sideSection('Skills');
    skills.forEach((skill) => {
      doc.circle(SIDE_PX + 4, sy + 5.5, 2.2).fill(C.teal);
      doc.font('Helvetica').fontSize(9).fillColor(C.sideText)
         .text(skill, SIDE_PX + 14, sy, { width: SIDE_CW - 14, lineGap: 0 });
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
        doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(C.teal)
           .text(edu.year, SIDE_PX, sy, { lineGap: 0 });
        sy = doc.y + 10;
      } else {
        sy += 8;
      }
    });
  }

  // ── Main content ───────────────────────────────────────
  const MX = MAIN_X + MAIN_PX;
  let my = 32;

  doc.font('Helvetica-Bold').fontSize(26).fillColor(C.dark)
     .text(name, MX, my, { width: MCW, lineGap: 0 });
  my = doc.y + 8;

  doc.rect(MX, my, 58, 3.5).fill(C.teal);
  my += 18;

  const mainSection = (title) => {
    my += 12;
    doc.font('Helvetica-Bold').fontSize(11.5).fillColor(C.tealDim)
       .text(title, MX, my, { width: MCW, lineGap: 0 });
    my = doc.y + 6;
    doc.moveTo(MX, my).lineTo(MX + MCW, my).strokeColor(C.rule).lineWidth(0.7).stroke();
    my += 10;
  };

  const mainWrite = (str, font, size, color, indent = 0, gap = 6) => {
    doc.font(font).fontSize(size).fillColor(color)
       .text(str, MX + indent, my, { width: MCW - indent, lineGap: 1.6 });
    my = doc.y + gap;
  };

  // ── Summary ────────────────────────────────────────────
  if (summary) {
    mainSection('Summary');
    mainWrite(summary, 'Helvetica', 10.5, C.body, 0, 16);
  }

  // ── Experience ─────────────────────────────────────────
  if (experience.some(e => e.role || e.company)) {
    mainSection('Experience');
    experience.forEach((exp, i) => {
      if (!exp.role && !exp.company) return;

      if (exp.role || exp.duration) {
        const roleW = MCW * 0.66;
        doc.font('Helvetica-Bold').fontSize(11.5).fillColor(C.dark);
        const rh = doc.heightOfString(exp.role || '', { width: roleW });
        doc.text(exp.role || '', MX, my, { width: roleW, lineGap: 0 });
        if (exp.duration) {
          doc.font('Helvetica').fontSize(9).fillColor(C.tealDim)
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
           .text(exp.description, MX + 10, my, { width: MCW - 10, lineGap: 1.8 });
        my = doc.y + 4;
      }

      if (i < experience.length - 1) {
        my += 8;
        doc.circle(MX + MCW / 2, my + 3, 2).fill('#CCFBF1');
        my += 14;
      }
    });
  }
}

module.exports = creative;
