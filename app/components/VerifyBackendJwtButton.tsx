"use client";
import { useState } from 'react';

export default function VerifyBackendJwtButton() {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    const jwt = localStorage.getItem('backend_jwt');
    if (!jwt) {
      setResult('No stored backend_jwt found. Login first.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:6167/parti_v2/verify_auth', {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'authorization': `Bearer ${jwt}`
        }
      });
      if (res.ok) {
        setResult('Backend verification success (verify_auth).');
      } else {
        const text = await res.text();
        setResult(`Backend verification failed: ${text}`);
      }
    } catch (e:any) {
      // Fallback: attempt local decode for debugging
      try {
        const parts = jwt.split('.');
        if (parts.length === 3) {
          const [, payloadB64] = parts;
          const json = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
          setResult(`Backend call error; locally decoded payload: ${JSON.stringify(json)}`);
        } else {
          setResult('Backend call error and JWT format invalid.');
        }
      } catch {
        setResult('Backend call error and local decode failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button onClick={handleVerify} className="btn wallet-button-primary" disabled={loading}>
        <div className="btn-text">{loading ? 'Verifying…' : 'Verify Backend JWT'}</div>
      </button>
      {result && <p className="text-xs break-all max-w-xs">{result}</p>}
    </div>
  );
}
