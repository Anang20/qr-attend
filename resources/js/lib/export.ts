/**
 * Ekspor laporan di browser.
 * - Excel: exceljs dimuat hanya saat tombol diklik (tidak membebani halaman).
 * - PDF: memakai dialog cetak browser ("Simpan sebagai PDF") dari tampilan cetak halaman.
 */

export interface SheetSpec {
  /** Baris judul di atas tabel (mis. nama laporan, periode). */
  title: string[];
  headers: string[];
  rows: (string | number | null)[][];
  /** Lebar kolom dalam karakter. */
  widths?: number[];
}

export async function downloadXlsx(filename: string, sheetName: string, spec: SheetSpec): Promise<void> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'QR Attend';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName.slice(0, 31));

  spec.title.forEach((line, i) => {
    const row = sheet.addRow([line]);
    row.font = { bold: i === 0, size: i === 0 ? 14 : 11 };
  });
  if (spec.title.length > 0) sheet.addRow([]);

  const header = sheet.addRow(spec.headers);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } };
  });

  spec.rows.forEach((r) => sheet.addRow(r.map((v) => v ?? '')));

  spec.headers.forEach((h, i) => {
    sheet.getColumn(i + 1).width = spec.widths?.[i] ?? Math.max(10, h.length + 4);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Buka dialog cetak; elemen bertanda `print:hidden` disembunyikan saat cetak. */
export function printAsPdf(): void {
  window.print();
}

/** Nama berkas aman: "Rekap PW SI-5A" → "rekap-pw-si-5a". */
export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
