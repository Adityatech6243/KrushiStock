# KrushiStock Deployment

Recommended layout:

- MongoDB Atlas for the database
- Render Web Service for `krushistock-backend`
- Vercel for `krushistock-frontend`

## 1. Push the repository

Commit the deployment files and push the branch to GitHub. Never commit either
project's real `.env` file.

## 2. Create MongoDB Atlas database

1. Create an Atlas project and cluster.
2. Create a database user with a strong, unique password.
3. Add network access for the backend. Render does not provide a stable outbound
   IP on every plan, so `0.0.0.0/0` is the simplest setup; compensate with a
   strong database password and least-privilege database user.
4. Copy the Node.js connection string and set its database name to
   `krushistock`, for example:

   `mongodb+srv://USER:PASSWORD@CLUSTER/krushistock?retryWrites=true&w=majority`

URL-encode special characters in the database password.

## 3. Deploy the backend to Render

Create a **Web Service** from the GitHub repository:

| Setting | Value |
| --- | --- |
| Root Directory | `krushistock-backend` |
| Runtime | Node |
| Build Command | `npm ci` |
| Start Command | `npm start` |
| Health Check Path | `/` |

Add these environment variables:

```text
NODE_ENV=production
MONGO_URI=<Atlas connection string>
JWT_SECRET=<long random value>
JWT_EXPIRE=7d
CLIENT_URL=<temporary frontend URL, update after step 4>
ADMIN_NAME=<admin display name>
ADMIN_USERNAME=<admin login>
ADMIN_EMAIL=<admin email>
ADMIN_PASSWORD=<strong initial password>
```

Render supplies `PORT`; do not hardcode it. After deployment, open the Render
URL and confirm that `/` returns the KrushiStock API JSON response.

In the Render service Shell, run this once:

```bash
npm run setup
```

Do not run `npm run seed` against production unless you intentionally want to
delete and replace existing business data.

## 4. Deploy the frontend to Vercel

Import the same GitHub repository as a new Vercel project:

| Setting | Value |
| --- | --- |
| Root Directory | `krushistock-frontend` |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Add this environment variable:

```text
VITE_API_BASE_URL=https://YOUR-RENDER-SERVICE.onrender.com/api/v1
```

Deploy, then copy the production Vercel URL.

## 5. Connect both services

In Render, change `CLIENT_URL` to the exact Vercel production origin:

```text
https://YOUR-PROJECT.vercel.app
```

Do not add a trailing slash. Redeploy the Render service, then redeploy Vercel
if its API URL changed.

## 6. Verify production

1. Open the Vercel URL and sign in with the admin account.
2. Refresh a nested page such as `/products`; it should still load.
3. Create and retrieve a test record.
4. Check browser DevTools for CORS or mixed-content errors.
5. Confirm password reset/email and WhatsApp only after their optional
   environment variables are configured.

## Upload persistence warning

The backend currently stores product images and generated invoices under the
local `uploads` directory. Render's filesystem is ephemeral by default, so
these files can disappear after a deploy or restart. Before relying on uploads
in production, either attach a Render persistent disk mounted to the backend's
`uploads` directory or migrate uploads to object storage such as Cloudinary,
Amazon S3, or Cloudflare R2.
