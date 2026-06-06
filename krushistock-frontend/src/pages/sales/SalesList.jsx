import React, { useState, useEffect } from 'react';
import { getAllSales, deleteSale, createSale, updateSale, getSaleInvoice } from '../../services/salesService';
import { sendManualInvoice } from '../../services/whatsAppService';
import { getAllFarmers } from '../../services/farmerService';
import { getAllProducts } from '../../services/productService';
import { showConfirm, showSuccess, showError } from '../../utils/alert';
import { validatePositiveNumber } from '../../utils/validators';
import Table from '../../components/common/Table';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import SalesInvoicePreviewModal from '../../components/invoices/SalesInvoicePreviewModal';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { PAYMENT_METHODS } from '../../utils/constants';
import { Eye } from 'lucide-react';

const SalesList = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [whatsappLoading, setWhatsappLoading] = useState({});
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Form state
  const [farmers, setFarmers] = useState([]);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    customer: '',
    saleDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Cash',
    sendWhatsApp: false
  });
  const [items, setItems] = useState([
    { product: '', quantity: '', price: '', availableStock: 0 }
  ]);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState([]);

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
      const response = await getAllFarmers();
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
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    if (field === 'product') {
      const product = products.find((p) => p._id === value);
      if (product) {
        newItems[index].price = product.price;
        newItems[index].availableStock = product.stock;
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
    setItems([...items, { product: '', quantity: '', price: '', availableStock: 0 }]);
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

    let hasErrors = false;
    const errorsArray = items.map((item) => {
      const qtyErr = validatePositiveNumber(item.quantity, 'Quantity');
      const priceErr = validatePositiveNumber(item.price, 'Price');
      if (qtyErr || priceErr) hasErrors = true;
      return { quantity: qtyErr, price: priceErr };
    });

    if (hasErrors) {
      setFieldErrors(errorsArray);
      return;
    }

    for (const item of items) {
      // Only check stock if adding a new sale (editing is more complex since the stock was already deducted)
      if (!isEditing && Number(item.quantity) > item.availableStock) {
        showError('Insufficient Stock', `Not enough stock for ${products.find(p => p._id === item.product)?.name}`);
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
          price: Number(item.price)
        })),
        totalAmount: calculateTotal()
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
      fetchProducts(); // Refresh products to get updated stock
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
    
    const formattedDate = sale.saleDate
      ? new Date(sale.saleDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    setFormData({
      customer: sale.customer?._id || sale.customer || '',
      saleDate: formattedDate,
      paymentMethod: sale.paymentMethod || 'Cash',
      sendWhatsApp: false
    });

    if (sale.items && sale.items.length > 0) {
      setItems(sale.items.map(item => {
        const prodId = item.product?._id || item.product;
        const prod = products.find(p => p._id === prodId);
        return {
          product: prodId,
          quantity: item.quantity || '',
          price: item.price || '',
          availableStock: prod ? prod.stock : 0
        };
      }));
    } else {
      setItems([{ product: '', quantity: '', price: '', availableStock: 0 }]);
    }
    
    setFieldErrors([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditId(null);
    setFormData({
      customer: '',
      saleDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'Cash',
      sendWhatsApp: false
    });
    setItems([{ product: '', quantity: '', price: '', availableStock: 0 }]);
    setFieldErrors([]);
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
        fetchProducts(); // refresh products for stock
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
      render: (row) => formatCurrency(row.totalAmount)
    },
    {
      header: 'Payment',
      accessor: 'paymentMethod'
    },
    {
      header: 'Invoice',
      accessor: 'download',
      render: (row) => {
        return (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openInvoicePreview(row._id)}
            className="flex items-center gap-1 text-[10px] py-1 px-2.5 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-250 transition-all font-bold"
          >
            <Eye size={12} />
            Preview
          </Button>
        );
      }
    },
    {
      header: 'WhatsApp Invoice',
      accessor: 'whatsapp',
      render: (row) => {
        if (!row.customer || !row.customer.phone) {
          return <span className="text-[10px] font-bold text-slate-400">No Phone</span>;
        }
        const isSending = whatsappLoading[row._id];
        return (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isSending}
            onClick={() => handleSendWhatsAppInvoice(row)}
            className="flex items-center gap-1 text-[10px] py-1 px-2.5 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-250 disabled:opacity-50 transition-all font-bold"
          >
            {isSending ? 'Sending...' : '💬 Send Invoice'}
          </Button>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-100 pb-4">
        <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Sales POS Terminal</h1>
        <p className="text-slate-500 text-xs md:text-sm">Record and issue customer invoices, track sales transactions, and update farmer profiles.</p>
      </div>

      {/* Form Section */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 md:p-6 shadow-soft max-w-4xl">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">
          {isEditing ? '⚡ Edit Invoice Details' : '📝 Issue New Invoice'}
        </h2>
        <form onSubmit={handleSubmit}>
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
            />

            <Input
              label="Sale Date"
              type="date"
              name="saleDate"
              value={formData.saleDate}
              onChange={handleFormChange}
              required
            />
          </div>

          <div className="my-6 p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Invoice Items</h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                + Add Item
              </Button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 items-end">
                <div className="col-span-12 md:col-span-5">
                  <Select
                    label={index === 0 ? 'Product' : ''}
                    name="product"
                    value={item.product}
                    onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                    options={products.filter(p => p.isActive).map((prod) => ({
                      value: prod._id,
                      label: `${prod.name} (Stock: ${prod.stock})`
                    }))}
                    required
                  />
                </div>
                <div className="col-span-6 md:col-span-3">
                  <Input
                    label={index === 0 ? 'Quantity' : ''}
                    type="number"
                    name="quantity"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    placeholder="0"
                    required
                    min="0"
                    error={fieldErrors[index]?.quantity}
                  />
                  {item.availableStock > 0 && !isEditing && (
                    <p className="text-[10px] text-slate-400 font-medium -mt-3.5 mb-2 pl-1">Available: {item.availableStock}</p>
                  )}
                </div>
                <div className="col-span-5 md:col-span-3">
                  <Input
                    label={index === 0 ? 'Price' : ''}
                    type="number"
                    name="price"
                    value={item.price}
                    onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                    placeholder="0.00"
                    required
                    min="0"
                    step="0.01"
                    error={fieldErrors[index]?.price}
                  />
                </div>
                <div className="col-span-1 pb-4 flex justify-center">
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="p-1 h-9 w-9 rounded-lg"
                    >
                      ×
                    </Button>
                  )}
                </div>
              </div>
            ))}
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
          onDelete={handleDelete} 
          pagination={pagination} 
          onPageChange={handlePageChange} 
        />
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
