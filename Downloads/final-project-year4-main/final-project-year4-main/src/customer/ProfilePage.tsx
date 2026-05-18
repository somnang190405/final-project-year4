import React, { useEffect, useMemo, useState } from 'react';
import { auth } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { getUserFromFirestore, updateUser, uploadUserAvatar } from '../services/firestoreService';
import { User as TUser } from '../types';
import { useNavigate } from 'react-router-dom';
import { Camera, Check, AlertCircle, UserCircle2 } from 'lucide-react';

const ProfilePage: React.FC<{ onRequireAuth?: (redirectTo: string) => void }> = ({ onRequireAuth }) => {
  const [user, setUser] = useState<TUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const navigate = useNavigate();

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

  useEffect(() => {
    setForm(initialForm);
    setAvatarPreview(user?.avatar || null);
    setAvatarFile(null);
    setSavedMsg(null);
    setError(null);
    setIsEditing(false);
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12">
        <div className="text-gray-600 text-center">Loading your profile…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12">
        <div className="max-w-md mx-auto text-center">
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <UserCircle2 className="w-12 h-12 text-gray-400" />
          </div>
          <h1 className="text-3xl font-semibold text-slate-900 mb-3">Profile Unavailable</h1>
          <p className="text-gray-600 mb-8">Sign in to manage your account details and keep your profile up to date.</p>
          <button
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5"
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

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.name || 'Customer';
  const formattedPhone = user.phoneNumber || 'Not added';
  const formattedDob = user.dateOfBirth || 'Not added';

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
      const refreshed = await getUserFromFirestore(user.id);
      if (refreshed) setUser(refreshed);
      setIsEditing(false);
    } catch (e) {
      setSavedMsg('Failed to save profile.');
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
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="rounded-[2rem] bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 p-8 shadow-2xl text-white mb-10 overflow-hidden">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.45em] text-indigo-300 mb-3">Profile Center</p>
              <h1 className="text-4xl font-semibold tracking-tight">Manage your account</h1>
              <p className="mt-3 max-w-2xl text-gray-300 leading-7">
                Keep your profile sleek and secure. Easily switch between previewing your information and editing the fields you want to update.
              </p>
            </div>
            <div className="rounded-3xl bg-white/10 border border-white/10 p-5 shadow-xl backdrop-blur-xl">
              <p className="text-sm text-slate-300">Member since</p>
              <p className="mt-2 text-2xl font-semibold">{new Date(user.createdAt || Date.now()).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[2rem] border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
                <div className="relative">
                  <div className="w-28 h-28 rounded-[2rem] bg-gradient-to-br from-indigo-700 to-slate-900 shadow-xl overflow-hidden">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-3xl">{fullName.charAt(0)}</div>
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-3 py-2 text-sm text-white shadow ring-1 ring-emerald-200">
                      <Check className="w-4 h-4" /> Verified
                    </span>
                  </div>
                </div>

                <div className="flex-1">
                  <p className="text-sm uppercase tracking-[0.3em] text-indigo-500 mb-2">Hello,</p>
                  <h2 className="text-3xl font-semibold text-slate-900">{fullName}</h2>
                  <p className="mt-2 text-gray-600">Welcome back. Your profile is ready to update with a clean, premium experience.</p>
                </div>
              </div>

              <div className="mt-10 grid gap-4">
                <div className="rounded-3xl bg-slate-50 p-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Email</p>
                    <p className="mt-2 text-base font-semibold text-slate-900">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Account type</p>
                    <p className="mt-2 text-base font-semibold text-slate-900">{user.role || 'Customer'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Phone</p>
                    <p className="mt-2 text-base font-semibold text-slate-900">{formattedPhone}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.32em] text-slate-500">Gender</p>
                    <p className="mt-2 text-base font-semibold text-slate-900">{form.gender || 'Not set'}</p>
                  </div>
                </div>

                <div className="rounded-3xl bg-white border border-gray-200 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm uppercase tracking-[0.3em] text-indigo-500">Profile activity</p>
                      <h3 className="mt-2 text-2xl font-semibold text-slate-900">Account overview</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50 transition"
                    >
                      Edit profile
                    </button>
                  </div>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl bg-slate-50 p-5">
                      <p className="text-sm text-slate-500">Date of birth</p>
                      <p className="mt-3 text-base font-medium text-slate-900">{formattedDob}</p>
                    </div>
                    <div className="rounded-3xl bg-slate-50 p-5">
                      <p className="text-sm text-slate-500">Last update</p>
                      <p className="mt-3 text-base font-medium text-slate-900">{new Date(user.updatedAt || Date.now()).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="p-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-indigo-500">Account settings</p>
                  <h2 className="mt-3 text-2xl font-semibold text-slate-900">{isEditing ? 'Edit profile information' : 'View profile details'}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditing((value) => !value)}
                  className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition"
                >
                  {isEditing ? 'Preview profile' : 'Edit profile'}
                </button>
              </div>

              {isEditing ? (
                <div className="mt-8 space-y-8">
                  <div className="grid gap-6">
                    <div className="rounded-3xl bg-slate-50 p-6 grid gap-6 sm:grid-cols-[auto_1fr]">
                      <div className="flex items-center justify-center">
                        <div className="relative">
                          <div className="w-28 h-28 rounded-[2rem] bg-slate-100 overflow-hidden border border-gray-200">
                            {avatarPreview ? (
                              <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400 text-4xl">+</div>
                            )}
                          </div>
                          <label className="absolute -bottom-2 -right-2 inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow ring-1 ring-slate-200 hover:bg-slate-100 transition">
                            <Camera className="w-4 h-4" />
                            Change
                            <input type="file" accept="image/*" hidden onChange={handleAvatarChange} />
                          </label>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <p className="text-sm text-slate-500">Upload a new avatar to personalize your profile card.</p>
                        <p className="text-sm text-slate-500">Supported formats: JPG, PNG, WEBP.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-sm font-semibold text-slate-900">First name</span>
                          <input
                            value={form.firstName}
                            onChange={onChange('firstName')}
                            placeholder="John"
                            className="w-full rounded-3xl border border-gray-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-semibold text-slate-900">Last name</span>
                          <input
                            value={form.lastName}
                            onChange={onChange('lastName')}
                            placeholder="Doe"
                            className="w-full rounded-3xl border border-gray-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                          />
                        </label>
                      </div>

                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-slate-900">Gender</span>
                        <select
                          value={form.gender}
                          onChange={onChange('gender')}
                          className="w-full rounded-3xl border border-gray-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                        >
                          <option value="">Select gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </label>

                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-slate-900">Phone number</span>
                        <input
                          value={form.phoneNumber}
                          onChange={onChange('phoneNumber')}
                          placeholder="+1 (555) 123-4567"
                          className="w-full rounded-3xl border border-gray-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-slate-900">Date of birth</span>
                        <input
                          value={form.dateOfBirth}
                          onChange={onChange('dateOfBirth')}
                          placeholder="YYYY-MM-DD"
                          className="w-full rounded-3xl border border-gray-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
                        />
                      </label>
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  {savedMsg && (
                    <div className={`rounded-3xl border p-5 text-sm ${savedMsg.includes('successfully') ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
                      {savedMsg}
                    </div>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={save}
                      disabled={saving}
                      className="inline-flex min-w-[10rem] items-center justify-center rounded-3xl bg-black px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? 'Saving changes…' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setForm(initialForm);
                        setAvatarPreview(user?.avatar || null);
                        setAvatarFile(null);
                        setError(null);
                        setSavedMsg(null);
                      }}
                      className="inline-flex min-w-[10rem] items-center justify-center rounded-3xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-8 space-y-6">
                  <div className="grid gap-4">
                    <div className="rounded-3xl bg-slate-50 p-5 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Contact details</p>
                        <p className="mt-1 text-sm text-slate-600">Email, phone, and date of birth.</p>
                      </div>
                      <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase text-indigo-700">Overview</span>
                    </div>

                    <div className="grid gap-4">
                      <div className="rounded-3xl bg-white p-5 border border-gray-200">
                        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Email address</p>
                        <p className="mt-3 text-base font-semibold text-slate-900">{form.email}</p>
                      </div>
                      <div className="rounded-3xl bg-white p-5 border border-gray-200">
                        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Phone number</p>
                        <p className="mt-3 text-base font-semibold text-slate-900">{formattedPhone}</p>
                      </div>
                      <div className="rounded-3xl bg-white p-5 border border-gray-200">
                        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Gender</p>
                        <p className="mt-3 text-base font-semibold text-slate-900">{form.gender || 'Not set'}</p>
                      </div>
                      <div className="rounded-3xl bg-white p-5 border border-gray-200">
                        <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Date of birth</p>
                        <p className="mt-3 text-base font-semibold text-slate-900">{formattedDob}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
