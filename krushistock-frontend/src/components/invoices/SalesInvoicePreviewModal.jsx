import React from 'react';
import { Printer, Send, XCircle } from 'lucide-react';
import Button from '../common/Button';
import Loader from '../common/Loader';
import { formatDate } from '../../utils/helpers';

const formatTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatAmount = (value) => Number(value || 0).toLocaleString('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const numberToWords = (amount) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const convert = (num) => {
    let words = '';
    if (num > 99) {
      words += `${ones[Math.floor(num / 100)]} Hundred `;
      num %= 100;
    }
    if (num > 19) {
      words += `${tens[Math.floor(num / 10)]} `;
      num %= 10;
    }
    if (num > 0) words += `${ones[num]} `;
    return words.trim();
  };

  let num = Math.round(Number(amount || 0));
  if (!num) return 'Zero Rupee Only';
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  return [
    crore ? `${convert(crore)} Crore` : '',
    lakh ? `${convert(lakh)} Lakh` : '',
    thousand ? `${convert(thousand)} Thousand` : '',
    num ? convert(num) : ''
  ].filter(Boolean).join(' ') + ' Rupee Only';
};

const SalesInvoicePreviewModal = ({
  isOpen,
  invoice,
  loading,
  onClose,
  onPrint,
  onShare,
  sharing
}) => {
  if (!isOpen) return null;

  const business = invoice?.business || {};
  const customer = invoice?.customer || {};
  const totals = invoice?.totals || {};
  const items = invoice?.items || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto no-print">
      <div className="min-h-screen bg-slate-950/50 backdrop-blur-sm p-3 md:p-6">
        <div className="mx-auto max-w-5xl">
          <div className="no-print mb-3 flex flex-col gap-3 rounded-xl border border-white/10 bg-white p-3 shadow-soft-lg md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">Sales Invoice Preview</h2>
              <p className="text-xs font-semibold text-slate-400">Review, download, print, or share the generated invoice.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" disabled={loading} onClick={onPrint}>
                <Printer size={14} />
                Print Invoice
              </Button>
              <Button type="button" variant="primary" size="sm" disabled={loading || sharing} onClick={onShare}>
                <Send size={14} />
                {sharing ? 'Sharing...' : 'Share Invoice'}
              </Button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700"
                aria-label="Close invoice preview"
              >
                <XCircle size={18} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="rounded-xl bg-white p-16 shadow-soft-lg">
              <Loader size="lg" />
            </div>
          ) : (
            <section className="invoice-print-root bg-white p-4 text-black shadow-soft-lg">
              <div className="mx-auto max-w-[920px] border-2 border-black bg-white font-sans text-[12px] leading-tight">
                <div className="grid grid-cols-[90px_1fr_170px] border-b border-black">
                  <div className="flex items-center justify-center p-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-rose-900 text-lg font-black text-rose-900">
                      MS
                    </div>
                  </div>
                  <div className="py-2 text-center">
                    <h1 className="text-xl font-black uppercase">{ 'MAHALAXMI SHETI SEVA KENDRA HASUR KHURD'}</h1>
                    <p className="mt-1 text-sm font-bold">{business.address}</p>
                    <p className="text-xs font-bold">Email: {business.email} | Mob: {business.phone}</p>
                  </div>
                  <div className="p-3 text-right text-xs">
                    <p className="font-black">GSTN : {business.gst}</p>
                    
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_288px] border-b border-black">
                  <div className="grid grid-cols-[1fr_180px] gap-y-4 p-2">
                    <div>
                      <span className="font-black">Name : </span>
                      <span className="font-black uppercase">{customer.name || 'Walk-in Customer'}</span>
                    </div>
                    <div>
                      <span className="font-black">Mob : </span>
                      <span>{customer.phone || '-'}</span>
                    </div>
                    <div>
                      <span className="font-black">Address : </span>
                      <span>{customer.village || '-'}</span>
                    </div>
                    <div>
                      <span className="font-black">GSTN : </span>
                      <span>-</span>
                    </div>
                  </div>
                  <div className="border-l border-black p-2">
                    <div className="grid grid-cols-[70px_1fr_92px]">
                      <span className="font-black">Bill No :</span>
                      <span className="font-black">{invoice?.invoiceNumber}</span>
                      <span className="text-right">[{invoice?.paymentMethod || 'Cash'}] Bill</span>
                    </div>
                    <div className="mt-4 grid grid-cols-[70px_1fr_78px]">
                      <span className="font-black">Date :</span>
                      <span>{formatDate(invoice?.saleDate)}</span>
                      <span className="text-right">{formatTime(invoice?.saleDate)}</span>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full table-fixed border-b border-black text-[12px]">
                    <thead>
                      <tr>
                        {['Sr.', 'Product Details', 'HSN', 'BATCH', 'EXPIRY', 'Qty', 'Rate', 'GST %', 'Rate (With GST)', 'Total'].map((header, index) => (
                          <th
                            key={header}
                            className={`border-b border-r border-black px-1.5 py-2 font-black ${index === 1 ? 'text-left' : 'text-center'} last:border-r-0`}
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={item._id || index} className="h-9 align-top">
                          <td className="w-8 border-r border-black px-1.5 py-2 text-right font-bold">{index + 1}</td>
                          <td className="w-56 border-r border-black px-1.5 py-2 font-black uppercase">{item.productName}</td>
                          <td className="w-16 border-r border-black px-1.5 py-2 text-center font-bold">{item.hsn || '-'}</td>
                          <td className="w-16 border-r border-black px-1.5 py-2 text-center font-bold">{item.batchNumber || '-'}</td>
                          <td className="w-20 border-r border-black px-1.5 py-2 text-center font-bold">{item.expiryDate ? formatDate(item.expiryDate) : '-'}</td>
                          <td className="w-10 border-r border-black px-1.5 py-2 text-right font-bold">{item.quantity}</td>
                          <td className="w-16 border-r border-black px-1.5 py-2 text-right font-bold">{formatAmount(item.unitPrice)}</td>
                          <td className="w-12 border-r border-black px-1.5 py-2 text-right font-bold">{formatAmount(item.gstRate)}</td>
                          <td className="w-20 border-r border-black px-1.5 py-2 text-right font-bold">{formatAmount(item.rateWithGst || item.unitPrice)}</td>
                          <td className="w-20 px-1.5 py-2 text-right font-black">{formatAmount(item.total)}</td>
                        </tr>
                      ))}
                      {Array.from({ length: Math.max(0, 6 - items.length) }).map((_, index) => (
                        <tr key={`empty-${index}`} className="h-9">
                          {Array.from({ length: 10 }).map((__, cellIndex) => (
                            <td key={cellIndex} className={`${cellIndex < 9 ? 'border-r border-black' : ''}`}></td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-[1fr_260px] border-b border-black">
                  <div>
                    <div className="grid grid-cols-6 border-b border-black">
                      <div className="border-r border-black p-1 font-black">Taxable:</div>
                      <div className="border-r border-black p-1 font-black">{formatAmount(totals.subtotal)}</div>
                      <div className="border-r border-black p-1 font-black">CGST</div>
                      <div className="border-r border-black p-1 font-black">{formatAmount((totals.gstAmount || 0) / 2)}</div>
                      <div className="border-r border-black p-1 font-black">SGST</div>
                      <div className="p-1 font-black">{formatAmount((totals.gstAmount || 0) / 2)}</div>
                    </div>
                    <div className="grid grid-cols-[90px_1fr]">
                      <div className="flex items-center justify-center border-r border-black p-2">
                        <div className="grid grid-cols-5 gap-0.5">
                          {Array.from({ length: 25 }).map((_, index) => (
                            <span key={index} className={`h-2.5 w-2.5 ${index % 3 === 0 || index % 4 === 0 ? 'bg-black' : 'bg-white border border-black'}`}></span>
                          ))}
                        </div>
                      </div>
                      <div className="p-2">
                        <p><span className="font-black">Bill In Words:</span> <span className="font-black italic">{numberToWords(totals.grandTotal)}</span></p>
                        <div className="mt-8 flex justify-between pr-2 font-black">
                          <span>Op Bal: 0</span>
                          <span>Dr-Inv:{Math.round(totals.grandTotal || 0)}</span>
                          <span>ClBalance:{Math.round(totals.grandTotal || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="border-l border-black">
                    <div className="flex items-center justify-between border-b border-black p-3">
                      <span className="text-base font-black">Net Total :</span>
                      <span className="text-3xl font-black">{Math.round(totals.grandTotal || 0)}</span>
                    </div>
                    <div className="h-20 p-3 text-xs">
                      <p>For {business.name}</p>
                      <p className="mt-10 text-right font-black">Authorized Signatory</p>
                    </div>
                  </div>
                </div>

                <div className="m-3 flex justify-between border border-black px-2 py-1 text-xs">
                  <span>This Is Computer Generated Tax Invoice</span>
                  <span className="font-black">Page 1 of 1</span>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesInvoicePreviewModal;
