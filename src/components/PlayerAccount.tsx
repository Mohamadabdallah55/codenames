import { useEffect, useState } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import config from '../../firebase-applet-config.json';
const auth = getAuth(getApps().length ? getApp() : initializeApp(config));
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
export default function PlayerAccount() {
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => onAuthStateChanged(auth, setUser, () => setError('تعذر التحقق من الحساب. يمكنك اللعب كضيف.')), []);
  async function toggle() {
    if (busy) return;
    setBusy(true); setError('');
    try { if (user) await signOut(auth); else await signInWithPopup(auth, provider); }
    catch (e) { const code = (e as {code?: string})?.code;
      setError(code === 'auth/unauthorized-domain' ? 'نطاق اللعبة غير مصرح به في Firebase.' : code === 'auth/popup-blocked' ? 'اسمح بالنوافذ المنبثقة.' : 'تعذر تسجيل الدخول أو الخروج. اللعب كضيف متاح.');
    } finally { setBusy(false); }
  }
  return <div className="cn-account"><button type="button" className="cn-extra-btn" disabled={busy} onClick={() => void toggle()}>{busy ? 'جارٍ التحقق…' : user ? 'خروج · ' + (user.displayName?.split(' ')[0] || 'حسابي') : 'دخول Google'}</button>{error && <span role="alert" className="cn-extra-error">{error}</span>}</div>;
}
