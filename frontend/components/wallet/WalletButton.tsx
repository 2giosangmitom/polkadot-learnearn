'use client';

import { useEffect, useState } from 'react';
import { useAccount } from '@luno-kit/react';
import { Wallet } from 'lucide-react';
import { WalletConnect } from './WalletConnect';
import { WalletInfo } from './WalletInfo';

interface UserProfile {
  id?: number;
  wallet_address: string;
  display_name?: string | null;
  role?: number | string | null;
}

function roleToLabel(role: number | string | null | undefined): 'student' | 'teacher' {
  if (typeof role === 'number') return role === 2 ? 'teacher' : 'student';
  if (typeof role === 'string') return role.toLowerCase() === 'teacher' ? 'teacher' : 'student';
  return 'student';
}

function labelToRoleValue(label: 'student' | 'teacher'): number {
  return label === 'teacher' ? 2 : 1;
}

interface WalletButtonProps {
  onConnect?: (address: string, balance: string) => void;
  className?: string;
}

export function WalletButton({ onConnect, className = '' }: WalletButtonProps) {
  const { address } = useAccount();
  const [showModal, setShowModal] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formRole, setFormRole] = useState<'student' | 'teacher'>('student');
  const [saving, setSaving] = useState(false);

  // When address changes, ensure profile exists in Supabase (create if missing)
  useEffect(() => {
    let abort = false;
    async function ensureProfile(wallet: string) {
      setLoadingProfile(true);
      try {
        // 1) Try to fetch existing
        const res = await fetch(`/api/users?wallet_address=${encodeURIComponent(wallet)}`);
        let user: UserProfile | null = null;
        if (res.ok) {
          const data = await res.json();
          user = data?.user || null;
        }

        // 2) If not found, create
        if (!user) {
          const createRes = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet_address: wallet, role: 1 }),
          });
          if (!createRes.ok) {
            const body = await createRes.json().catch(() => ({}));
            throw new Error(body.error || 'Failed to create user');
          }
          const body = await createRes.json();
          user = body?.user || null;
        }

        if (!abort) {
          setProfile(user);
          setFormDisplayName(user?.display_name || '');
          setFormRole(roleToLabel(user?.role));
        }
      } catch (err) {
        console.error('Fetch profile failed', err);
      } finally {
        if (!abort) setLoadingProfile(false);
      }
    }

    if (address) {
      ensureProfile(address);
    } else {
      setProfile(null);
      setEditing(false);
      setFormDisplayName('');
      setFormRole('student');
    }

    return () => {
      abort = true;
    };
  }, [address]);

  if (address) {
    return (
      <div className="space-y-3">
        <WalletInfo 
          address={address}
          displayName={profile?.display_name || undefined}
          role={roleToLabel(profile?.role)}
          onConnect={onConnect}
          onEditProfile={() => setEditing(true)}
          className={className}
        />

        {editing && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Connected</p>
                  <p className="text-sm font-semibold break-all">{address}</p>
                </div>
                {loadingProfile && <span className="text-xs text-gray-500">Loading...</span>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Display name</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-200"
                  placeholder="How should we call you?"
                  value={formDisplayName}
                  onChange={(e) => setFormDisplayName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Role</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-200"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as 'student' | 'teacher')}
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 text-sm bg-[#e6007a] text-white rounded-lg hover:bg-[#cc006c] disabled:opacity-50"
                  onClick={async () => {
                    if (!address) return;
                    setSaving(true);
                    try {
                      const res = await fetch('/api/users', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          wallet_address: address,
                          display_name: formDisplayName,
                          role: labelToRoleValue(formRole),
                        }),
                      });
                      if (!res.ok) {
                        const body = await res.json().catch(() => ({}));
                        throw new Error(body.error || 'Failed to save profile');
                      }
                      const body = await res.json();
                      setProfile(body.user);
                      setEditing(false);
                    } catch (err) {
                      console.error('Save profile failed', err);
                      alert(err instanceof Error ? err.message : 'Save failed');
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-2 bg-[#e6007a] hover:bg-[#cc006c] text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-sm ${className}`}
      >
        <Wallet className="w-5 h-5" />
        Connect Wallet
      </button>

      {showModal && (
        <WalletConnect
          onClose={() => setShowModal(false)}
          onConnect={onConnect}
        />
      )}
    </>
  );
}
