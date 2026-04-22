"use client";

import { useUser } from "@auth0/nextjs-auth0/client";

export default function TestAuthPage() {
  const { user, isLoading, error } = useUser();

  if (isLoading) return <div>Loading...</div>;
  
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h1>Auth0 Test Page</h1>
      
      {user ? (
        <div>
          <h2>Logged in as:</h2>
          <pre>{JSON.stringify(user, null, 2)}</pre>
          <a href="/auth/logout">Logout</a>
        </div>
      ) : (
        <div>
          <p>Not logged in</p>
          <a href="/auth/login">Login</a>
        </div>
      )}
    </div>
  );
}
