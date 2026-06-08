const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const formatMoney = (value) => `INR ${Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})}`;

const formatInvoiceNumber = (value) => Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const drawLabelValue = (doc, label, value, x, y, width = 170) => {
  doc.fillColor('#64748b').fontSize(8).text(label.toUpperCase(), x, y, { width });
  doc.fillColor('#0f172a').fontSize(10).text(value || 'N/A', x, y + 13, { width });
};

const numberToIndianWords = (amount) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
    'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertHundreds = (num) => {
    let words = '';
    if (num > 99) {
      words += `${ones[Math.floor(num / 100)]} Hundred `;
      num %= 100;
    }
    if (num > 19) {
      words += `${tens[Math.floor(num / 10)]} `;
      num %= 10;
    }
    if (num > 0) {
      words += `${ones[num]} `;
    }
    return words.trim();
  };

  let num = Math.round(Number(amount || 0));
  if (num === 0) return 'Zero Rupee Only';

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;

  const parts = [];
  if (crore) parts.push(`${convertHundreds(crore)} Crore`);
  if (lakh) parts.push(`${convertHundreds(lakh)} Lakh`);
  if (thousand) parts.push(`${convertHundreds(thousand)} Thousand`);
  if (num) parts.push(convertHundreds(num));

  return `${parts.join(' ')} Rupee Only`;
};

const drawSalesFooter = (doc, businessEmail) => {
  doc.rect(0, 780, 595.28, 62).fill('#f8fafc');
  doc.fillColor('#064e3b').fontSize(10).font('Helvetica-Bold')
    .text('Thank you for choosing KrushiStock.', 42, 800, { width: 250 });
  doc.fillColor('#64748b').fontSize(8).font('Helvetica')
    .text(`Healthy soil, smart inputs, better harvests. Support: ${businessEmail}`, 42, 817, { width: 360 });
  doc.fillColor('#94a3b8').fontSize(8)
    .text('Generated digitally by KrushiStock SaaS Billing', 378, 817, { width: 175, align: 'right' });
};

const drawSalesTableHeader = (doc, y) => {
  const tableX = 42;
  const tableW = 511;

  doc.roundedRect(tableX, y, tableW, 32, 8).fill('#0f172a');
  doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
  doc.text('PRODUCT', 58, y + 12, { width: 190 });
  doc.text('QTY', 266, y + 12, { width: 44, align: 'right' });
  doc.text('UNIT PRICE', 323, y + 12, { width: 72, align: 'right' });
  doc.text('GST', 408, y + 12, { width: 42, align: 'right' });
  doc.text('TOTAL', 465, y + 12, { width: 70, align: 'right' });
};

const generateInvoicePDF = (sale, filePath) => {
  return new Promise(async (resolve, reject) => {
    try {
      const StoreSettings = require('../models/StoreSettings');
      let settings;
      try {
        settings = await StoreSettings.findOne();
      } catch (dbErr) {
        console.error('Error fetching StoreSettings for invoice PDF:', dbErr);
      }

      const items = (sale.items || []).map((item) => {
        const quantity = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        const gstRate = Number(item.gst || item.taxRate || 0);
        const lineSubtotal = quantity * price;
        const gstAmount = lineSubtotal * gstRate / 100;

        return {
          productName: item.product?.name || 'Unknown Product',
          unit: item.product?.unit || '',
          hsn: item.hsn || item.product?.hsn || item.product?.hsnCode || '-',
          batchNumber: item.batchNumber || item.product?.batchNumber || '-',
          expiryDate: item.expiryDate || item.product?.expiryDate || null,
          quantity,
          price,
          gstRate,
          taxable: lineSubtotal,
          rateWithGst: quantity ? (lineSubtotal + gstAmount) / quantity : price,
          total: lineSubtotal + gstAmount
        };
      });
      const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
      const taxAmount = items.reduce((sum, item) => sum + ((item.quantity * item.price) * item.gstRate / 100), 0);
      const discount = Number(sale.discount || sale.discountAmount || 0);
      const grandTotal = Number(sale.totalAmount || subtotal + taxAmount - discount);
      const invoiceDate = new Date(sale.saleDate || sale.createdAt || Date.now());
      const businessName = settings?.organizationName || process.env.STORE_NAME || 'MAHALAXMI SHETI SEVA KENDRA HASUR KHURD';
      const businessEmail = settings?.email || process.env.STORE_EMAIL || 'mahalxmiShetiSevaKendra@gmail.com';
      const businessPhone = settings?.phone || process.env.STORE_PHONE || '7820974939';
      const businessGst = settings?.gst || process.env.STORE_GST || '27XXXXX1234X1ZX';
      const businessAddress = settings?.address || process.env.STORE_ADDRESS || 'Hasur Khurd, Tal. Kagal, Dist. Kolhapur, Maharashtra - 416218';

      const doc = new PDFDocument({ size: 'A4', margin: 0 });
      const pageWidth = 595.28;
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      const margin = 18;
      const right = pageWidth - margin;
      const invoiceTop = 24;
      const invoiceHeight = 574;
      const line = (x1, y1, x2, y2, width = 1) => {
        doc.strokeColor('#111111').lineWidth(width).moveTo(x1, y1).lineTo(x2, y2).stroke();
      };
      const box = (x, y, w, h, width = 1) => {
        doc.lineWidth(width).strokeColor('#111111').rect(x, y, w, h).stroke();
      };
      const cellText = (text, x, y, w, options = {}) => {
        doc.fillColor('#111111')
          .font(options.bold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(options.size || 8)
          .text(text || '', x, y, {
            width: w,
            height: options.height,
            align: options.align || 'left',
            lineGap: options.lineGap || 0,
            ellipsis: options.ellipsis
          });
      };

      box(margin, invoiceTop, right - margin, invoiceHeight, 1.4);

      // Header
      const headerBottom = 116;
      line(margin, headerBottom, right, headerBottom, 1.1);
      doc.circle(63, 67, 34).strokeColor('#8b1e3f').lineWidth(1.2).stroke();
      doc.circle(63, 67, 26).strokeColor('#8b1e3f').lineWidth(0.8).stroke();
      doc.fillColor('#8b1e3f').font('Helvetica-Bold').fontSize(18).text('MS', 49, 57, { width: 30, align: 'center' });

      doc.fillColor('#111111').font('Helvetica-Bold').fontSize(15)
        .text(businessName.toUpperCase(), 125, 32, { width: 340, height: 20, align: 'center', ellipsis: true });
      doc.fontSize(8.5).font('Helvetica-Bold')
        .text(businessAddress, 145, 55, { width: 300, height: 22, align: 'center', ellipsis: true });
      doc.fontSize(8.5).font('Helvetica-Bold')
        .text(`Email: ${businessEmail}`, 145, 80, { width: 300, height: 10, align: 'center', ellipsis: true })
        .text(`Mob: ${businessPhone}`, 145, 94, { width: 300, height: 10, align: 'center', ellipsis: true });

      cellText(`GSTN : ${businessGst}`, 468, 38, 105, { bold: true, size: 8.5, align: 'right' });
      cellText('LCID 0720221358SOL', 468, 62, 105, { size: 8, align: 'right' });
      cellText('LCFRD032022024SOL', 468, 75, 105, { size: 8, align: 'right' });
      cellText('LCSD032022029SOL', 468, 88, 105, { size: 8, align: 'right' });

      // Customer and bill information
      const infoTop = 116;
      const infoBottom = 180;
      line(margin, infoBottom, right, infoBottom, 1.1);
      line(408, infoTop, 408, infoBottom, 1.1);

      cellText('Name :', 26, 130, 42, { bold: true, size: 9 });
      cellText((sale.customer?.name || 'Walk-in Customer').toUpperCase(), 70, 130, 205, { bold: true, size: 9, height: 12, ellipsis: true });
      cellText('Mob  :', 282, 130, 38, { bold: true, size: 9 });
      cellText(sale.customer?.phone || '-', 322, 130, 75, { size: 8.5 });
      cellText('Address :', 26, 160, 56, { bold: true, size: 9 });
      cellText(sale.customer?.village || '-', 86, 160, 190, { size: 8.5 });
      cellText('GSTN :', 282, 160, 40, { bold: true, size: 9 });
      cellText(sale.customer?.gst || '-', 322, 160, 75, { size: 8.5 });

      cellText('Bill No :', 416, 130, 52, { bold: true, size: 9 });
      cellText(String(sale.saleNumber || '-'), 470, 130, 45, { bold: true, size: 9, height: 12, ellipsis: true });
      cellText(`[${sale.paymentMethod || 'Cash'}] Bill`, 515, 130, 58, { size: 8, align: 'right' });
      cellText('Date   :', 416, 160, 52, { bold: true, size: 9 });
      cellText(invoiceDate.toLocaleDateString('en-IN'), 470, 160, 58, { size: 8.5 });
      cellText(invoiceDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), 526, 160, 48, { size: 8, align: 'right' });

      // Product table
      const tableTop = 180;
      const tableHeadBottom = 239;
      const tableBottom = 469;
      const cols = [43, 207, 266, 323, 380, 405, 455, 483, 535];
      line(margin, tableHeadBottom, right, tableHeadBottom, 1.1);
      line(margin, tableBottom, right, tableBottom, 1.1);
      cols.forEach((x) => line(x, tableTop, x, tableBottom, 1));

      cellText('Sr.', 22, 194, 20, { bold: true, size: 8.5 });
      cellText('Product Details', 45, 194, 180, { bold: true, size: 8.5 });
      cellText('HSN', 210, 194, 52, { bold: true, size: 8.5, align: 'center' });
      cellText('BATCH', 268, 194, 52, { bold: true, size: 8.5, align: 'center' });
      cellText('EXPIRY', 326, 194, 51, { bold: true, size: 8.5, align: 'center' });
      cellText('Qty', 382, 194, 20, { bold: true, size: 8.5, align: 'center' });
      cellText('Rate', 408, 194, 44, { bold: true, size: 8.5, align: 'center' });
      cellText('GST %', 457, 194, 24, { bold: true, size: 8, align: 'center' });
      cellText('Rate\n(With GST)', 486, 191, 46, { bold: true, size: 7.5, align: 'center' });
      cellText('Total', 538, 194, 35, { bold: true, size: 8.5, align: 'right' });

      let itemY = 248;
      items.slice(0, 8).forEach((item, index) => {
        const expiry = item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }) : '-';
        cellText(String(index + 1), 28, itemY, 12, { bold: true, size: 8.8, align: 'right' });
        cellText(item.productName.toUpperCase(), 48, itemY, 154, { bold: true, size: 8.2, height: 24, ellipsis: true });
        cellText(item.hsn, 210, itemY, 52, { bold: true, size: 8, align: 'center' });
        cellText(item.batchNumber, 268, itemY, 52, { bold: true, size: 8, align: 'center' });
        cellText(expiry, 325, itemY, 52, { bold: true, size: 7.5, align: 'center' });
        cellText(String(item.quantity), 382, itemY, 20, { bold: true, size: 8, align: 'right' });
        cellText(formatInvoiceNumber(item.price), 407, itemY, 45, { bold: true, size: 7.5, align: 'right' });
        cellText(formatInvoiceNumber(item.gstRate), 457, itemY, 23, { bold: true, size: 7.5, align: 'right' });
        cellText(formatInvoiceNumber(item.rateWithGst), 486, itemY, 46, { bold: true, size: 7.5, align: 'right' });
        cellText(formatInvoiceNumber(item.total), 536, itemY, 38, { bold: true, size: 7.5, align: 'right' });
        itemY += 32;
      });

      if (items.length > 8) {
        cellText(`+ ${items.length - 8} more item(s) included in total`, 48, 446, 260, { bold: true, size: 8 });
      }

      // Summary rows
      const summaryTop = 469;
      const summaryMid = 501;
      const summaryBottom = 597;
      line(78, summaryTop, 78, summaryMid, 1);
      line(150, summaryTop, 150, summaryMid, 1);
      line(215, summaryTop, 215, summaryMid, 1);
      line(280, summaryTop, 280, summaryMid, 1);
      line(330, summaryTop, 330, summaryMid, 1);
      line(380, summaryTop, 380, summaryBottom, 1);
      line(margin, summaryMid, 380, summaryMid, 1);
      line(380, 533, right, 533, 1);
      line(margin, summaryBottom, right, summaryBottom, 1);

      const cgst = taxAmount / 2;
      const sgst = taxAmount / 2;
      cellText('Taxable:', 23, 478, 75, { bold: true, size: 8.8 });
      cellText(formatInvoiceNumber(subtotal), 82, 478, 65, { bold: true, size: 8.8 });
      cellText('CGST', 155, 478, 55, { bold: true, size: 8.8 });
      cellText(formatInvoiceNumber(cgst), 220, 478, 55, { bold: true, size: 8.8 });
      cellText('SGST', 285, 478, 42, { bold: true, size: 8.8 });
      cellText(formatInvoiceNumber(sgst), 334, 478, 42, { bold: true, size: 8.8 });

      // QR-like placeholder and words
      box(24, 507, 84, 80, 1);
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          if ((row * col + row + col) % 3 !== 0) {
            doc.rect(29 + col * 8, 512 + row * 8, 5, 5).fill('#111111');
          }
        }
      }
      cellText('Bill In Words:', 122, 513, 92, { bold: true, size: 9 });
      cellText(numberToIndianWords(grandTotal), 216, 513, 156, { bold: true, size: 8.5, height: 35, lineGap: 1, ellipsis: true });
      cellText('Op Bal: 0', 122, 564, 72, { bold: true, size: 8.2, height: 12, ellipsis: true });
      cellText(`Dr-Inv:${Math.round(grandTotal)}`, 206, 564, 78, { bold: true, size: 8.2, height: 12, ellipsis: true });
      cellText(`ClBalance:${Math.round(grandTotal)}`, 296, 564, 78, { bold: true, size: 8.2, height: 12, ellipsis: true });

      cellText('Net Total :', 388, 482, 95, { bold: true, size: 10 });
      doc.font('Helvetica-Bold').fontSize(20).fillColor('#111111')
        .text(String(Math.round(grandTotal)), 480, 477, { width: 92, align: 'right' });
      cellText(`For ${businessName}`, 388, 546, 120, { size: 7.2, height: 24, ellipsis: true });
      cellText('Authorized Signatory', 470, 570, 100, { bold: true, size: 8, align: 'right' });

      // Footer strip
      box(margin, 644, right - margin, 25, 1);
      cellText('This Is Computer Generated Tax Invoice | Subject To Kagal Jurisdiction', 28, 652, 430, { size: 8.5 });
      cellText('Page 1 of 1', 500, 652, 65, { bold: true, size: 8.5, align: 'right' });

      doc.end();

      writeStream.on('finish', () => {
        resolve(filePath);
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
};

const generatePurchaseInvoicePDF = (invoice, filePath) => {
  return new Promise(async (resolve, reject) => {
    try {
      const StoreSettings = require('../models/StoreSettings');
      let settings;
      try {
        settings = await StoreSettings.findOne();
      } catch (dbErr) {
        console.error('Error fetching StoreSettings for purchase PDF:', dbErr);
      }

      const doc = new PDFDocument({ margin: 50 });
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      const businessName = settings?.organizationName || 'KRUSHISTOCK INVENTORY';

      doc.fillColor('#444444')
        .fontSize(20)
        .text(businessName.toUpperCase(), 50, 45)
        .fontSize(10)
        .text('Purchase Invoice', 50, 65)
        .text('Agriculture Stock & Billing Solutions', 50, 80);

      doc.fontSize(12)
        .text(`Invoice No: ${invoice.invoiceNumber}`, 380, 45)
        .text(`Date: ${new Date(invoice.purchaseDate).toLocaleDateString()}`, 380, 62)
        .text(`Payment: ${invoice.paymentMethod}`, 380, 79);

      doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, 105).lineTo(550, 105).stroke();

      doc.fontSize(12)
        .fillColor('#1b5e20')
        .text('Supplier Details:', 50, 120)
        .fillColor('#333333')
        .fontSize(10)
        .text(`Name: ${invoice.supplierName || 'N/A'}`)
        .text(`Status: ${invoice.paymentStatus || 'Paid'}`);

      const tableTop = 185;
      doc.fontSize(10)
        .fillColor('#1b5e20')
        .text('Product Name', 50, tableTop)
        .text('Qty', 245, tableTop)
        .text('Purchase', 305, tableTop)
        .text('GST', 385, tableTop)
        .text('Subtotal', 450, tableTop);

      doc.strokeColor('#e0e0e0').moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

      let y = tableTop + 25;
      invoice.products.forEach((item) => {
        doc.fillColor('#333333')
          .fontSize(10)
          .text(item.productName, 50, y, { width: 180 })
          .text(String(item.quantity), 245, y)
          .text(`INR ${item.purchasePrice.toLocaleString()}`, 305, y)
          .text(`${item.gst || 0}%`, 385, y)
          .text(`INR ${item.subtotal.toLocaleString()}`, 450, y);

        y += 24;
        if (y > 700) {
          doc.addPage();
          y = 50;
        }
      });

      doc.strokeColor('#aaaaaa').moveTo(50, y + 10).lineTo(550, y + 10).stroke();

      doc.fillColor('#333333')
        .fontSize(10)
        .text(`Subtotal: INR ${invoice.subtotal.toLocaleString()}`, 370, y + 25)
        .text(`GST: INR ${invoice.gstAmount.toLocaleString()}`, 370, y + 42)
        .fontSize(12)
        .fillColor('#1b5e20')
        .text(`Grand Total: INR ${invoice.totalAmount.toLocaleString()}`, 370, y + 62);

      doc.fontSize(10)
        .fillColor('#777777')
        .text(`Purchase invoice generated by ${settings?.organizationName || 'KrushiStock'}.`, 50, 720, { align: 'center', width: 500 });

      doc.end();

      writeStream.on('finish', () => resolve(filePath));
      writeStream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = { generateInvoicePDF, generatePurchaseInvoicePDF };
