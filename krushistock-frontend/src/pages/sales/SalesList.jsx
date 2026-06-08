import React, { useState, useEffect } from 'react';
import { getAllSales, deleteSale, createSale, updateSale, getSaleInvoice, getSaleInvoicePDF, sendPaymentReminder } from '../../services/salesService';
import { sendManualInvoice } from '../../services/whatsAppService';
import { getAllFarmers } from '../../services/farmerService';
import { getAllProducts } from '../../services/productService';
import { showConfirm, showSuccess, showError } from '../../utils/alert';
import { validatePositiveNumber, validateRequired } from '../../utils/validators';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import SalesInvoicePreviewModal from '../../components/invoices/SalesInvoicePreviewModal';
import { formatDate, formatCurrency, formatDateForInput, getLocalDateString } from '../../utils/helpers';
import { PAYMENT_METHODS } from '../../utils/constants';
import { Eye, Download, Bell, Trash2 } from 'lucide-react';
import { getUserInfo } from '../../utils/auth';

const SalesList = () => {
  const isAdmin = getUserInfo()?.role === 'admin';
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [whatsappLoading, setWhatsappLoading] = useState({});
  const [reminderLoading, setReminderLoading] = useState({});
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Form state
  const [farmers, setFarmers] = useState([]);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    customer: '',
    saleDate: getLocalDateString(),
    paymentMethod: 'Cash',
    sendWhatsApp: false,
    paymentStatus: 'Paid',
    amountPaid: '',
    dueDate: ''
  });
  const [items, setItems] = useState([
    { product: '', batchNumber: '', quantity: '', price: '', availableStock: 0 }
  ]);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState([]);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchSales(pagination.page);
    fetchFarmers();
    fetchProducts();
  }, [pagination.page]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const customerId = params.get('customer');
    const productId = params.get('product');

    if (customerId) {
      setFormData((prev) => ({
        ...prev,
        customer: customerId
      }));
    }

    if (productId && products.length > 0) {
      const selectedProd = products.find(p => p._id === productId);
      if (selectedProd) {
        setItems([
          {
            product: productId,
            quantity: 1,
            price: selectedProd.price,
            availableStock: selectedProd.stock
          }
        ]);
      }
    }
  }, [products]);

  const fetchSales = async (page = 1) => {
    setLoading(true);
    try {
      const response = await getAllSales(page, 10);
      setSales(response.data);
      setPagination(response.pagination || { page: 1, pages: 1, total: 0 });
    } catch (error) {
      console.error('Error fetching sales:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFarmers = async () => {
    try {
      const response = await getAllFarmers(1, 100000);
      setFarmers(response.data);
    } catch (error) {
      console.error('Error fetching farmers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await getAllProducts(1, 1000);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    let newFormData = {
      ...formData,
      [name]: value
    };

    if (name === 'paymentStatus' && value !== 'Paid' && !formData.dueDate) {
      newFormData.dueDate = formatDateForInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    } else if (name === 'paymentStatus' && value === 'Paid') {
      newFormData.dueDate = '';
      newFormData.amountPaid = '';
    }

    setFormData(newFormData);
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: ''
      });
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    if (field === 'product') {
      const product = products.find((p) => p._id === value);
      if (product) {
        const availableBatches = product.batches || [];
        const activeBatch = availableBatches.find(b => b.quantity > 0) || availableBatches[0];

        newItems[index].price = activeBatch ? (activeBatch.sellingPrice || activeBatch.mrp || product.price) : product.price;
        newItems[index].availableStock = activeBatch ? activeBatch.quantity : product.stock;
        newItems[index].batchNumber = activeBatch ? activeBatch.batchNumber : '';
      } else {
        newItems[index].price = '';
        newItems[index].availableStock = 0;
        newItems[index].batchNumber = '';
      }
    }

    if (field === 'batchNumber') {
      const itemObj = newItems[index];
      const product = products.find((p) => p._id === itemObj.product);
      if (product && product.batches) {
        const selectedBatch = product.batches.find(b => b.batchNumber === value);
        if (selectedBatch) {
          newItems[index].price = selectedBatch.sellingPrice || selectedBatch.mrp || product.price;
          newItems[index].availableStock = selectedBatch.quantity;
        }
      }
    }

    setItems(newItems);
    
    if (fieldErrors.length > 0) {
      const newErrors = [...fieldErrors];
      if (newErrors[index]) {
        newErrors[index] = { ...newErrors[index], [field]: '' };
        setFieldErrors(newErrors);
      }
    }
  };

  const addItem = () => {
    setItems([...items, { product: '', batchNumber: '', quantity: '', price: '', availableStock: 0 }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      return sum + (Number(item.quantity) || 0) * (Number(item.price) || 0);
    }, 0);
  };

  const openInvoicePreview = async (saleId) => {
    setInvoiceModalOpen(true);
    setInvoiceLoading(true);

    try {
      const response = await getSaleInvoice(saleId);
      setSelectedInvoice(response.data);
    } catch (error) {
      console.error('Error loading invoice preview:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load invoice preview.';
      showError('Preview Failed', errorMessage);
      setInvoiceModalOpen(false);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Validate top-level form fields
    const todayStr = getLocalDateString();
    const fErrors = {};
    if ((formData.paymentStatus === 'Partial' || formData.paymentStatus === 'Pending') && !formData.customer) {
      fErrors.customer = 'Please select a farmer account for credit billing';
    }

    if (!formData.saleDate) {
      fErrors.saleDate = 'Please select the sale date';
    } else if (formData.saleDate < todayStr) {
      fErrors.saleDate = 'Sale date cannot be in the past';
    }

    if (formData.paymentStatus !== 'Paid') {
      if (!formData.dueDate) {
        fErrors.dueDate = 'Please select a payment due date';
      } else {
        const sDate = new Date(formData.saleDate);
        const dDate = new Date(formData.dueDate);
        if (dDate < sDate) {
          fErrors.dueDate = 'Due date must be greater than or equal to sale date';
        }
      }
    }

    const hasFormErrors = Object.keys(fErrors).some(key => fErrors[key] !== '');
    if (hasFormErrors) {
      setFormErrors(fErrors);
      showError('Validation Error', fErrors.customer || fErrors.dueDate || 'Please correct the highlighted fields.');
      return;
    }

    // 2. Validate billing rows
    let hasRowErrors = false;
    const errorsArray = items.map((item) => {
      const prodErr = validateRequired(item.product, 'Please select a product');
      let qtyErr = validatePositiveNumber(item.quantity, 'Please enter quantity');
      const priceErr = validatePositiveNumber(item.price, 'Please enter selling price');

      if (!qtyErr && !isEditing && Number(item.quantity) > item.availableStock) {
        qtyErr = `Exceeds stock limit of ${item.availableStock}`;
      }

      if (prodErr || qtyErr || priceErr) hasRowErrors = true;
      return { product: prodErr, quantity: qtyErr, price: priceErr };
    });

    if (hasRowErrors) {
      setFieldErrors(errorsArray);
      return;
    }

    const totalAmount = calculateTotal();
    if (formData.paymentStatus === 'Partial') {
      const amtPaid = Number(formData.amountPaid);
      if (isNaN(amtPaid) || amtPaid <= 0) {
        setFormErrors({ amountPaid: 'Amount paid must be greater than 0' });
        showError('Invalid Amount', 'Please enter a valid amount paid for partial payment.');
        return;
      }
      if (amtPaid >= totalAmount) {
        setFormErrors({ amountPaid: 'Amount paid must be less than the total amount' });
        showError('Invalid Amount', 'Amount paid for partial payment must be less than the total amount.');
        return;
      }
    }

    setFormLoading(true);

    try {
      const saleData = {
        ...formData,
        items: items.map((item) => ({
          product: item.product,
          quantity: Number(item.quantity),
          price: Number(item.price),
          batchNumber: item.batchNumber
        })),
        totalAmount,
        amountPaid: formData.paymentStatus === 'Paid' ? totalAmount : formData.paymentStatus === 'Pending' ? 0 : Number(formData.amountPaid),
        dueDate: formData.paymentStatus === 'Paid' ? null : (formData.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
      };

      let savedSale;
      if (isEditing) {
        const response = await updateSale(editId, saleData);
        savedSale = response.data;
        showSuccess('Success!', 'Sale updated successfully!');
      } else {
        const response = await createSale(saleData);
        savedSale = response.data;
        showSuccess('Success!', 'Sale recorded successfully!');
      }
      resetForm();
      fetchSales(pagination.page);
      fetchProducts();
      if (savedSale?._id) {
        await openInvoicePreview(savedSale._id);
      }
    } catch (error) {
      console.error('Error recording sale:', error);
      const errorMessage = error.response?.data?.message || 'Failed to record sale. Please try again.';
      showError('Error', errorMessage);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (sale) => {
    setIsEditing(true);
    setEditId(sale._id);
    
    const formattedDate = formatDateForInput(sale.saleDate) || getLocalDateString();

    setFormData({
      customer: sale.customer?._id || sale.customer || '',
      saleDate: formattedDate,
      paymentMethod: sale.paymentMethod || 'Cash',
      sendWhatsApp: false,
      paymentStatus: sale.paymentStatus || 'Paid',
      amountPaid: sale.amountPaid !== undefined ? sale.amountPaid : '',
      dueDate: sale.dueDate ? formatDateForInput(sale.dueDate) : ''
    });

    if (sale.items && sale.items.length > 0) {
      setItems(sale.items.map(item => {
        const prodId = item.product?._id || item.product;
        const prod = products.find(p => p._id === prodId);
        const selectedBatch = prod?.batches?.find(b => b.batchNumber === item.batchNumber);
        return {
          product: prodId,
          batchNumber: item.batchNumber || '',
          quantity: item.quantity || '',
          price: item.price || '',
          availableStock: selectedBatch ? selectedBatch.quantity : (prod ? prod.stock : 0)
        };
      }));
    } else {
      setItems([{ product: '', batchNumber: '', quantity: '', price: '', availableStock: 0 }]);
    }
    
    setFieldErrors([]);
    setFormErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData({
      customer: '',
      saleDate: getLocalDateString(),
      paymentMethod: 'Cash',
      sendWhatsApp: false,
      paymentStatus: 'Paid',
      amountPaid: '',
      dueDate: ''
    });
    setItems([{ product: '', batchNumber: '', quantity: '', price: '', availableStock: 0 }]);
    setFieldErrors([]);
    setFormErrors({});
  };

  const handleSendWhatsAppInvoice = async (sale) => {
    if (!sale.customer || !sale.customer.phone) {
      showError('Error', 'Farmer does not have a registered phone number.');
      return;
    }
    
    setWhatsappLoading(prev => ({ ...prev, [sale._id]: true }));
    try {
      await sendManualInvoice(sale._id);
      showSuccess('Sent!', `Invoice WhatsApp PDF successfully sent to ${sale.customer.name || 'Farmer'}.`);
    } catch (error) {
      console.error('Error sending manual WhatsApp invoice:', error);
      const errMsg = error.response?.data?.message || 'Failed to send WhatsApp invoice. Please check credentials.';
      showError('Failed to Send', errMsg);
    } finally {
      setWhatsappLoading(prev => ({ ...prev, [sale._id]: false }));
    }
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const handleShareSelectedInvoice = async () => {
    if (!selectedInvoice) return;
    await handleSendWhatsAppInvoice({
      _id: selectedInvoice._id,
      saleNumber: selectedInvoice.saleNumber,
      customer: selectedInvoice.customer
    });
  };

  const handleDownloadInvoice = async (saleId, saleNumber) => {
    try {
      const blob = await getSaleInvoicePDF(saleId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${saleNumber || 'sale'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      showError('Download Failed', 'Failed to download the invoice PDF.');
    }
  };

  const handleSendReminder = async (saleId, farmerName) => {
    setReminderLoading(prev => ({ ...prev, [saleId]: true }));
    try {
      await sendPaymentReminder(saleId);
      showSuccess('Sent!', `Payment reminder WhatsApp message successfully sent to ${farmerName || 'Farmer'}.`);
    } catch (error) {
      console.error('Error sending payment reminder:', error);
      const errMsg = error.response?.data?.message || 'Failed to send payment reminder. Please check credentials.';
      showError('Failed to Send', errMsg);
    } finally {
      setReminderLoading(prev => ({ ...prev, [saleId]: false }));
    }
  };

  const handleDelete = async (sale) => {
    const isConfirmed = await showConfirm(
      'Delete Sale?',
      `Are you sure you want to delete sale ${sale.saleNumber}? This will revert stock quantities.`
    );

    if (isConfirmed) {
      try {
        await deleteSale(sale._id);
        setSales(sales.filter(s => s._id !== sale._id));
        showSuccess('Deleted!', 'Sale deleted and stock reverted successfully.');
        if (isEditing && editId === sale._id) {
          resetForm();
        }
        fetchProducts();
      } catch (error) {
        console.error('Error deleting sale:', error);
        const errorMsg = error.response?.data?.message || 'Failed to delete sale';
        showError('Delete Failed', errorMsg);
      }
    }
  };

  const columns = [
    { header: 'Sale #', accessor: 'saleNumber' },
    {
      header: 'Date',
      accessor: 'saleDate',
      render: (row) => formatDate(row.saleDate)
    },
    {
      header: 'Customer',
      accessor: 'customer',
      render: (row) => row.customer?.name || 'Walk-in'
    },
    {
      header: 'Items',
      accessor: 'items',
      render: (row) => row.items?.length || 0
    },
    {
      header: 'Total Amount',
      accessor: 'totalAmount',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold">{formatCurrency(row.totalAmount)}</span>
          {row.paymentStatus !== 'Paid' && (
            <span className="text-[10px] text-slate-400 font-medium">
              Paid: {formatCurrency(row.amountPaid || 0)}
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Payment Method',
      accessor: 'paymentMethod'
    },
    {
      header: 'Status',
      accessor: 'paymentStatus',
      render: (row) => {
        const isOverdue = row.paymentStatus !== 'Paid' && row.dueDate && new Date(row.dueDate) < new Date();
        let badgeColor = '';
        let badgeText = '';

        if (row.paymentStatus === 'Paid') {
          badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-250';
          badgeText = 'Paid';
        } else if (row.paymentStatus === 'Partial') {
          badgeColor = isOverdue ? 'bg-rose-50 text-rose-700 border-rose-250' : 'bg-amber-50 text-amber-700 border-amber-250';
          badgeText = isOverdue ? 'Overdue (Partial)' : `Partial (Due: ${formatCurrency(row.amountDue)})`;
        } else {
          badgeColor = isOverdue ? 'bg-rose-50 text-rose-700 border-rose-250' : 'bg-amber-50 text-amber-700 border-amber-250';
          badgeText = isOverdue ? 'Overdue' : 'Pending';
        }

        return (
          <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full border ${badgeColor}`}>
            {badgeText}
          </span>
        );
      }
    },
    {
      header: 'Due Date',
      accessor: 'dueDate',
      render: (row) => row.paymentStatus !== 'Paid' && row.dueDate ? formatDate(row.dueDate) : '-'
    },
    {
      header: 'Invoice',
      accessor: 'download',
      render: (row) => {
        return (
          <div className="flex gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => openInvoicePreview(row._id)}
              className="flex items-center gap-1 text-[10px] py-1 px-2 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-250 transition-all font-bold"
            >
              <Eye size={12} />
              Preview
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleDownloadInvoice(row._id, row.saleNumber)}
              className="flex items-center gap-1 text-[10px] py-1 px-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-250 transition-all font-bold"
            >
              <Download size={12} />
              Download
            </Button>
          </div>
        );
      }
    },
    {
      header: 'WhatsApp / Remind',
      accessor: 'whatsapp',
      render: (row) => {
        if (!row.customer || !row.customer.phone) {
          return <span className="text-[10px] font-bold text-slate-400">No Phone</span>;
        }
        const isSending = whatsappLoading[row._id];
        const isReminding = reminderLoading[row._id];
        const showReminder = row.paymentStatus !== 'Paid';
        return (
          <div className="flex gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSending}
              onClick={() => handleSendWhatsAppInvoice(row)}
              className="flex items-center gap-1 text-[10px] py-1 px-2 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-250 disabled:opacity-50 transition-all font-bold"
            >
              {isSending ? 'Sending...' : '💬 Send Invoice'}
            </Button>
            {showReminder && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isReminding}
                onClick={() => handleSendReminder(row._id, row.customer?.name)}
                className="flex items-center gap-1 text-[10px] py-1 px-2 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-250 disabled:opacity-50 transition-all font-bold"
              >
                <Bell size={12} />
                {isReminding ? 'Reminding...' : 'Remind'}
              </Button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="print:hidden no-print space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Sales POS Terminal</h1>
          <p className="text-slate-500 text-xs md:text-sm">Record and issue customer invoices, track sales transactions, and update farmer profiles.</p>
        </div>

        {/* Form Section */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 md:p-6 shadow-soft max-w-4xl">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
            {isEditing ? '⚡ Edit Invoice Details' : '📝 Issue New Invoice'}
          </h2>
          <form onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Customer"
                name="customer"
                value={formData.customer}
                onChange={handleFormChange}
                options={[
                  { value: '', label: 'Walk-in Customer' },
                  ...farmers.filter(f => f.isActive).map((farmer) => ({
                    value: farmer._id,
                    label: farmer.name
                  }))
                ]}
                error={formErrors.customer}
              />

              <Input
                label="Sale Date"
                type="date"
                name="saleDate"
                value={formData.saleDate}
                onChange={handleFormChange}
                required
                min={getLocalDateString()}
                error={formErrors.saleDate}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <Select
                label="Payment Status"
                name="paymentStatus"
                value={formData.paymentStatus}
                onChange={handleFormChange}
                options={[
                  { value: 'Paid', label: 'Paid' },
                  { value: 'Pending', label: 'Pending' },
                  { value: 'Partial', label: 'Partial' }
                ]}
                required
              />

              {formData.paymentStatus === 'Partial' && (
                <Input
                  label="Amount Paid"
                  type="number"
                  name="amountPaid"
                  value={formData.amountPaid}
                  onChange={handleFormChange}
                  placeholder="0.00"
                  required
                  min="0"
                  max={calculateTotal()}
                  step="0.01"
                  error={formErrors.amountPaid}
                />
              )}

              {formData.paymentStatus !== 'Paid' && (
                <Input
                  label="Due Date"
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleFormChange}
                  required
                  error={formErrors.dueDate}
                />
              )}
            </div>

            <div className="my-6 p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Invoice Items</h3>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  + Add Item
                </Button>
              </div>

            {items.map((item, index) => {
              const productObj = products.find(p => p._id === item.product);
              const productBatches = productObj?.batches || [];

              return (
                <div key={index} className="relative p-4 bg-white border border-slate-200/60 rounded-xl space-y-4 hover:border-slate-300 transition-all shadow-sm">
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors z-10"
                      title="Remove Item"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}

                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-12 md:col-span-4">
                      <Select
                        label="Product"
                        name="product"
                        value={item.product}
                        onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                        options={products.filter(p => p.isActive).map((prod) => ({
                          value: prod._id,
                          label: `${prod.name} (Stock: ${prod.stock})`
                        }))}
                        required
                        error={fieldErrors[index]?.product}
                        className="mb-0"
                      />
                    </div>
                    <div className="col-span-12 sm:col-span-6 md:col-span-3">
                      <Select
                        label="Batch"
                        name="batchNumber"
                        value={item.batchNumber}
                        onChange={(e) => handleItemChange(index, 'batchNumber', e.target.value)}
                        options={productBatches.map(b => ({
                          value: b.batchNumber,
                          label: `${b.batchNumber} (Stock: ${b.quantity})`
                        }))}
                        disabled={!item.product}
                        required
                        className="mb-0"
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-3 md:col-span-2">
                      <Input
                        label="Quantity"
                        type="number"
                        name="quantity"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        placeholder="0"
                        required
                        min="0"
                        error={fieldErrors[index]?.quantity}
                        className="mb-0"
                      />
                      {item.product && (
                        <p className="text-[10px] text-slate-400 font-semibold mt-1 pl-1">Available: {item.availableStock}</p>
                      )}
                    </div>
                    <div className="col-span-6 sm:col-span-3 md:col-span-3">
                      <Input
                        label="Selling Price"
                        type="number"
                        name="price"
                        value={item.price}
                        onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                        placeholder="0.00"
                        required
                        min="0"
                        step="0.01"
                        error={fieldErrors[index]?.price}
                        className="mb-0"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            </div>

            <div className="border-t border-slate-100 pt-4 mb-6 flex justify-between items-center">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Sales Invoice</span>
              <div className="text-right">
                <span className="text-2xl font-black text-primary-600">
                  {formatCurrency(calculateTotal())}
                </span>
              </div>
            </div>

            <Select
              label="Payment Method"
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleFormChange}
              options={PAYMENT_METHODS}
              required
            />

            <div className="flex items-center gap-3 my-4 p-3 bg-slate-50/50 rounded-xl border border-slate-100/80">
              <input
                type="checkbox"
                id="sendWhatsApp"
                name="sendWhatsApp"
                checked={formData.sendWhatsApp}
                onChange={(e) => setFormData({ ...formData, sendWhatsApp: e.target.checked })}
                className="h-4 w-4 text-primary-600 border-slate-350 rounded focus:ring-primary-500 transition-all cursor-pointer"
              />
              <label htmlFor="sendWhatsApp" className="text-xs font-bold text-slate-650 select-none cursor-pointer">
                💬 Send Invoice on WhatsApp to Farmer (requires consent)
              </label>
            </div>

            <div className="flex gap-2.5 mt-6 border-t border-slate-100 pt-4">
              <Button type="submit" variant="primary" disabled={formLoading}>
                {formLoading ? 'Recording...' : isEditing ? 'Update Invoice' : 'Issue Invoice'}
              </Button>
              {isEditing && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={resetForm}
                >
                  Cancel Edit
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 md:p-6 shadow-soft space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Invoice History</h2>
          <Table 
            columns={columns} 
            data={sales} 
            loading={loading}
            onEdit={handleEdit}
            onDelete={isAdmin ? handleDelete : undefined} 
            pagination={pagination} 
            onPageChange={handlePageChange} 
          />
        </div>
      </div>

      <SalesInvoicePreviewModal
        isOpen={invoiceModalOpen}
        invoice={selectedInvoice}
        loading={invoiceLoading}
        onClose={() => setInvoiceModalOpen(false)}
        onPrint={handlePrintInvoice}
        onShare={handleShareSelectedInvoice}
        sharing={selectedInvoice ? whatsappLoading[selectedInvoice._id] : false}
      />
    </div>
  );
};

export default SalesList;
