import React, { useState, useEffect } from "react";
import { getAllUsers, deleteUser } from "../services/firestoreService";
import { User, UserRole } from "../types";
import { formatUserId } from '../utils/formatIds';
import './UserManagement.css';
import { Trash2 } from 'lucide-react';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const fetchedUsers = await getAllUsers();
      setUsers(fetchedUsers);
    };
    fetchUsers();
  }, []);

  const handleDeleteUser = async (id: string) => {
    await deleteUser(id);
    setUsers(users.filter((u) => u.id !== id));
  };

  return (
    <div className="user-management-container">
      <div className="overflow-x-auto rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[2.5fr_2fr_1.5fr_1fr_1fr] gap-0 border-b border-slate-200 bg-slate-100 px-6 py-4 text-sm uppercase tracking-[0.24em] text-slate-600">
            <span>User</span>
            <span>User ID</span>
            <span>Email</span>
            <span>Role</span>
            <span className="text-right">Actions</span>
          </div>
          {users.map((user, idx) => (
            <div key={user.id} className={`grid grid-cols-[2.5fr_2fr_1.5fr_1fr_1fr] gap-0 px-6 py-4 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-slate-100 transition-colors`}> 
              <div className="flex items-center gap-3">
                <img className="h-10 w-10 rounded-full object-cover bg-slate-200" src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=111827&color=fff`} alt={user.name} />
                <div>
                  <div className="font-semibold text-slate-900">{user.name}</div>
                  <div className="text-xs text-slate-500">{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}</div>
                </div>
              </div>
              <div className="flex items-center text-slate-700">{formatUserId(idx)}</div>
              <div className="flex items-center text-slate-700">{user.email}</div>
              <div className="flex items-center">
                <span className={`inline-flex font-medium px-2.5 py-1 rounded-full text-xs ${user.role === UserRole.ADMIN ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-50 text-slate-700'}`}>{user.role}</span>
              </div>
              <div className="flex items-center justify-end gap-2">
                {user.role !== UserRole.ADMIN ? (
                  <button className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 hover:bg-rose-100 transition" title="Delete" onClick={() => handleDeleteUser(user.id)}>
                    <Trash2 size={16} />
                  </button>
                ) : (
                  <span className="text-sm text-slate-500">Protected</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
