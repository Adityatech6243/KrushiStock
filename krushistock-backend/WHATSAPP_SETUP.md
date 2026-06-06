# WhatsApp Business Cloud API Integration Guide

This guide describes how to configure your MERN application to send real-time WhatsApp notifications using the official **Meta WhatsApp Cloud API**.

---

## Step 1: Create a Meta Developer App
Meta has a few different dashboard layouts. Follow the path below that matches what you see on your screen:

### Option A: If you see "Select an App Type" or "Use Cases"
1. Go to the [Meta for Developers Portal](https://developers.facebook.com/) and log in.
2. Click **My Apps** in the top-right corner, then click the green **Create App** button.
3. Choose **Other** from the list of options, then click **Next**.
4. Choose **Business** as the app type, then click **Next**.
5. Enter an app name (e.g., `KrushiStock App`) and select/create a **Meta Business Portfolio** (optional for testing, required for production). Click **Create App**.

### Option B: If you see "What do you want your app to do?" (Newest Layout)
1. Go to the [Meta for Developers Portal](https://developers.facebook.com/) and log in.
2. Click **My Apps** -> **Create App**.
3. Under the list of use cases, select **Other** at the bottom of the list and click **Next**.
4. On the next screen, select **Business** and click **Next**.
5. Enter your App Name and click **Create App**.

---

## Step 2: Add WhatsApp to Your App
1. Once your app is created, you will be on the App Dashboard.
2. Under **Add products to your app**, scroll down to find **WhatsApp** and click **Set up**.
3. You will be asked to select or create a Meta Business Portfolio. Select your portfolio (or create a temporary one) and click **Continue**.
4. You are now inside the **WhatsApp API Setup** dashboard!


---

## Step 3: Get Temporary Credentials (For testing)
Meta provides a free test number to get started instantly. On the API Setup page, you will see:
* **Temporary Access Token:** Valid for 24 hours. (For production, you must generate a permanent System User token).
* **Phone Number ID:** A long string of numbers (e.g., `105829302928374`).
* **WhatsApp Business Account ID:** (e.g., `204859392817264`).

### Register Test Recipient Phone Numbers:
Because your app is in Sandbox mode, you can **only** send messages to phone numbers that you explicitly register as test numbers:
1. Locate the **To** drop-down field on the setup page.
2. Select **Manage Phone Number List**.
3. Add your personal WhatsApp number (with the country code, e.g., `+91 98765 43210`).
4. Enter the verification code sent to your phone.

---

## Step 4: Configure Your Backend Server
Update your backend `.env` file (`krushistock-backend/.env`) with the credentials you retrieved:
```ini
WHATSAPP_ACCESS_TOKEN="YOUR_TEMPORARY_OR_PERMANENT_ACCESS_TOKEN"
WHATSAPP_PHONE_NUMBER_ID="YOUR_PHONE_NUMBER_ID"
WHATSAPP_BUSINESS_ACCOUNT_ID="YOUR_WHATSAPP_BUSINESS_ACCOUNT_ID"
ADMIN_PHONE_NUMBER="919876543210" # Your admin number to receive low stock alerts
MOCK_WHATSAPP=false # Set to false to disable mock mode and use the real Meta API
```

Restart your backend server after editing the `.env` file:
```bash
npm run dev
```

---

## Step 5: Configure the Webhook for Delivery Receipts
To receive real-time updates (e.g., when a farmer opens/reads an invoice):
1. In the Meta Developer console, click **WhatsApp** > **Configuration** in the left sidebar.
2. Click **Edit** under **Webhook**.
3. Enter your details:
   * **Callback URL:** `https://your-domain.com/api/v1/whatsapp/webhook`
     *(If testing locally, use a tool like **ngrok** to create a public tunnel to port 5000: `ngrok http 5000`)*
   * **Verify Token:** `krushistock_verify_token` (Matches the value configured in your settings DB)
4. Click **Verify and Save**.
5. Under **Webhook Fields**, click **Manage** and subscribe to:
   * `messages` (triggers when farmers reply back)
   * `message_deliveries` (tracks status updates like `sent`, `delivered`, `read`)

---

## Step 6: Create Approved Templates (For custom messaging)
Meta limits WhatsApp Business APIs to pre-approved templates when initiating chats. 
1. Go to **WhatsApp Manager** > **Message Templates** from the Meta App page.
2. Create templates matching your alerts:
   * E.g., Payment due reminders or invoice updates.
3. Make sure to specify variables (like `{{1}}` for invoice numbers or amount) and submit them for review (usually approved in minutes).
4. Update the service code in `whatsAppService.js` to match the exact template name and language variables.
