'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const user = localStorage.getItem('user');
    if (user) {
      setIsLoggedIn(true);
    }
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm lg:flex">
        <div className="flex flex-col items-center justify-center">
          <h1 className="text-4xl font-bold mb-8">Chat-Sec-1</h1>
          <h2 className="text-2xl mb-8">Secure Chat Application</h2>
          
          <div className="flex flex-col space-y-4">
            {!isLoggedIn ? (
              <>
                <Link 
                  href="/login" 
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Login
                </Link>
                <Link 
                  href="/register" 
                  className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Register
                </Link>
              </>
            ) : (
              <Link 
                href="/chat" 
                className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                Go to Chat
              </Link>
            )}
          </div>
          
          <div className="mt-12 text-center">
            <h3 className="text-xl mb-4">Features:</h3>
            <ul className="list-disc text-left">
              <li>End-to-end encryption</li>
              <li>Digital signatures (RSA/DSA)</li>
              <li>Secure key distribution</li>
              <li>Real-time messaging</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
