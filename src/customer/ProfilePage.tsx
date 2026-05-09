import React, { useEffect, useMemo, useState } from 'react';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserFromFirestore, updateUser, uploadUserAvatar } from '../services/firestoreService';
import { User as TUser } from '../types';
import { useNavigate, Link } from 'react-router-dom';
import { Camera, Check, AlertCircle } from 'lucide-react';
import './ProfilePage.css';

const ProfilePage: React.FC<{ onRequireAuth?: (redirectTo: string) => void }> = ({ onRequireAuth }) => {
  const [user, setUser] = useState<TUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Editable form state (must be declared unconditionally to obey React hook rules)
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
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Keep form in sync when user loads/refreshes.
  useEffect(() => {
    setForm(initialForm);
    setAvatarPreview(user?.avatar || null);
    setAvatarFile(null);
    setSavedMsg(null);
    setError(null);
    // Auto-expand "More details" if user already has optional info saved.
    setShowMore(Boolean(initialForm.dateOfBirth));
  }, [initialForm, user?.avatar]);

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
    // accept YYYY-MM-DD directly
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    // accept DD/MM/YYYY
    const m = v.match(/^([0-3]?\d)\/([0-1]?\d)\/(\d{4})$/);
    if (m) {
      const dd = m[1].padStart(2, '0');
      const mm = m[2].padStart(2, '0');
      const yyyy = m[3];
      return `${yyyy}-${mm}-${dd}`;
    }
    return v; // fallback store raw
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
      if (avatarFile) {
        try {
          const avatarUrl = await uploadUserAvatar(avatarFile, user.id);
          updatedFields.avatar = avatarUrl;
        } catch (uploadError) {
          console.error('Avatar upload failed', uploadError);
          setSavedMsg('Failed to upload avatar. Please try again.');
          setError(String(uploadError));
          return;
        }
      }

      await updateUser(user.id, updatedFields);
      setSavedMsg('Profile updated successfully!');
      // refresh local user object
      const refreshed = await getUserFromFirestore(user.id);
      if (refreshed) setUser(refreshed);
    } catch (e) {
      setSavedMsg('Failed to save profile');
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setAvatarFile(file);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="profile-header-card mb-8">
          <div>
            <h3 className="profile-page-title">Your Profile</h3>
            <p className="profile-page-subtitle">Update your account information and keep your profile current.</p>
          </div>
        </div>


        {/* Section 1: Basic Information */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-black text-white font-bold text-sm">1</span>
            Basic Information
          </h2>
          
          {/* Gender Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-900 mb-3">Gender (required)</label>
            <div className="flex gap-3 flex-wrap">
              {(['Male', 'Female', 'Other'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setForm({ ...form, gender: g })}
                  className={`px-6 py-3 rounded-full border-2 text-sm font-semibold transition-all transform hover:scale-105 ${
                    form.gender === g
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-indigo-600'
                      : 'bg-white text-gray-900 border-gray-300 hover:border-indigo-400'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">First Name</label>
              <input
                value={form.firstName}
                onChange={onChange('firstName')}
                placeholder="John"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Last Name</label>
              <input
                value={form.lastName}
                onChange={onChange('lastName')}
                placeholder="Doe"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Contact Information */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-8 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-black text-white font-bold text-sm">2</span>
            Contact Information
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Email Address</label>
              <input
                value={form.email}
                readOnly
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-600 outline-none cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-2">Email cannot be changed</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Mobile Number</label>
              <input
                value={form.phoneNumber}
                onChange={onChange('phoneNumber')}
                placeholder="+1 (555) 123-4567"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Additional Details (expandable) */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="w-full px-8 py-6 flex items-center justify-between hover:bg-gray-50 transition"
          >
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-black text-white font-bold text-sm">3</span>
              Additional Details
            </h2>
            <svg className={`w-6 h-6 text-indigo-600 transition-transform ${showMore ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>

          {showMore && (
            <div className="px-8 py-6 border-t border-gray-200 bg-gray-50">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Date of Birth</label>
                <input
                  value={form.dateOfBirth}
                  onChange={onChange('dateOfBirth')}
                  placeholder="YYYY-MM-DD or DD/MM/YYYY"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition"
                />
                <p className="text-xs text-gray-500 mt-2">Format: YYYY-MM-DD or DD/MM/YYYY</p>
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div className="mt-8 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {savedMsg && (
          <div className={`mt-8 border-l-4 p-4 rounded-lg flex items-start gap-3 ${
            savedMsg.includes('successfully')
              ? 'bg-emerald-50 border-emerald-500'
              : 'bg-red-50 border-red-500'
          }`}>
            {savedMsg.includes('successfully') ? (
              <Check className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <h3 className={`font-semibold ${savedMsg.includes('successfully') ? 'text-emerald-900' : 'text-red-900'}`}>
                {savedMsg.includes('successfully') ? 'Success' : 'Error'}
              </h3>
              <p className={`text-sm mt-1 ${savedMsg.includes('successfully') ? 'text-emerald-700' : 'text-red-700'}`}>
                {savedMsg}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="profile-actions">
          <button
            onClick={save}
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <Link
            to="/orders"
            className="btn btn-secondary"
          >
            Cancel
          </Link>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Your information is encrypted and secure. We never share your data with third parties.
        </p>
      </div>
    </div>
  );
};

export default ProfilePage;
