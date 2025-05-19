'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const checkLogin = async () => {
      const res = await fetch('http://localhost:5001/api/get-cookie', {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.user) setIsLoggedIn(true);
    };
    checkLogin();
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm lg:flex">
        <div className="flex flex-col items-center justify-center">
          <h1 className="text-4xl font-bold mb-8">Chat-Sec</h1>
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
        </div>
      </div>
    </main>
  );
}
