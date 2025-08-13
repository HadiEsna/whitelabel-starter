import {cookies} from 'next/headers';
import {NextRequest, NextResponse} from 'next/server';

// Exchange the Privy access token for an app JWT by calling the Rust backend /auth/login_privy.
export async function POST(req: NextRequest) {
  try {
    const {
      privyToken,
      provider,
      verifier_id,
      discord_id,
      twitter_id,
      apple_sub,
      telegram_id,
      email,
      google,
      spotify,
      instagram,
    } = await req.json();
    if (!privyToken) {
      return NextResponse.json({error: 'Missing privyToken'}, {status: 400});
    }

    const backendUrl = process.env.BACKEND_URL;
    if (!backendUrl) {
      return NextResponse.json({error: 'Missing BACKEND_URL env var'}, {status: 500});
    }

    const hdrs = new Headers();
    hdrs.set('Content-Type', 'application/json');

    // Backend expects: { id_token, ...optional linking hints }
    const res = await fetch(`${backendUrl}/auth/login_privy`, {
      method: 'POST',
      headers: hdrs,
      body: JSON.stringify({
        id_token: privyToken,
        provider,
        verifier_id,
        discord_id,
        twitter_id,
        apple_sub,
        telegram_id,
        // email is accepted here for completeness, though backend derives email from Privy claims
        email,
        // Optional extras passed through; backend will ignore unknown fields
        google,
        spotify,
        instagram,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({error: text || 'Backend exchange failed'}, {status: res.status});
    }

    // Backend returns a tuple: [DbAuthInfo, DbPrivateKey]
    const tuple = await res.json();
    const authInfo = Array.isArray(tuple) ? tuple[0] : tuple;
    const jwt: string | undefined = authInfo?.jwt;

    if (!jwt) {
      return NextResponse.json({error: 'Backend did not return jwt'}, {status: 500});
    }

    // Set HttpOnly cookie for app session
    const cookieStore = cookies();
    // Optionally, parse exp from JWT to set maxAge; fallback to 7 days
    const defaultMaxAge = 60 * 60 * 24 * 7;
    let maxAge = defaultMaxAge;
    try {
      const [, payloadB64] = jwt.split('.');
      const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf8')) as {exp?: number, iat?: number};
      if (payload?.exp && payload?.iat && payload.exp > payload.iat) {
        maxAge = Math.max(0, payload.exp - payload.iat);
      }
    } catch {}

    cookieStore.set('app_session', jwt, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge,
    });

    return NextResponse.json({ok: true});
  } catch (err: any) {
    return NextResponse.json({error: err?.message || 'Unknown error'}, {status: 500});
  }
}
