"use client";

import {useState, useEffect} from 'react';
import {usePrivy, useIdentityToken} from '@privy-io/react-auth';

export default function BackendLoginButton() {
  const {ready, authenticated, getAccessToken, user} = usePrivy();
  const { identityToken } = useIdentityToken();
  const [loading, setLoading] = useState(false);
  const [hasJwt, setHasJwt] = useState(false);

  useEffect(() => {
    setHasJwt(!!localStorage.getItem('backend_jwt'));
  }, []);

  const handleBackendLogin = async () => {
    if (!ready || !authenticated || loading) return;
    setLoading(true);
    try {
      const privyToken = await getAccessToken();
      console.log('Privy access token:', user);
      console.log('Identity access token:', identityToken);
      console.log('Privy access token:', privyToken);
      if (!privyToken) throw new Error('No Privy access token');
      if (!identityToken) throw new Error('No Identity access token');


      const res = await fetch('https://api-backend.firstlookforyou.com/parti_v2/auth/login_privy', {
        method: 'POST',
        headers: {'Content-Type': 'application/json',
            'accept': 'application/json',
            'authorization': `Bearer ${privyToken}`,
            'privy-id-token': identityToken
        },
        body: JSON.stringify({
          id_token: identityToken,
          access_token: privyToken
        })
      });
      if (!res.ok) {
        const text = await res.text();
        console.error('Backend login failed:', text);
      } else {
        const data = await res.json();
        // Expect shape: [ { user_id, role_id, jwt }, { private_key } ]
        const jwt = data?.[0]?.jwt;
        if (jwt) {
          localStorage.setItem('backend_jwt', jwt);
          setHasJwt(true);
          console.log('Stored backend JWT');
        } else {
          console.warn('No JWT in response payload', data);
        }
        console.log('Backend login succeeded. JWT cookie set.', data);
      }
    } catch (e) {
      console.error('Backend login error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleBackendLogout = () => {
    localStorage.removeItem('backend_jwt');
    setHasJwt(false);
    console.log('Cleared backend JWT (logout)');
  };

  return (
    <div className="flex gap-2">
      <button onClick={handleBackendLogin} className={`btn ${!authenticated ? 'btn-disabled' : 'wallet-button-primary'}`} disabled={!authenticated || loading}>
        <div className={`${!authenticated ? 'btn-text-disabled' : 'btn-text'}`}>
          {loading ? 'Logging in…' : hasJwt ? 'Re-login Backend' : 'Login to Backend'}
        </div>
      </button>
      <button onClick={handleBackendLogout} className={`btn ${hasJwt ? 'wallet-button-secondary' : 'btn-disabled'}`} disabled={!hasJwt || loading}>
        <div className={`${hasJwt ? 'btn-text' : 'btn-text-disabled'}`}>Logout Backend</div>
      </button>
    </div>
  );
}
