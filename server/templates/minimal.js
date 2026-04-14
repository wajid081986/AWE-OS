const C = {
  dark:  '#111111',
  body:  '#2D2D2D',
  muted: '#6B6B6B',
  rule:  '#C8C8C8',
  white: '#FFFFFF',
};

const ML = 64;
const MR = 64;

function minimal(doc, data) {
  const { name, email, phone, summary, skills = [], experience = [], education = [] } = data;

  const PW = doc.page.width;
  const CW = PW - ML - MR;

  // ── Header ─────────────────────────────────────────────
  doc.font('Times-Bold').fontSize(34).fillColor(C.dark)
     .text(name, ML, 50, { width: CW, lineGap: 0, characterSpacing: 0.4 });

  const ruleY = doc.y + 9;
  doc.moveTo(ML, ruleY).lineTo(ML + CW, ruleY).strokeColor(C.dark).lineWidth(0.8).stroke();

  let y = ruleY + 12;
  const contact = [email, phone].filter(Boolean).join('    ·    ');
  if (contact) {
    doc.font('Helvetica').fontSize(9.5).fillColor(C.muted)
       .text(contact, ML, y, { width: CW, characterSpacing: 0.15, lineGap: 0 });
    y = doc.y + 6;
    doc.moveTo(ML, y).lineTo(ML + CW, y).strokeColor(C.rule).lineWidth(0.3).stroke();
    y += 6;
  }

  y += 20;

  // ── Helpers ────────────────────────────────────────────
  const section = (title) => {
    y += 16;
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.dark)
       .text(title.toUpperCase(), ML, y, { characterSpacing: 2.8, lineGap: 0 });
    y = doc.y + 7;
    doc.moveTo(ML, y).lineTo(ML + CW, y).strokeColor(C.rule).lineWidth(0.35).stroke();
    y += 11;
  };

  const write = (str, font, size, color, indent = 0, gap = 6) => {
    doc.font(font).fontSize(size).fillColor(color)
       .text(str, ML + indent, y, { width: CW - indent, lineGap: 1.8 });
    y = doc.y + gap;
  };

  // ── Summary ────────────────────────────────────────────
  if (summary) {
    section('Profile');
    write(summary, 'Times-Roman', 11, C.body, 0, 20);
  }

  // ── Experience ─────────────────────────────────────────
  if (experience.some(e => e.role || e.company)) {
    section('Experience');
    experience.forEach((exp, i) => {
      if (!exp.role && !exp.company) return;

      if (exp.role || exp.duration) {
        const roleW = CW * 0.70;
        doc.font('Times-Bold').fontSize(12).fillColor(C.dark);
        const rh = doc.heightOfString(exp.role || '', { width: roleW });
        doc.text(exp.role || '', ML, y, { width: roleW, lineGap: 0 });
        if (exp.duration) {
          doc.font('Helvetica').fontSize(9).fillColor(C.muted)
             .text(exp.duration, ML + roleW, y + 2, { width: CW - roleW, align: 'right', lineGap: 0 });
        }
        y += rh + 4;
      }

      if (exp.company) {
        doc.font('Times-Roman').fontSize(10.5).fillColor(C.muted)
           .text(exp.company, ML, y, { width: CW, lineGap: 0 });
        y = doc.y + 6;
      }

      if (exp.description) {
        doc.font('Helvetica').fontSize(10).fillColor(C.body)
           .text(exp.description, ML + 14, y, { width: CW - 14, lineGap: 1.8 });
        y = doc.y + 4;
      }

      if (i < experience.length - 1) {
        y += 8;
        doc.circle(ML + CW / 2, y, 1.8).fill(C.rule);
        y += 12;
      }
    });
    y += 12;
  }

  // ── Education ──────────────────────────────────────────
  if (education.some(e => e.degree || e.institution)) {
    section('Education');
    education.forEach((edu, i) => {
      if (!edu.degree && !edu.institution) return;

      if (edu.degree || edu.year) {
        const degW = CW * 0.70;
        doc.font('Times-Bold').fontSize(12).fillColor(C.dark);
        const dh = doc.heightOfString(edu.degree || '', { width: degW });
        doc.text(edu.degree || '', ML, y, { width: degW, lineGap: 0 });
        if (edu.year) {
          doc.font('Helvetica').fontSize(9).fillColor(C.muted)
             .text(edu.year, ML + degW, y + 2, { width: CW - degW, align: 'right', lineGap: 0 });
        }
        y += dh + 4;
      }

      if (edu.institution) {
        doc.font('Times-Roman').fontSize(10.5).fillColor(C.muted)
           .text(edu.institution, ML, y, { width: CW, lineGap: 0 });
        y = doc.y + 4;
      }

      if (i < education.length - 1) y += 10;
    });
    y += 12;
  }

  // ── Skills ─────────────────────────────────────────────
  if (skills.length) {
    section('Skills');
    doc.font('Helvetica').fontSize(10).fillColor(C.body)
       .text(skills.join('   ·   '), ML, y, { width: CW, lineGap: 1.8 });
    y = doc.y + 8;
  }
}

module.exports = minimal;
