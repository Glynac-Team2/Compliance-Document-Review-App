import { useEffect, useState } from "react";
import { Users, UserCheck, UserX } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { Modal } from "../components/Modal";

export default function AdminDashboard() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const data = await api.listUsers();
        if (cancelled) return;
        setUsers(data);
        setError("");
      } catch (err) {
        if (cancelled) return;
        setError(err.message || "Failed to load users.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (formValues) => {
    const diff = {};
    if (formValues.name !== editingUser.name) diff.name = formValues.name;
    if (formValues.email !== editingUser.email) diff.email = formValues.email;
    if (formValues.role !== editingUser.role) diff.role = formValues.role;
    if (formValues.isActive !== editingUser.is_active)
      diff.isActive = formValues.isActive;
    if (formValues.password) diff.password = formValues.password;

    if (Object.keys(diff).length === 0) {
      setEditingUser(null);
      return;
    }

    try {
      setSaving(true);
      setSaveError("");
      const updated = await api.updateUser(editingUser.id, diff);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setEditingUser(null);
    } catch (err) {
      setSaveError(err.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  const activeCount = users.filter((u) => u.is_active).length;
  const inactiveCount = users.filter((u) => !u.is_active).length;

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      {/* Metric Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Users
            </p>
            <h3 className="text-3xl font-extrabold text-slate-900">
              {users.length}
            </h3>
          </div>
          <div className="p-3.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Active
            </p>
            <h3 className="text-3xl font-extrabold text-emerald-600">
              {activeCount}
            </h3>
          </div>
          <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-600">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Inactive
            </p>
            <h3 className="text-3xl font-extrabold text-slate-400">
              {inactiveCount}
            </h3>
          </div>
          <div className="p-3.5 bg-slate-100 border border-slate-200 rounded-2xl text-slate-500">
            <UserX className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Users Table Card */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Users</h2>
          <p className="text-xs text-slate-500">
            Manage accounts, roles, and access.
          </p>
        </div>

        {loading && <p className="text-sm text-slate-400">Loading users…</p>}
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        {!loading && !error && (
          <div className="space-y-3">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between p-4 bg-slate-50/60 hover:bg-slate-50 border border-slate-200/60 rounded-xl transition-all"
              >
                <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                  <div className="min-w-0 w-40 flex-shrink-0">
                    <h4 className="text-sm font-bold text-slate-800 truncate">
                      {u.name}
                    </h4>
                    <p className="text-xs text-slate-400 truncate">{u.email}</p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg capitalize flex-shrink-0">
                    {u.role}
                  </span>
                </div>

                <div className="flex items-center space-x-4 flex-shrink-0">
                  <span
                    className={
                      u.is_active
                        ? "text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg"
                        : "text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg"
                    }
                  >
                    {u.is_active ? "Active" : "Inactive"}
                  </span>
                  <button
                    onClick={() => setEditingUser(u)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)}>
        {editingUser && (
          <EditUserForm
            user={editingUser}
            isSelf={editingUser.id === currentUser.id}
            saving={saving}
            error={saveError}
            onCancel={() => setEditingUser(null)}
            onSave={handleSave}
          />
        )}
      </Modal>
    </main>
  );
}

function EditUserForm({ user, isSelf, saving, error, onCancel, onSave }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const [isActive, setIsActive] = useState(user.is_active);
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ name, email, role, isActive, password });
  };

  return (
    <form onSubmit={handleSubmit} className="p-8 space-y-5">
      <h2 className="text-xl font-bold text-slate-900">Edit user</h2>

      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
          Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-indigo-600"
        />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
          Email
        </label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-indigo-600"
        />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
          New password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Leave blank to keep current"
          className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-600"
        />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
          Role
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          disabled={isSelf}
          className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 outline-none focus:border-indigo-600 disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="advisor">Advisor</option>
          <option value="officer">Officer</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          disabled={isSelf}
        />
        Active
      </label>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
