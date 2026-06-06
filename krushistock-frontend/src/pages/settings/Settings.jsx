import React, { useState } from 'react';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { showSuccess, showError } from '../../utils/alert';
import { Settings as SettingsIcon, Building, Sliders, Info, HelpCircle } from 'lucide-react';

const Settings = () => {
  const [formData, setFormData] = useState({
    organizationName: ' Mahalaxmi Sheti Seva Kendra Hasur Khurd',
    address: 'Hasur Khurd, Tal.kagal ,Dist. Kolhapur, Maharashtra-416216',
    phone: '9921868020',
    email: 'mahalxmiShetiSevaKendra@gmail.com',
    gst: '27AABCK1234F1Z5',
    lowStockThreshold: '10',
    currency: '₹',
    timezone: 'Asia/Kolkata'
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      showSuccess('Success!', 'Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      showError('Error', 'Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
        <form onSubmit={handleSubmit} className="space-y-8">
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
                className="w-full text-xs font-semibold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-slate-350"
              />
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
              />

              <Input
                label="Primary Email Address"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Email address"
                required
              />
            </div>

            <Input
              label="GST Identification Number (GSTIN)"
              type="text"
              name="gst"
              value={formData.gst}
              onChange={handleChange}
              placeholder="e.g. 27XXXXX1234X1ZX"
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
                    organizationName: ' Mahalaxmi Sheti Seva Kendra Hasur Khurd',
                    address: 'Hasur Khurd, Tal.kagal ,Dist. Kolhapur, Maharashtra-416216',
                    phone: '7820974939',
                    email: 'mahalxmiShetiSevaKendra@gmail.com',
                    gst: '27XXXXX1234X1ZX',
                    lowStockThreshold: '10',
                    currency: '₹',
                    timezone: 'Asia/Kolkata'
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
