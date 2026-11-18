'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Camera, Trash2 } from 'lucide-react';
import { ButtonSpinner } from '@/components/ui/Loaders';

interface Props {
  user: { name: string; email: string; role: string; avatarUrl?: string | null; createdAt: string };
  stats: { enrolled: number; completed: number; certificates: number };
}

const inputCls =
  'w-full h-11 px-3.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-base placeholder-gray-400 focus:outline-none focus:border-amber-600 focus:shadow-[0_0_0_3px_#e3eeff] transition disabled:bg-gray-100 disabled:text-gray-500';

type Notice = { type: 'success' | 'error'; text: string } | null;

function NoticeBar({ notice }: { notice: Notice }) {
  if (!notice) return null;
  const ok = notice.type === 'success';
  return (
    <div
      role={ok ? 'status' : 'alert'}
      className={`p-3 rounded-lg border text-sm flex items-center gap-2 ${
        ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'
      }`}
    >
      {ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
      <span>{notice.text}</span>
    </div>
  );
}

export function ProfileClient({ user, stats }: Props) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [savedName, setSavedName] = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarNotice, setAvatarNotice] = useState<Notice>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [savingName, setSavingName] = useState(false);
  const [nameNotice, setNameNotice] = useState<Notice>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null);

  const patch = async (body: object) => {
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong');
    return data;
  };

  const uploadAvatar = async (file: File) => {
    setAvatarNotice(null);
    if (file.size > 2 * 1024 * 1024) {
      setAvatarNotice({ type: 'error', text: 'Image must be 2 MB or smaller.' });
      return;
    }
    setAvatarBusy(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/profile/avatar', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setAvatarUrl(data.avatarUrl);
      setAvatarNotice({ type: 'success', text: 'Profile picture updated.' });
      router.refresh();
    } catch (err: any) {
      setAvatarNotice({ type: 'error', text: err.message });
    } finally {
      setAvatarBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeAvatar = async () => {
    setAvatarNotice(null);
    setAvatarBusy(true);
    try {
      const res = await fetch('/api/profile/avatar', { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not remove the picture');
      setAvatarUrl('');
      setAvatarNotice({ type: 'success', text: 'Profile picture removed.' });
      router.refresh();
    } catch (err: any) {
      setAvatarNotice({ type: 'error', text: err.message });
    } finally {
      setAvatarBusy(false);
    }
  };

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameNotice(null);
    setSavingName(true);
    try {
      const data = await patch({ name });
      setSavedName(data.user.name);
      setName(data.user.name);
      setNameNotice({ type: 'success', text: 'Your name has been updated.' });
      router.refresh();
    } catch (err: any) {
      setNameNotice({ type: 'error', text: err.message });
    } finally {
      setSavingName(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordNotice(null);
    if (newPassword !== confirmPassword) {
      setPasswordNotice({ type: 'error', text: 'The new passwords do not match.' });
      return;
    }
    setSavingPassword(true);
    try {
      await patch({ currentPassword, newPassword });
      setPasswordNotice({ type: 'success', text: 'Your password has been changed.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordNotice({ type: 'error', text: err.message });
    } finally {
      setSavingPassword(false);
    }
  };

  const memberSince = new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="w-full px-4 sm:px-6 lg:px-10 py-5 sm:py-8 space-y-6">
      <section className="bg-amber-100 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-5">
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="relative w-24 h-24">
            {avatarUrl ? (
              <img src={avatarUrl} alt={`${savedName}'s profile picture`} referrerPolicy="no-referrer" className="w-24 h-24 rounded-full object-cover border-4 border-white" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-amber-600 text-white flex items-center justify-center text-4xl font-semibold border-4 border-white" aria-hidden="true">
                {savedName.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={avatarBusy}
              aria-label="Upload profile picture"
              className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-amber-600 hover:bg-[#0060eb] text-white flex items-center justify-center border-2 border-white transition active:scale-95 disabled:opacity-60"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            aria-label="Choose a profile picture"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadAvatar(f);
            }}
          />
          {avatarUrl && (
            <button
              type="button"
              onClick={removeAvatar}
              disabled={avatarBusy}
              className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1 disabled:opacity-60"
            >
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="text-3xl sm:text-4xl font-semibold text-amber-800 leading-tight truncate">{savedName}</h1>
          <p className="text-base text-gray-600 truncate">{user.email}</p>
          <p className="text-sm text-gray-600 mt-0.5">Member since {memberSince}</p>
        </div>
        <dl className="sm:ml-auto grid grid-cols-3 gap-6 text-center shrink-0">
          {[
            { label: 'Enrolled', value: stats.enrolled },
            { label: 'Completed', value: stats.completed },
            { label: 'Certificates', value: stats.certificates },
          ].map((s) => (
            <div key={s.label}>
              <dd className="text-2xl font-semibold text-amber-600">{s.value}</dd>
              <dt className="text-xs text-gray-600">{s.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {avatarNotice && <NoticeBar notice={avatarNotice} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <form onSubmit={saveName} className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-7 space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Personal details</h2>
            <p className="text-sm text-gray-600">This name appears on your certificates. Profile pictures: JPG, PNG or WebP, up to 2 MB.</p>
          </div>
          <NoticeBar notice={nameNotice} />
          <div>
            <label htmlFor="profile-name" className="block text-sm font-semibold text-gray-700 mb-1">
              Full name
            </label>
            <input
              id="profile-name"
              type="text"
              required
              minLength={2}
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              autoComplete="name"
            />
          </div>
          <div>
            <label htmlFor="profile-email" className="block text-sm font-semibold text-gray-700 mb-1">
              Email
            </label>
            <input id="profile-email" type="email" value={user.email} disabled className={inputCls} />
            <p className="text-xs text-gray-600 mt-1">Your email is your login and cannot be changed here.</p>
          </div>
          <button
            type="submit"
            disabled={savingName || name.trim() === savedName}
            className="h-10 px-5 rounded-lg bg-amber-600 hover:bg-[#0060eb] text-white font-semibold text-sm transition active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {savingName ? <ButtonSpinner label="Saving..." /> : 'Save changes'}
          </button>
        </form>

        <form onSubmit={savePassword} className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-7 space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Change password</h2>
            <p className="text-sm text-gray-600">Use at least 8 characters.</p>
          </div>
          <NoticeBar notice={passwordNotice} />
          <div>
            <label htmlFor="current-password" className="block text-sm font-semibold text-gray-700 mb-1">
              Current password
            </label>
            <input
              id="current-password"
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="new-password" className="block text-sm font-semibold text-gray-700 mb-1">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-semibold text-gray-700 mb-1">
              Confirm new password
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputCls}
            />
          </div>
          <button
            type="submit"
            disabled={savingPassword}
            className="h-10 px-5 rounded-lg bg-amber-600 hover:bg-[#0060eb] text-white font-semibold text-sm transition active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {savingPassword ? <ButtonSpinner label="Updating..." /> : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
