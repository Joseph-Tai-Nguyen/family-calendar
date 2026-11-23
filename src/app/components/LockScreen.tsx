import { useState } from 'react';
import { checkPin } from '../lib/browser';
import { useStore } from '../state/store';

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { t } = useStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const submit = async () => {
    if (await checkPin(pin)) onUnlock();
    else {
      setError(true);
      setPin('');
    }
  };
  return (
    <div className="lock">
      <div className="lock-box">
        <div className="lock-icon" aria-hidden>
          🔒
        </div>
        <h2>{t('lock.title')}</h2>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          maxLength={8}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          aria-label={t('lock.title')}
        />
        {error && <p className="error">{t('lock.wrong')}</p>}
        <button className="btn primary" onClick={submit}>
          OK
        </button>
      </div>
    </div>
  );
}
