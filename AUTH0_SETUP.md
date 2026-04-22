# Auth0 Setup Instructions

## 1. Create Auth0 Application

1. Go to [Auth0 Dashboard](https://manage.auth0.com)
2. Create a new application
3. Select "Regular Web Application"
4. Configure the following settings:

### Application Settings
- **Name**: Transit Planner
- **Domain**: Your Auth0 domain (e.g., `your-tenant.auth0.com`)
- **Client ID**: Will be generated automatically
- **Client Secret**: Will be generated automatically

### Allowed Callback URLs
Add these URLs to your Auth0 application:
- `http://localhost:3000/auth/callback`
- `http://localhost:3004/auth/callback` (for development with different port)

### Allowed Logout URLs
Add these URLs to your Auth0 application:
- `http://localhost:3000`
- `http://localhost:3004` (for development with different port)

## 2. Environment Variables

Copy the `.env.example` to `.env.local` and fill in your Auth0 credentials:

```bash
# Auth0 configuration
AUTH0_SECRET="your_generated_secret_here"  # Generate with: openssl rand -hex 32
AUTH0_DOMAIN="your-tenant.auth0.com"
AUTH0_CLIENT_ID="your_client_id_here"
AUTH0_CLIENT_SECRET="your_client_secret_here"
APP_BASE_URL="http://localhost:3000"
```

## 3. Generate Auth0 Secret

Generate a secure secret for the `AUTH0_SECRET` variable:

```bash
openssl rand -hex 32
```

## 4. Test the Integration

1. Start the development server: `npm run dev`
2. Navigate to `/test-auth` to test authentication
3. Click "Login" to initiate the Auth0 flow
4. You should be redirected to Auth0, then back to your app

## 5. Auth0 Routes

The Auth0 SDK automatically handles these routes:
- `/auth/login` - Initiates login
- `/auth/logout` - Logs out the user
- `/auth/callback` - Handles the callback from Auth0
- `/auth/profile` - Returns user profile information
- `/auth/access-token` - Returns access token

## 6. Usage in Components

```tsx
"use client";

import { useUser } from "@auth0/nextjs-auth0/client";

export function MyComponent() {
  const { user, isLoading, error } = useUser();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return user ? <div>Welcome {user.name}!</div> : <div>Please log in</div>;
}
```

## 7. Server-Side Usage

```tsx
import { auth0 } from "~/lib/auth0";

export default async function ServerPage() {
  const session = await auth0.getSession();
  
  return (
    <div>
      {session ? <div>Hello {session.user.name}</div> : <div>Not logged in</div>}
    </div>
  );
}
```
