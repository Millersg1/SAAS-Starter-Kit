import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const fmtCurrency = (n, currency = 'USD') =>
  parseFloat(n || 0).toLocaleString('en-US', { style: 'currency', currency });

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : '-');

/**
 * Generate and download an invoice PDF.
 */
export function generateInvoicePDF(invoice, items = [], payments = [], brandName = 'Agency', clientName = '') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const currency = invoice.currency || 'USD';

  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(29, 78, 216); // blue-700
  doc.text(brandName, 14, 20);

  doc.setFontSize(28);
  doc.setTextColor(17, 24, 39); // gray-900
  doc.text('INVOICE', pageW - 14, 20, { align: 'right' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text(`#${invoice.invoice_number}`, pageW - 14, 28, { align: 'right' });

  // Meta grid
  const meta = [
    ['Billed To', clientName || invoice.client_name || '-', 'Issue Date', fmtDate(invoice.issue_date)],
    ['Invoice #', invoice.invoice_number, 'Due Date', fmtDate(invoice.due_date)],
  ];
  let y = 36;
  doc.setFontSize(9);
  doc.setTextColor(156, 163, 175);
  doc.text('BILLED TO', 14, y);
  doc.text('ISSUE DATE', pageW / 2 + 4, y);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text(clientName || invoice.client_name || '-', 14, y + 5);
  doc.text(fmtDate(invoice.issue_date), pageW / 2 + 4, y + 5);

  y += 14;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(156, 163, 175);
  doc.text('INVOICE #', 14, y);
  doc.text('DUE DATE', pageW / 2 + 4, y);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text(invoice.invoice_number, 14, y + 5);
  doc.text(fmtDate(invoice.due_date), pageW / 2 + 4, y + 5);

  // Line items table
  autoTable(doc, {
    startY: y + 14,
    head: [['Description', 'Qty', 'Unit Price', 'Amount']],
    body: items.map(item => [
      item.description || '-',
      String(item.quantity || 1),
      fmtCurrency(item.unit_price, currency),
      fmtCurrency((item.quantity || 1) * (item.unit_price || 0), currency),
    ]),
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [243, 244, 246], textColor: [107, 114, 128], fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  const afterTable = doc.lastAutoTable.finalY + 6;
  const total = items.reduce((s, i) => s + (i.quantity || 1) * (i.unit_price || 0), 0);

  // Totals
  autoTable(doc, {
    startY: afterTable,
    body: [
      ['Subtotal', fmtCurrency(total, currency)],
      ['Total Due', fmtCurrency(total, currency)],
    ],
    styles: { fontSize: 10 },
    columnStyles: { 0: { halign: 'right', cellWidth: 40, textColor: [107, 114, 128] }, 1: { halign: 'right', cellWidth: 36 } },
    bodyStyles: { lineWidth: 0 },
    tableWidth: 76,
    margin: { left: pageW - 14 - 76, right: 14 },
    didParseCell(data) {
      if (data.row.index === 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 12;
        data.cell.styles.textColor = [17, 24, 39];
      }
    },
  });

  // Notes
  if (invoice.notes) {
    const notesY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text('Notes', 14, notesY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    doc.text(doc.splitTextToSize(invoice.notes, pageW - 28), 14, notesY + 5);
  }

  doc.save(`invoice-${invoice.invoice_number}.pdf`);
}

/**
 * Generate and download a proposal PDF.
 */
export function generateProposalPDF(proposal, items = [], brandName = 'Agency', clientName = '') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const currency = proposal.currency || 'USD';

  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(29, 78, 216);
  doc.text(brandName, 14, 20);

  doc.setFontSize(28);
  doc.setTextColor(17, 24, 39);
  doc.text('PROPOSAL', pageW - 14, 20, { align: 'right' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text(proposal.proposal_number, pageW - 14, 28, { align: 'right' });

  // Title
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text(proposal.title || 'Proposal', 14, 32);

  // Meta
  let y = 40;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(156, 163, 175);
  doc.text('PREPARED FOR', 14, y);
  doc.text('ISSUE DATE', pageW / 2 + 4, y);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text(clientName || proposal.client_name || '-', 14, y + 5);
  doc.text(fmtDate(proposal.issue_date), pageW / 2 + 4, y + 5);

  y += 14;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(156, 163, 175);
  doc.text('EXPIRY DATE', 14, y);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text(fmtDate(proposal.expiry_date), 14, y + 5);

  // Line items
  autoTable(doc, {
    startY: y + 14,
    head: [['Description', 'Qty', 'Unit Price', 'Amount']],
    body: items.map(item => [
      item.description || '-',
      String(item.quantity || 1),
      fmtCurrency(item.unit_price, currency),
      fmtCurrency(item.amount || (item.quantity || 1) * (item.unit_price || 0), currency),
    ]),
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [243, 244, 246], textColor: [107, 114, 128], fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  const afterTable = doc.lastAutoTable.finalY + 6;
  const sub = parseFloat(proposal.subtotal || 0);
  const tax = parseFloat(proposal.tax_amount || 0);
  const disc = parseFloat(proposal.discount_amount || 0);
  const tot = parseFloat(proposal.total_amount || 0);

  // Totals
  const totalsBody = [['Subtotal', fmtCurrency(sub, currency)]];
  if (tax) totalsBody.push(['Tax', fmtCurrency(tax, currency)]);
  if (disc) totalsBody.push(['Discount', `-${fmtCurrency(disc, currency)}`]);
  totalsBody.push(['Total', fmtCurrency(tot, currency)]);

  autoTable(doc, {
    startY: afterTable,
    body: totalsBody,
    styles: { fontSize: 10 },
    columnStyles: { 0: { halign: 'right', cellWidth: 40, textColor: [107, 114, 128] }, 1: { halign: 'right', cellWidth: 36 } },
    bodyStyles: { lineWidth: 0 },
    tableWidth: 76,
    margin: { left: pageW - 14 - 76, right: 14 },
    didParseCell(data) {
      if (data.row.index === totalsBody.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 12;
        data.cell.styles.textColor = [17, 24, 39];
      }
    },
  });

  // Notes / Terms
  let notesY = doc.lastAutoTable.finalY + 10;
  if (proposal.notes) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text('Notes', 14, notesY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    doc.text(doc.splitTextToSize(proposal.notes, pageW - 28), 14, notesY + 5);
    notesY += 16;
  }
  if (proposal.terms) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text('Terms', 14, notesY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    doc.text(doc.splitTextToSize(proposal.terms, pageW - 28), 14, notesY + 5);
  }

  // Signature block if accepted
  if (proposal.status === 'accepted' && proposal.signed_by_name) {
    const sigY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 20 : 240;
    doc.setDrawColor(209, 213, 219);
    doc.line(14, sigY, 80, sigY);
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(`Signed by: ${proposal.signed_by_name}`, 14, sigY + 5);
    if (proposal.signed_at) doc.text(`Date: ${fmtDate(proposal.signed_at)}`, 14, sigY + 10);
  }

  doc.save(`proposal-${proposal.proposal_number}.pdf`);
}

/**
 * Generate and download a contract PDF.
 */
export function generateContractPDF(contract, brandName = 'Agency', clientName = '') {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(29, 78, 216);
  doc.text(brandName, 14, 20);

  doc.setFontSize(28);
  doc.setTextColor(17, 24, 39);
  doc.text('CONTRACT', pageW - 14, 20, { align: 'right' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text(contract.contract_number || '', pageW - 14, 28, { align: 'right' });

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text(contract.title || 'Contract', 14, 38);

  // Meta
  let y = 46;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(156, 163, 175);
  doc.text('CLIENT', 14, y);
  doc.text('ISSUE DATE', pageW / 2 + 4, y);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text(clientName || contract.client_name || '-', 14, y + 5);
  doc.text(fmtDate(contract.issue_date), pageW / 2 + 4, y + 5);

  // Content
  y += 16;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(31, 41, 55);
  const lines = doc.splitTextToSize(contract.content || '', pageW - 28);
  doc.text(lines, 14, y);

  // Signature block
  const sigY = Math.min(y + lines.length * 5 + 20, 260);
  doc.setDrawColor(209, 213, 219);
  doc.line(14, sigY, 90, sigY);
  doc.line(110, sigY, pageW - 14, sigY);

  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text('Agency Signature', 14, sigY + 5);
  doc.text('Client Signature', 110, sigY + 5);

  if (contract.status === 'signed' && contract.signed_by_name) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(contract.signed_by_name, 110, sigY - 3);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(`Date: ${fmtDate(contract.signed_at)}`, 110, sigY + 10);
  }

  doc.save(`contract-${contract.contract_number || 'draft'}.pdf`);
}
