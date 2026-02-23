'use client';

import { useEffect, useState } from 'react';
import { useAccount, useAccounts } from '@luno-kit/react';
import { Wallet } from 'lucide-react';
import { WalletConnect } from './WalletConnect';
import { WalletInfo } from './WalletInfo';
import Modal, { useModal } from '@/components/Modal';

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
  const { accounts } = useAccounts();
  const [showModal, setShowModal] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formRole, setFormRole] = useState<'student' | 'teacher'>('student');
  const [saving, setSaving] = useState(false);
  const { modalState, showModal: showErrorModal, hideModal } = useModal();

  // Fetch profile when address changes
  useEffect(() => {
    let abort = false;
    async function fetchProfile(wallet: string) {
      setLoadingProfile(true);
      try {
        const res = await fetch(`/api/users?wallet_address=${encodeURIComponent(wallet)}`);
        if (res.ok) {
          const data = await res.json();
          const user = data?.user || null;
          if (!abort) {
            if (user) {
              setProfile(user);
              setFormDisplayName(user?.display_name || '');
              setFormRole(roleToLabel(user?.role));
            } else {
              setProfile(null);
              setFormDisplayName('');
              setFormRole('student');
            }
          }
        }
      } catch (err) {
        console.error('Fetch profile failed', err);
        if (!abort) {
          setProfile(null);
          setFormDisplayName('');
          setFormRole('student');
        }
      } finally {
        if (!abort) setLoadingProfile(false);
      }
    }

    if (address) {
      fetchProfile(address);
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
          accounts={accounts}
          displayName={profile?.display_name || undefined}
          role={roleToLabel(profile?.role)}
          onConnect={onConnect}
          onEditProfile={() => setEditing(true)}
          className={className}
        />

        {editing && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-[#0f1117] border border-[#1f2430] rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-slideUp">
              <div className="flex items-center justify-between pb-4 border-b border-[#1f2430]">
                <div>
                  <h3 className="text-lg font-semibold text-[#e5e7eb]">Edit Profile</h3>
                  <p className="text-xs text-[#9ca3af] mt-0.5 break-all">{address}</p>
                </div>
                {loadingProfile && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#e6007a]"></div>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#e5e7eb]">Display Name</label>
                  <input
                    className="w-full bg-[#11131a] border border-[#1f2430] rounded-lg px-4 py-2.5 text-[#e5e7eb] placeholder-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#e6007a] focus:border-transparent transition-all"
                    placeholder="How should we call you?"
                    value={formDisplayName}
                    onChange={(e) => setFormDisplayName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#e5e7eb]">Role</label>
                  <select
                    className="w-full bg-[#11131a] border border-[#1f2430] rounded-lg px-4 py-2.5 text-[#e5e7eb] focus:outline-none focus:ring-2 focus:ring-[#e6007a] focus:border-transparent transition-all"
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as 'student' | 'teacher')}
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#1f2430]">
                <button
                  className="px-4 py-2 text-sm text-[#9ca3af] hover:text-[#e5e7eb] hover:bg-[#1a1d26] rounded-lg transition-all"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 text-sm bg-[#e6007a] text-white rounded-lg hover:bg-[#cc006c] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
                      showErrorModal(err instanceof Error ? err.message : 'Unable to save information', {
                        type: 'error',
                        title: 'Error'
                      });
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>
          </div>
        )}

        <Modal
          isOpen={modalState.isOpen}
          onClose={hideModal}
          message={modalState.message}
          title={modalState.title}
          type={modalState.type}
          confirmText={modalState.confirmText}
          showCancel={modalState.showCancel}
          cancelText={modalState.cancelText}
          onConfirm={modalState.onConfirm}
        />
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`group flex items-center gap-2.5 bg-[#e6007a] hover:bg-[#cc006c] text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-sm hover:shadow-md ${className}`}
      >
        <Wallet className="w-5 h-5 group-hover:scale-110 transition-transform" />
        Connect Wallet
      </button>

      {showModal && (
        <WalletConnect
          onClose={() => setShowModal(false)}
          onConnect={onConnect}
        />
      )}

      <Modal
        isOpen={modalState.isOpen}
        onClose={hideModal}
        message={modalState.message}
        title={modalState.title}
        type={modalState.type}
        confirmText={modalState.confirmText}
        showCancel={modalState.showCancel}
        cancelText={modalState.cancelText}
        onConfirm={modalState.onConfirm}
      />
    </>
  );
}
