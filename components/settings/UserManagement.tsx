'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { UserPlus } from 'lucide-react';

type Role = 'ADMIN' | 'OFFICE_MANAGER' | 'BILLER' | 'PROVIDER';

interface UserRow {
  id:        string;
  name:      string | null;
  email:     string;
  role:      Role;
  isActive:  boolean;
  createdAt: string;
}

const roleBadgeClass: Record<Role, string> = {
  ADMIN:          'bg-purple-100 text-purple-700',
  OFFICE_MANAGER: 'bg-blue-100 text-blue-700',
  BILLER:         'bg-green-100 text-green-700',
  PROVIDER:       'bg-amber-100 text-amber-700',
};

const ROLES: Role[] = ['ADMIN', 'OFFICE_MANAGER', 'BILLER', 'PROVIDER'];

const ROLE_LABELS: Record<Role, string> = {
  ADMIN:          'Admin',
  OFFICE_MANAGER: 'Office Manager',
  BILLER:         'Biller',
  PROVIDER:       'Provider',
};

const emptyCreate = { name: '', email: '', password: '', role: 'BILLER' as Role };

export default function UserManagement({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers]     = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit role modal
  const [editing, setEditing]           = useState<UserRow | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>('BILLER');
  const [editError, setEditError]       = useState('');
  const [saving, setSaving]             = useState(false);

  // Create user modal
  const [showCreate, setShowCreate]   = useState(false);
  const [createForm, setCreateForm]   = useState(emptyCreate);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating]       = useState(false);

  async function fetchUsers() {
    const res = await fetch('/api/users');
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchUsers(); }, []);

  // ── Edit role ────────────────────────────────────────────────────────────
  function openEdit(user: UserRow) {
    setEditing(user);
    setSelectedRole(user.role);
    setEditError('');
  }

  async function saveRole() {
    if (!editing) return;
    setSaving(true);
    setEditError('');
    const res = await fetch(`/api/users/${editing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: selectedRole }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setEditError(data.error || 'Failed to save');
      return;
    }
    setEditing(null);
    fetchUsers();
  }

  // ── Deactivate / Activate ─────────────────────────────────────────────
  async function toggleActive(user: UserRow) {
    if (user.id === currentUserId) return;
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    if (res.ok) fetchUsers();
  }

  // ── Create user ───────────────────────────────────────────────────────
  function openCreate() {
    setCreateForm(emptyCreate);
    setCreateError('');
    setShowCreate(true);
  }

  async function submitCreate() {
    setCreating(true);
    setCreateError('');
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createForm),
    });
    setCreating(false);
    if (!res.ok) {
      const data = await res.json();
      setCreateError(data.error || 'Failed to create account');
      return;
    }
    setShowCreate(false);
    fetchUsers();
  }

  function setField(field: keyof typeof emptyCreate, value: string) {
    setCreateForm(prev => ({ ...prev, [field]: value }));
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">User Management</CardTitle>
          <Button
            size="sm"
            onClick={openCreate}
            style={{ backgroundColor: '#5B3FD4' }}
            className="text-white gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            Create Account
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-4 text-sm text-gray-500">Loading users…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {user.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadgeClass[user.role]}`}>
                          {ROLE_LABELS[user.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {user.isActive
                          ? <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
                          : <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Deactivated</Badge>
                        }
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {format(new Date(user.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(user)}>
                            Edit Role
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={user.id === currentUserId}
                            className={user.isActive
                              ? 'text-red-600 border-red-200 hover:bg-red-50'
                              : 'text-green-600 border-green-200 hover:bg-green-50'
                            }
                            onClick={() => toggleActive(user)}
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Edit Role Modal ─────────────────────────────────────────────── */}
      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-500">{editing?.email}</p>
            <Select value={selectedRole} onValueChange={v => setSelectedRole(v as Role)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map(r => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {editError && <p className="text-sm text-red-600">{editError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveRole} disabled={saving} style={{ backgroundColor: '#5B3FD4' }} className="text-white">
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Create Account Modal ─────────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Employee Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="create-name">Full Name <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Input
                id="create-name"
                placeholder="Jane Smith"
                value={createForm.name}
                onChange={e => setField('name', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-email">Email <span className="text-red-500">*</span></Label>
              <Input
                id="create-email"
                type="email"
                placeholder="jane@yourpractice.com"
                value={createForm.email}
                onChange={e => setField('email', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-password">Temporary Password <span className="text-red-500">*</span></Label>
              <Input
                id="create-password"
                type="password"
                placeholder="Min. 8 characters"
                value={createForm.password}
                onChange={e => setField('password', e.target.value)}
              />
              <p className="text-xs text-gray-400">The employee should change this after their first login.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Role <span className="text-red-500">*</span></Label>
              <Select value={createForm.role ?? ''} onValueChange={v => setField('role', v as string)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => (
                    <SelectItem key={r} value={r}>
                      <div>
                        <span className="font-medium">{ROLE_LABELS[r]}</span>
                        <span className="ml-2 text-xs text-gray-400">
                          {r === 'ADMIN'          && '— Full access'}
                          {r === 'OFFICE_MANAGER' && '— Reports + claims'}
                          {r === 'BILLER'         && '— Create & edit claims'}
                          {r === 'PROVIDER'       && '— Read-only patient view'}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {createError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {createError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button
              onClick={submitCreate}
              disabled={creating || !createForm.email || !createForm.password || !createForm.role}
              style={{ backgroundColor: '#5B3FD4' }}
              className="text-white"
            >
              {creating ? 'Creating…' : 'Create Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
