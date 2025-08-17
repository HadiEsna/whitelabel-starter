"use client";
import { useState } from 'react';

export default function VerifyBackendJwtButton() {
  const [result, setResult] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<{user_id:number; role_id:number} | null>(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    const jwt = localStorage.getItem('backend_jwt');
    if (!jwt) {
      setResult('No stored backend_jwt found. Login first.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('https://api-backend.firstlookforyou.com/parti_v2/verify_auth', {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'authorization': `Bearer ${jwt}`
        }
      });
      if (res.ok) {
        // Decode user_id / role_id locally from the JWT (server already validated signature)
        try {
          const token = jwt;
          const payloadSeg = token.split('.')[1];
          const b64 = payloadSeg.replace(/-/g, '+').replace(/_/g, '/');
          // pad base64
          const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
          const jsonStr = atob(padded);
          const payload = JSON.parse(jsonStr);
          if (typeof payload.user_id === 'number' && typeof payload.role_id === 'number') {
            setUserInfo({ user_id: payload.user_id, role_id: payload.role_id });
            setResult(`Backend verification success. user_id=${payload.user_id}`);
          } else {
            setResult('Backend verification success, but could not parse user_id in payload.');
          }
        } catch (e) {
          setResult('Backend verification success, but local decode failed.');
        }
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
      {userInfo && (
        <div className="text-xs text-gray-500">Role ID: {userInfo.role_id}</div>
      )}
    </div>
  );
}
