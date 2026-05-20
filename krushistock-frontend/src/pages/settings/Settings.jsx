import React, { useState } from 'react';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { showSuccess, showError } from '../../utils/alert';

const Settings = () => {
  const [formData, setFormData] = useState({
    organizationName: ' Mahalaxmi Sheti Seva Kendra Hasur Khurd',
    address: 'Hasur Khurd, Tal.kagal ,Dist. Kolhapur, Maharashtra-416216',
    phone: '7820974939',
    email: 'mahalxmiShetiSevaKendra@gmail.com',
    gst: '27XXXXX1234X1ZX',
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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
        <p className="text-gray-600">Manage system configuration and preferences</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 max-w-3xl">
        <form onSubmit={handleSubmit}>
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">
              Organization Information
            </h3>
            
            <Input
              label="Organization Name"
              type="text"
              name="organizationName"
              value={formData.organizationName}
              onChange={handleChange}
              placeholder="Enter organization name"
              required
            />

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Address <span className="text-red-500">*</span>
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter complete address"
                rows="3"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Phone"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
                required
              />

              <Input
                label="Email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email address"
                required
              />
            </div>

            <Input
              label="GST Number"
              type="text"
              name="gst"
              value={formData.gst}
              onChange={handleChange}
              placeholder="Enter GST number"
            />
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">
              System Configuration
            </h3>

            <Input
              label="Low Stock Threshold"
              type="number"
              name="lowStockThreshold"
              value={formData.lowStockThreshold}
              onChange={handleChange}
              placeholder="10"
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Currency"
                type="text"
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                disabled
              />

              <Input
                label="Timezone"
                type="text"
                name="timezone"
                value={formData.timezone}
                onChange={handleChange}
                disabled
              />
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">
              Application Information
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Version</p>
                  <p className="font-medium">1.0.0</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Last Updated</p>
                  <p className="font-medium">February 2026</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
            <Button type="button" variant="outline">
              Reset to Default
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
