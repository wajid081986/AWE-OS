const C = {
  navy:    '#1B3A6B',
  accent:  '#2563EB',
  dark:    '#0F172A',
  body:    '#374151',
  muted:   '#6B7280',
  rule:    '#CBD5E1',
  white:   '#FFFFFF',
  pillBg:  '#EFF6FF',
  pillFg:  '#1D4ED8',
};

const ML  = 54;
const MR  = 54;
const HDR = 124;

function corporate(doc, data) {
  const { name, email, phone, summary, skills = [], experience = [], education = [] } = data;

  const PW = doc.page.width;
  const CW = PW - ML - MR;

  // ── Header block ───────────────────────────────────────
  doc.rect(0, 0, PW, HDR).fill(C.navy);
  doc.rect(0, HDR - 3, PW, 3).fill(C.accent);

  doc.font('Helvetica-Bold').fontSize(30).fillColor(C.white);
  const nameH = doc.heightOfString(name, { width: CW });
  doc.text(name, ML, 24, { width: CW, lineGap: 0 });

  const contact = [email, phone].filter(Boolean).join('   ·   ');
  if (contact) {
    const contactY = 24 + nameH + 10;
    doc.font('Helvetica').fontSize(10).fillColor('#BFDBFE')
       .text(contact, ML, contactY, { width: CW, characterSpacing: 0.2 });
  }

  let y = HDR + 22;

  // ── Helpers ────────────────────────────────────────────
  const write = (str, font, size, color, indent = 0, gap = 6) => {
    doc.font(font).fontSize(size).fillColor(color)
       .text(str, ML + indent, y, { width: CW - indent, lineGap: 1.6 });
    y = doc.y + gap;
  };

  const section = (title) => {
    y += 14;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.accent)
       .text(title.toUpperCase(), ML, y, { characterSpacing: 1.8 });
    y = doc.y + 6;
    doc.moveTo(ML, y).lineTo(ML + CW, y).strokeColor(C.rule).lineWidth(0.7).stroke();
    y += 10;
  };

  // ── Summary ────────────────────────────────────────────
  if (summary) {
    section('Professional Summary');
    write(summary, 'Helvetica', 10.5, C.body, 0, 16);
  }

  // ── Experience ─────────────────────────────────────────
  if (experience.some(e => e.role || e.company)) {
    section('Experience');
    experience.forEach((exp, i) => {
      if (!exp.role && !exp.company) return;

      if (exp.role || exp.duration) {
        const roleW = CW * 0.68;
        doc.font('Helvetica-Bold').fontSize(11.5).fillColor(C.dark);
        const rh = doc.heightOfString(exp.role || '', { width: roleW });
        doc.text(exp.role || '', ML, y, { width: roleW, lineGap: 0 });
        if (exp.duration) {
          doc.font('Helvetica').fontSize(9.5).fillColor(C.muted)
             .text(exp.duration, ML + roleW, y, { width: CW - roleW, align: 'right', lineGap: 0 });
        }
        y += rh + 4;
      }

      if (exp.company) {
        doc.font('Helvetica-Oblique').fontSize(10).fillColor(C.muted)
           .text(exp.company, ML, y, { width: CW, lineGap: 0 });
        y = doc.y + 6;
      }

      if (exp.description) {
        doc.font('Helvetica').fontSize(10).fillColor(C.body)
           .text(exp.description, ML + 12, y, { width: CW - 12, lineGap: 1.8 });
        y = doc.y + 4;
      }

      if (i < experience.length - 1) {
        y += 10;
        doc.moveTo(ML + 12, y).lineTo(ML + 80, y).strokeColor(C.rule).lineWidth(0.4).stroke();
        y += 10;
      }
    });
    y += 6;
  }

  // ── Education ──────────────────────────────────────────
  if (education.some(e => e.degree || e.institution)) {
    section('Education');
    education.forEach((edu, i) => {
      if (!edu.degree && !edu.institution) return;

      if (edu.degree || edu.year) {
        const degW = CW * 0.72;
        doc.font('Helvetica-Bold').fontSize(11.5).fillColor(C.dark);
        const dh = doc.heightOfString(edu.degree || '', { width: degW });
        doc.text(edu.degree || '', ML, y, { width: degW, lineGap: 0 });
        if (edu.year) {
          doc.font('Helvetica').fontSize(9.5).fillColor(C.muted)
             .text(edu.year, ML + degW, y, { width: CW - degW, align: 'right', lineGap: 0 });
        }
        y += dh + 4;
      }

      if (edu.institution) {
        doc.font('Helvetica-Oblique').fontSize(10).fillColor(C.muted)
           .text(edu.institution, ML, y, { width: CW, lineGap: 0 });
        y = doc.y + 4;
      }

      if (i < education.length - 1) y += 10;
    });
    y += 6;
  }

  // ── Skills — pill tags ─────────────────────────────────
  if (skills.length) {
    section('Core Skills');
    const PILL_H = 20, PILL_PX = 11, PILL_GAP = 7, ROW_GAP = 6;
    let px = ML;

    doc.font('Helvetica').fontSize(9);
    skills.forEach((skill) => {
      const pw = doc.widthOfString(skill) + PILL_PX * 2;
      if (px + pw > ML + CW) { px = ML; y += PILL_H + ROW_GAP; }

      doc.roundedRect(px, y, pw, PILL_H, 4).fill(C.pillBg);
      doc.roundedRect(px, y, pw, PILL_H, 4).stroke('#BFDBFE');
      doc.fillColor(C.pillFg).text(skill, px + PILL_PX, y + 5, { lineBreak: false });
      px += pw + PILL_GAP;
    });
    y += PILL_H + 12;
  }
}

module.exports = corporate;
