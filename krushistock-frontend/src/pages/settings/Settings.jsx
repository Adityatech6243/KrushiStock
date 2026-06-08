import React, { useState, useEffect } from 'react';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { showSuccess, showError } from '../../utils/alert';
import { Settings as SettingsIcon, Building, Sliders, Info, HelpCircle, Phone, Key, Settings2, Share2, MessageSquare } from 'lucide-react';
import { getStoreSettings, updateStoreSettings } from '../../services/settingsService';
import { getWhatsAppSettings, updateWhatsAppSettings } from '../../services/whatsAppService';
import { 
  validateRequired, 
  validatePhone, 
  validateEmail, 
  validateGst, 
  validatePositiveNumber 
} from '../../utils/validators';

const Settings = () => {
  const [formData, setFormData] = useState({
    organizationName: 'Mahalaxmi Sheti Seva Kendra Hasur Khurd',
    address: 'Hasur Khurd, Tal. Kagal, Dist. Kolhapur, Maharashtra - 416218',
    phone: '7820974939',
    email: 'mahalxmiShetiSevaKendra@gmail.com',
    gst: '27XXXXX1234X1ZX',
    lowStockThreshold: '10',
    currency: '₹',
    timezone: 'Asia/Kolkata'
  });
  const [whatsappData, setWhatsappData] = useState({
    accessToken: '',
    phoneNumberId: '',
    businessAccountId: '',
    webhookVerifyToken: '',
    adminPhoneNumber: '',
    lowStockAlertsEnabled: true,
    paymentRemindersEnabled: true,
    catalogSharingEnabled: true
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [storeRes, whatsappRes] = await Promise.all([
          getStoreSettings(),
          getWhatsAppSettings()
        ]);

        if (storeRes?.success && storeRes?.data) {
          const settings = storeRes.data;
          setFormData({
            organizationName: settings.organizationName || '',
            address: settings.address || '',
            phone: settings.phone || '',
            email: settings.email || '',
            gst: settings.gst || '',
            lowStockThreshold: String(settings.lowStockThreshold || '10'),
            currency: settings.currency || '₹',
            timezone: settings.timezone || 'Asia/Kolkata'
          });
        }

        if (whatsappRes?.success && whatsappRes?.data) {
          const wSettings = whatsappRes.data;
          setWhatsappData({
            accessToken: wSettings.accessToken || '',
            phoneNumberId: wSettings.phoneNumberId || '',
            businessAccountId: wSettings.businessAccountId || '',
            webhookVerifyToken: wSettings.webhookVerifyToken || '',
            adminPhoneNumber: wSettings.adminPhoneNumber || '',
            lowStockAlertsEnabled: wSettings.lowStockAlertsEnabled !== false,
            paymentRemindersEnabled: wSettings.paymentRemindersEnabled !== false,
            catalogSharingEnabled: wSettings.catalogSharingEnabled !== false
          });
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        showError('Error', 'Failed to fetch settings from server.');
      } finally {
        setInitialLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (fieldErrors[e.target.name]) {
      setFieldErrors(prev => ({
        ...prev,
        [e.target.name]: ''
      }));
    }
  };

  const handleWhatsappChange = (e) => {
    const { name, value, type, checked } = e.target;
    setWhatsappData({
      ...whatsappData,
      [name]: type === 'checkbox' ? checked : value
    });
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = {
      organizationName: validateRequired(formData.organizationName, 'Please enter the organization / store name'),
      address: validateRequired(formData.address, 'Please enter the physical store address'),
      phone: validatePhone(formData.phone, 'Please enter a 10-digit mobile number'),
      email: validateEmail(formData.email, 'Please enter the email address', true),
      gst: validateGst(formData.gst, 'Please enter a valid 15-character GSTIN format'),
      lowStockThreshold: validatePositiveNumber(formData.lowStockThreshold, 'Please enter a positive low stock threshold', true)
    };

    if (whatsappData.adminPhoneNumber) {
      const isPhoneDigitsOnly = /^\d{10,15}$/.test(whatsappData.adminPhoneNumber);
      if (!isPhoneDigitsOnly) {
        errors.adminPhoneNumber = 'Please enter a valid admin phone number with country code (e.g. 917820974939)';
      }
    }

    const hasErrors = Object.values(errors).some(err => err && err !== '');
    if (hasErrors) {
      setFieldErrors(errors);
      showError('Validation Error', 'Please check the highlighted fields.');
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const storePayload = {
        ...formData,
        lowStockThreshold: Number(formData.lowStockThreshold) || 10
      };
      const whatsappPayload = {
        ...whatsappData
      };

      const [storeRes, whatsappRes] = await Promise.all([
        updateStoreSettings(storePayload),
        updateWhatsAppSettings(whatsappPayload)
      ]);

      if (storeRes?.success && whatsappRes?.success) {
        showSuccess('Success!', 'All settings saved successfully!');
      } else if (!storeRes?.success) {
        showError('Error', storeRes?.message || 'Failed to save store settings.');
      } else {
        showError('Error', whatsappRes?.message || 'Failed to save WhatsApp settings.');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      showError('Error', 'Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4 animate-fadeIn">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
        <span className="text-slate-500 font-semibold text-sm">Loading System Settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-10 max-w-4xl">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4">
        <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <SettingsIcon className="text-primary-600 animate-spin-slow" size={24} />
          System Settings
        </h1>
        <p className="text-slate-500 text-xs md:text-sm">Configure farm information, printing headers, tax details, and stock warnings.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-soft p-6">
        <form onSubmit={handleSubmit} className="space-y-8" noValidate>
          {/* Org Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-3">
              <Building size={16} className="text-primary-600" />
              Organization Profile
            </h3>
            
            <Input
              label="Organization / Store Name"
              type="text"
              name="organizationName"
              value={formData.organizationName}
              onChange={handleChange}
              placeholder="Enter name to print on invoices"
              required
              error={fieldErrors.organizationName}
            />

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Full Physical Address <span className="text-rose-500">*</span>
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Detailed location for bills"
                rows="3"
                required
                className={`w-full text-xs font-semibold text-slate-700 bg-slate-50/50 border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-slate-350 ${
                  fieldErrors.address ? 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500' : 'border-slate-200 hover:border-slate-300'
                }`}
              />
              {fieldErrors.address && (
                <p className="text-rose-600 text-xs font-medium mt-0.5">{fieldErrors.address}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Primary Contact Phone"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Phone number"
                required
                error={fieldErrors.phone}
              />

              <Input
                label="Primary Email Address"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email address"
                required
                error={fieldErrors.email}
              />
            </div>

            <Input
              label="GST Identification Number (GSTIN)"
              type="text"
              name="gst"
              value={formData.gst}
              onChange={handleChange}
              placeholder="e.g. 27XXXXX1234X1ZX"
              error={fieldErrors.gst}
            />
          </div>

          {/* Config parameters */}
          <div className="space-y-4 pt-4 border-t border-slate-50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-3">
              <Sliders size={16} className="text-primary-600" />
              System Behavior
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Low Stock Warning Limit"
                type="number"
                name="lowStockThreshold"
                value={formData.lowStockThreshold}
                onChange={handleChange}
                placeholder="10"
                required
                error={fieldErrors.lowStockThreshold}
              />

              <Input
                label="Active Currency Code"
                type="text"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                disabled
              />

              <Input
                label="System Timezone"
                type="text"
                name="timezone"
                value={formData.timezone}
                onChange={handleChange}
                disabled
              />
            </div>
          </div>

          {/* WhatsApp API configurations */}
          <div className="space-y-4 pt-4 border-t border-slate-50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-3">
              <MessageSquare size={16} className="text-primary-600" />
              WhatsApp Business API Configuration
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="System Access Token"
                type="password"
                name="accessToken"
                value={whatsappData.accessToken}
                onChange={handleWhatsappChange}
                placeholder="EAAG..."
              />

              <Input
                label="WhatsApp Phone Number ID"
                type="text"
                name="phoneNumberId"
                value={whatsappData.phoneNumberId}
                onChange={handleWhatsappChange}
                placeholder="e.g. 109876543210987"
              />

              <Input
                label="Meta Business Account ID"
                type="text"
                name="businessAccountId"
                value={whatsappData.businessAccountId}
                onChange={handleWhatsappChange}
                placeholder="e.g. 209876543210987"
              />

              <Input
                label="Webhook Verify Token"
                type="text"
                name="webhookVerifyToken"
                value={whatsappData.webhookVerifyToken}
                onChange={handleWhatsappChange}
                placeholder="krushistock_verify_token"
              />

              <div className="md:col-span-2">
                <Input
                  label="Admin Phone Number (for System Alerts)"
                  type="tel"
                  name="adminPhoneNumber"
                  value={whatsappData.adminPhoneNumber}
                  onChange={handleWhatsappChange}
                  placeholder="e.g. 917820974939"
                  error={fieldErrors.adminPhoneNumber}
                />
                <p className="text-[10px] text-slate-400 font-medium -mt-2.5 mb-4">
                  Include country code without special characters (e.g., 91 for India).
                </p>
              </div>
            </div>

            {/* Notification and Automation Toggles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="flex items-center justify-between p-3.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl transition-all">
                <div className="space-y-0.5 pr-2">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <Sliders size={13} className="text-primary-600" /> Low Stock
                  </label>
                  <p className="text-[9px] text-slate-400 font-semibold leading-snug">Notify admin when inventory drops below warning limit</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none flex-shrink-0">
                  <input
                    type="checkbox"
                    name="lowStockAlertsEnabled"
                    checked={whatsappData.lowStockAlertsEnabled}
                    onChange={handleWhatsappChange}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl transition-all">
                <div className="space-y-0.5 pr-2">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <Phone size={13} className="text-primary-600" /> Reminders
                  </label>
                  <p className="text-[9px] text-slate-400 font-semibold leading-snug">Send automated credit payment reminders to farmers</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none flex-shrink-0">
                  <input
                    type="checkbox"
                    name="paymentRemindersEnabled"
                    checked={whatsappData.paymentRemindersEnabled}
                    onChange={handleWhatsappChange}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl transition-all">
                <div className="space-y-0.5 pr-2">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <Share2 size={13} className="text-primary-600" /> Catalog Share
                  </label>
                  <p className="text-[9px] text-slate-400 font-semibold leading-snug">Allow sharing product catalogs via WhatsApp replies</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none flex-shrink-0">
                  <input
                    type="checkbox"
                    name="catalogSharingEnabled"
                    checked={whatsappData.catalogSharingEnabled}
                    onChange={handleWhatsappChange}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Console details */}
          <div className="space-y-4 pt-4 border-t border-slate-50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-50 pb-3">
              <Info size={16} className="text-primary-600" />
              Console Metadata
            </h3>
            <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-xl">
              <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                <div>
                  <p className="text-slate-400 text-[10px] uppercase tracking-wider">Console Version</p>
                  <p className="text-slate-700 mt-0.5">v1.2.0 (Stable)</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px] uppercase tracking-wider">Build Environment</p>
                  <p className="text-slate-700 mt-0.5">Production MERN Bundle</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-4 border-t border-slate-100">
            <Button type="submit" variant="primary" disabled={loading} className="text-xs font-bold py-2 px-5">
              {loading ? 'Saving Parameters...' : 'Save Configuration'}
            </Button>
            <Button 
              type="button" 
              variant="outline"
              onClick={() => {
                if (window.confirm("Restore default configurations?")) {
                  setFormData({
                    organizationName: 'Mahalaxmi Sheti Seva Kendra Hasur Khurd',
                    address: 'Hasur Khurd, Tal. Kagal, Dist. Kolhapur, Maharashtra - 416218',
                    phone: '7820974939',
                    email: 'mahalxmiShetiSevaKendra@gmail.com',
                    gst: '27XXXXX1234X1ZX',
                    lowStockThreshold: '10',
                    currency: '₹',
                    timezone: 'Asia/Kolkata'
                  });
                  setWhatsappData({
                    accessToken: '',
                    phoneNumberId: '',
                    businessAccountId: '',
                    webhookVerifyToken: 'krushistock_verify_token',
                    adminPhoneNumber: '',
                    lowStockAlertsEnabled: true,
                    paymentRemindersEnabled: true,
                    catalogSharingEnabled: true
                  });
                  showSuccess('Reset Complete', 'Default configurations loaded.');
                }
              }}
              className="text-xs font-bold py-2 px-5"
            >
              Reset to Defaults
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
