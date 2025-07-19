"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";

export default function TestAuthPage() {
  const { data: session, status } = useSession();
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    // Fetch debug info
    fetch('/api/auth/debug')
      .then(res => res.json())
      .then(data => setDebugInfo(data))
      .catch(err => console.error('Debug fetch error:', err));
  }, [session]);

  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Authentication Test Page</h1>
        
        {/* Session Status */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Session Status</h2>
          <div className="space-y-2">
            <p><strong>Status:</strong> <span className={`px-2 py-1 rounded text-sm ${status === 'authenticated' ? 'bg-green-100 text-green-800' : status === 'loading' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>{status}</span></p>
            {session && (
              <>
                <p><strong>User Email:</strong> {session.user?.email}</p>
                <p><strong>User Name:</strong> {session.user?.name}</p>
                <p><strong>User ID:</strong> {(session.user as any)?.id || 'Not set'}</p>
              </>
            )}
          </div>
        </div>

        {/* Auth Actions */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Actions</h2>
          <div className="space-x-4">
            {!session ? (
              <>
                <button
                  onClick={() => signIn('google')}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Sign in with Google
                </button>
                <button
                  onClick={() => signIn('credentials')}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Sign in with Credentials
                </button>
              </>
            ) : (
              <button
                onClick={() => signOut()}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>

        {/* Debug Info */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
          <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>

        {/* Session Details */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Full Session Object</h2>
          <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded overflow-auto text-sm">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>

        {/* Instructions */}
        <div className="mt-8 text-sm text-gray-600 dark:text-gray-400">
          <h3 className="font-semibold mb-2">Testing Steps:</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Click "Sign in with Google" and complete the OAuth flow</li>
            <li>Check if the session status changes to "authenticated"</li>
            <li>Verify that User ID is properly set</li>
            <li>Check the debug information for any configuration issues</li>
          </ol>
        </div>
      </div>
    </div>
  );
} 