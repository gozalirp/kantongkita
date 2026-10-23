/* Ekspor OOXML tanpa pustaka/CDN: satu worksheet transaksi, ZIP tanpa kompresi. */
(function (root) {
  'use strict';
  const xml = value => String(value == null ? '' : value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '').slice(0, 32767)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const enc = value => new TextEncoder().encode(value);
  const declaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const cell = (ref, value, style) => '<c r="' + ref + '" s="' + style + '" t="inlineStr"><is><t xml:space="preserve">' + xml(value) + '</t></is></c>';
  const number = (ref, value, style) => '<c r="' + ref + '" s="' + style + '"><v>' + (Number.isFinite(value) ? value : 0) + '</v></c>';
  const crcTable = Array.from({ length: 256 }, (_, i) => {
    for (let bit = 0; bit < 8; bit++) i = i & 1 ? 0xEDB88320 ^ (i >>> 1) : i >>> 1;
    return i >>> 0;
  });
  function zip(files) {
    const chunks = [], directory = []; let offset = 0, centralSize = 0;
    const header = size => { const bytes = new Uint8Array(size); return [bytes, new DataView(bytes.buffer)]; };
    files.forEach(([name, text]) => {
      const filename = enc(name), data = enc(declaration + text);
      let crc = 0xFFFFFFFF;
      data.forEach(byte => { crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8); });
      crc = (crc ^ 0xFFFFFFFF) >>> 0;
      const [local, l] = header(30);
      l.setUint32(0, 0x04034B50, true); l.setUint16(4, 20, true);
      l.setUint16(12, 33, true); l.setUint32(14, crc, true);
      l.setUint32(18, data.length, true); l.setUint32(22, data.length, true); l.setUint16(26, filename.length, true);
      chunks.push(local, filename, data);
      const [central, c] = header(46);
      c.setUint32(0, 0x02014B50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true);
      c.setUint16(14, 33, true); c.setUint32(16, crc, true);
      c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
      c.setUint16(28, filename.length, true); c.setUint32(42, offset, true);
      directory.push(central, filename); centralSize += central.length + filename.length;
      offset += local.length + filename.length + data.length;
    });
    const [end, e] = header(22);
    e.setUint32(0, 0x06054B50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true);
    e.setUint32(12, centralSize, true); e.setUint32(16, offset, true);
    const all = chunks.concat(directory, [end]);
    const result = new Uint8Array(offset + centralSize + end.length); let cursor = 0;
    all.forEach(part => { result.set(part, cursor); cursor += part.length; });
    return result;
  }
  root.Excel = {
    buat: function (db, sumber, tanggal) {
      const tx = root.S.filterTx(db, {});
      if (tx.length > 1048571) throw Error('Terlalu banyak transaksi untuk satu lembar Excel.');
      const wallets = new Map((db.wallets || []).map(x => [x.id, x.name]));
      const categories = new Map((db.categories || []).map(x => [x.id, x.name]));
      const headers = ['Tanggal', 'Jenis', 'Nominal (Rp)', 'Dompet', 'Ke Dompet', 'Kategori', 'Pencatat', 'Catatan'];
      const last = Math.max(5, tx.length + 4);
      let rows = '<row r="1" ht="32" customHeight="1">' + cell('A1', 'SavingDuit · Buku ' + sumber, 1) + '</row>' +
        '<row r="2" ht="24" customHeight="1">' + cell('A2', 'Ekspor: ' + tanggal + ' | Seluruh periode | ' + tx.length + ' transaksi | Transfer bukan pemasukan/pengeluaran', 2) + '</row>' +
        '<row r="4" ht="26" customHeight="1">' + headers.map((x, i) => cell(String.fromCharCode(65 + i) + '4', x, 3)).join('') + '</row>';
      tx.forEach((t, i) => {
        const row = i + 5, stripe = i % 2 ? 7 : 4;
        const date = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(t.date) ? Date.parse(t.date + 'T00:00:00Z') : NaN;
        const values = [t.date, t.type === 'in' ? 'Pemasukan' : t.type === 'out' ? 'Pengeluaran' : 'Pindah Dana',
          t.amount, wallets.get(t.walletId) || '', wallets.get(t.walletTo) || '', categories.get(t.categoryId) || '', t.by || '', t.note || ''];
        rows += '<row r="' + row + '" ht="36" customHeight="1">' + values.map((v, j) => {
          const ref = String.fromCharCode(65 + j) + row;
          if (j === 0 && Number.isFinite(date)) return number(ref, Math.round(date / 86400000) + 25569, stripe + 1);
          if (j === 2) return number(ref, Number(v), stripe + 2);
          return cell(ref, v, stripe);
        }).join('') + '</row>';
      });
      if (!tx.length) rows += '<row r="5">' + headers.map((_, i) => cell(String.fromCharCode(65 + i) + '5', '', 4)).join('') + '</row>';
      const widths = [15, 20, 24, 28, 28, 24, 22, 58];
      const sheet = '<worksheet xmlns="' + ns + '" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<dimension ref="A1:H' + last + '"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
        '<sheetFormatPr defaultRowHeight="20"/><cols>' + widths.map((w, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>').join('') + '</cols>' +
        '<sheetData>' + rows + '</sheetData><mergeCells count="2"><mergeCell ref="A1:H1"/><mergeCell ref="A2:H2"/></mergeCells>' +
        '<pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup orientation="landscape" paperSize="9"/>' +
        '<tableParts count="1"><tablePart r:id="rId1"/></tableParts></worksheet>';
      const border = '<border><left style="thin"><color rgb="FFE1DAD0"/></left><right style="thin"><color rgb="FFE1DAD0"/></right><top style="thin"><color rgb="FFE1DAD0"/></top><bottom style="thin"><color rgb="FFE1DAD0"/></bottom><diagonal/></border>';
      const xf = (font, fill, borderId, num) => '<xf numFmtId="' + num + '" fontId="' + font + '" fillId="' + fill + '" borderId="' + borderId + '" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyNumberFormat="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>';
      const styles = '<styleSheet xmlns="' + ns + '"><numFmts count="2"><numFmt numFmtId="164" formatCode="dd mmm yyyy"/><numFmt numFmtId="165" formatCode="&quot;Rp&quot; #,##0.00;[Red]-&quot;Rp&quot; #,##0.00"/></numFmts>' +
        '<fonts count="3"><font><sz val="11"/><color rgb="FF171717"/><name val="Calibri"/></font><font><b/><sz val="18"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
        '<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFC982"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF5E8"/><bgColor indexed="64"/></patternFill></fill></fills>' +
        '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' + border + '</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        '<cellXfs count="10">' + xf(0,0,0,0) + xf(1,2,0,0) + xf(0,0,0,0) + xf(2,2,1,0) +
        xf(0,0,1,0) + xf(0,0,1,164) + xf(0,0,1,165) + xf(0,3,1,0) + xf(0,3,1,164) + xf(0,3,1,165) +
        '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/><tableStyles count="0" defaultTableStyle="TableStyleMedium13" defaultPivotStyle="PivotStyleLight16"/></styleSheet>';
      const rels = entries => '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + entries.map(([id, type, target]) => '<Relationship Id="' + id + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/' + type + '" Target="' + target + '"/>').join('') + '</Relationships>';
      return zip([
        ['[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
          [['workbook','sheet.main'],['worksheets/sheet1','worksheet'],['styles','styles'],['tables/table1','table']].map(([part, type]) => '<Override PartName="/xl/' + part + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.' + type + '+xml"/>').join('') + '</Types>'],
        ['_rels/.rels', rels([['rId1','officeDocument','xl/workbook.xml']])],
        ['xl/workbook.xml', '<workbook xmlns="' + ns + '" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Transaksi" sheetId="1" r:id="rId1"/></sheets></workbook>'],
        ['xl/_rels/workbook.xml.rels', rels([['rId1','worksheet','worksheets/sheet1.xml'],['rId2','styles','styles.xml']])],
        ['xl/styles.xml', styles], ['xl/worksheets/sheet1.xml', sheet],
        ['xl/worksheets/_rels/sheet1.xml.rels', rels([['rId1','table','../tables/table1.xml']])],
        ['xl/tables/table1.xml', '<table xmlns="' + ns + '" id="1" name="Transaksi" displayName="Transaksi" ref="A4:H' + last + '" totalsRowShown="0"><autoFilter ref="A4:H' + last + '"/><tableColumns count="8">' + headers.map((x,i) => '<tableColumn id="' + (i+1) + '" name="' + xml(x) + '"/>').join('') + '</tableColumns><tableStyleInfo name="TableStyleMedium13" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/></table>']
      ]);
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
