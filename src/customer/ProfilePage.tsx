import React, { useEffect, useMemo, useState } from 'react';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserFromFirestore, updateUser } from '../services/firestoreService';
import { User as TUser } from '../types';
import { useNavigate, Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { formatUserIdFromUid } from '../utils/formatIds';
import './ProfilePage.css';

const ProfilePage: React.FC<{ onRequireAuth?: (redirectTo: string) => void }> = ({ onRequireAuth }) => {
  const [user, setUser] = useState<TUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);

  // Editable form state
  const initialForm = useMemo(() => {
    const u = user;
    return {
      gender: (u?.gender as 'Male' | 'Female' | 'Other') || undefined,
      firstName: u?.firstName || '',
      lastName: u?.lastName || '',
      email: u?.email || '',
      phoneNumber: u?.phoneNumber || '',
      dateOfBirth: u?.dateOfBirth || '',
    };
  }, [user]);

  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm(initialForm);
    setSavedMsg(null);
    setError(null);
    setShowMore(Boolean(initialForm.dateOfBirth));
  }, [initialForm]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const u = await getUserFromFirestore(fbUser.uid);
        setUser(u);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      try { unsubAuth(); } catch {}
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12">
        <div className="text-gray-600 text-center">Loading your profile…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12">
        <div className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Profile</h1>
          <p className="text-gray-600 mb-8">You need to sign in to view your profile.</p>
          <button
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:shadow-xl transition-all transform hover:scale-105"
            onClick={() => {
              if (onRequireAuth) onRequireAuth('/profile');
              else navigate('/');
            }}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const onChange = (field: keyof typeof initialForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [field]: e.target.value });
  };

  const parseDobToISO = (input: string) => {
    const v = input.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    const m = v.match(/^([0-3]?\d)\/([0-1]?\d)\/(\d{4})$/);
    if (m) {
      const dd = m[1].padStart(2, '0');
      const mm = m[2].padStart(2, '0');
      const yyyy = m[3];
      return `${yyyy}-${mm}-${dd}`;
    }
    return v;
  };

  const save = async () => {
    if (!user) return;
    setError(null);
    if (!form.gender) {
      setError('Please select gender.');
      return;
    }
    setSaving(true);
    try {
      const updatedFields: any = {
        name: [form.firstName, form.lastName].filter(Boolean).join(' ').trim() || user.name,
        firstName: form.firstName,
        lastName: form.lastName,
        gender: (form.gender as any) || 'Other',
        phoneNumber: form.phoneNumber,
        dateOfBirth: parseDobToISO(form.dateOfBirth),
      };

      await updateUser(user.id, updatedFields);
      setSavedMsg('Profile updated successfully!');
      const refreshed = await getUserFromFirestore(user.id);
      if (refreshed) setUser(refreshed);
      setIsEditing(false);
    } catch (e) {
      setSavedMsg('Failed to save profile');
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="profile-header-card mb-8 flex items-center justify-between">
          <div>
            <h3 className="profile-page-title">Your Profile</h3>
            <p className="profile-page-subtitle">Update your account information and keep your profile current.</p>
          </div>
          <div className="flex items-center gap-3">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
              >
                Edit Profile
              </button>
            ) : (
              <button
                onClick={() => { setIsEditing(false); setForm(initialForm); }}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 font-semibold hover:bg-gray-200 transition"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Avatar & Summary Card */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
              <div>
                <div className="text-sm uppercase tracking-[0.24em] text-indigo-600 font-semibold mb-2">Profile Details</div>
                <h4 className="text-2xl font-semibold text-gray-900">{user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()}</h4>
                <p className="text-sm text-gray-500 mt-2">{user.email}</p>
              </div>

              <div className="rounded-3xl bg-slate-50 p-5 space-y-3 text-sm text-slate-700">
                <div className="flex justify-between gap-4">
                  <span className="font-semibold text-slate-900">User ID</span>
                  <span>{formatUserIdFromUid(user.id)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="font-semibold text-slate-900">Role</span>
                  <span>{user.role}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="font-semibold text-slate-900">Status</span>
                  <span>Active</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Right: Form or View */}
          <section className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm transition-all">
              {/* Row: Name / Gender */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 items-center">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Full Name</label>
                  {!isEditing ? (
                    <div className="text-gray-700">{user.name || `${user.firstName || ''} ${user.lastName || ''}`}</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        value={form.firstName}
                        onChange={onChange('firstName')}
                        placeholder="First"
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                      />
                      <input
                        value={form.lastName}
                        onChange={onChange('lastName')}
                        placeholder="Last"
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Gender</label>
                  {!isEditing ? (
                    <div className="text-gray-700">{user.gender || '—'}</div>
                  ) : (
                    <select value={form.gender} onChange={onChange('gender')} className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white outline-none">
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Contact Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Email</label>
                  <div className="text-gray-700">{user.email}</div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Mobile</label>
                  {!isEditing ? (
                    <div className="text-gray-700">{user.phoneNumber || '—'}</div>
                  ) : (
                    <input value={form.phoneNumber} onChange={onChange('phoneNumber')} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition" />
                  )}
                </div>
              </div>

              {/* Additional */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-2">Date of Birth</label>
                {!isEditing ? (
                  <div className="text-gray-700">{user.dateOfBirth || '—'}</div>
                ) : (
                  <input value={form.dateOfBirth} onChange={onChange('dateOfBirth')} placeholder="YYYY-MM-DD" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition" />
                )}
              </div>

              {error && (
                <div className="mt-2 text-sm text-red-600">{error}</div>
              )}

              {savedMsg && (
                <div className={`mt-4 p-4 rounded-lg ${savedMsg.includes('successfully') ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="text-sm">{savedMsg}</div>
                </div>
              )}

              <div className="mt-6 flex items-center gap-3">
                {!isEditing ? (
                  <Link to="/orders" className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 font-semibold hover:bg-gray-200 transition">View Orders</Link>
                ) : (
                  <>
                    <button onClick={save} disabled={saving} className="px-5 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:brightness-95 transition">
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button onClick={() => { setIsEditing(false); setForm(initialForm); }} className="px-5 py-3 rounded-lg bg-gray-100 text-gray-800 font-semibold hover:bg-gray-200 transition">Cancel</button>
                  </>
                )}
              </div>

            </div>
          </section>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Your information is encrypted and secure. We never share your data with third parties.
        </p>
      </div>
    </div>
  );
};

export default ProfilePage;
