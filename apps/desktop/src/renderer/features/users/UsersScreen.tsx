import { useCallback, useEffect, useMemo, useState } from "react";
import { KeyRound, Pencil, Plus, Search, Trash2 } from "lucide-react";
import clsx from "clsx";
import { Badge, Button, Card, Modal, Table, toneForStatus, type TableColumn } from "@muzammil-pos/ui";
import type { User } from "@muzammil-pos/types";
import { formatDate } from "@muzammil-pos/utils";
import { usersApi } from "../../services/users";
import { useAuthStore } from "../../store/authStore";
import { useToastStore } from "../../store/toastStore";
import { UserFormModal } from "./UserFormModal";
import { ChangePasswordModal } from "./ChangePasswordModal";

export function UsersScreen() {
  const currentUser = useAuthStore((s) => s.user);
  const push = useToastStore((s) => s.push);

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Which modal is open (only one at a time)
  const [formModal, setFormModal] = useState<{ user?: User } | null>(null);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setUsers(await usersApi.list());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load users.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
    );
  }, [users, search]);

  const activeCount = users.filter((u) => u.status === "ACTIVE").length;

  function replaceUser(updated: User) {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  }

  function handleSaved(saved: User, mode: "create" | "edit") {
    if (mode === "create") {
      setUsers((prev) => [saved, ...prev]);
      push("success", `User "${saved.username}" was added.`);
    } else {
      replaceUser(saved);
      push("success", `User "${saved.username}" was updated.`);
    }
    setFormModal(null);
  }

  async function handleToggleStatus(user: User) {
    const next = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setBusyId(user.id);
    try {
      const updated = await usersApi.setStatus(user.id, next);
      replaceUser(updated);
      push("success", `"${user.username}" is now ${next === "ACTIVE" ? "active" : "inactive"}.`);
    } catch (err) {
      push("error", err instanceof Error ? err.message : "Could not change status.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await usersApi.remove(deleteTarget.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      push("success", `User "${deleteTarget.username}" was deleted.`);
      setDeleteTarget(null);
    } catch (err) {
      // e.g. user has sales/expenses, or is the last admin — server message explains.
      push("error", err instanceof Error ? err.message : "Could not delete user.");
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }

  const columns: TableColumn<User>[] = [
    {
      header: "User",
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-light text-xs font-semibold text-brand">
            {u.fullName
              .split(" ")
              .map((p) => p[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {u.fullName}
              {u.id === currentUser?.id && (
                <span className="ml-2 text-xs font-normal text-gray-400">(you)</span>
              )}
            </p>
            <p className="text-xs text-gray-400">{u.username}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Role",
      render: (u) => <Badge tone={u.role === "ADMIN" ? "brand" : "neutral"}>{u.role === "ADMIN" ? "Admin" : "Cashier"}</Badge>,
    },
    {
      header: "Status",
      render: (u) => (
        <Badge tone={toneForStatus(u.status)}>{u.status === "ACTIVE" ? "Active" : "Inactive"}</Badge>
      ),
    },
    {
      header: "Created",
      render: (u) => <span className="text-gray-500">{formatDate(u.createdAt)}</span>,
    },
    {
      header: "Actions",
      className: "text-right",
      render: (u) => {
        const isSelf = u.id === currentUser?.id;
        const isActive = u.status === "ACTIVE";
        return (
          <div className="flex items-center justify-end gap-1">
            <button
              role="switch"
              aria-checked={isActive}
              aria-label={isActive ? "Deactivate user" : "Activate user"}
              title={isSelf ? "You cannot deactivate your own account" : isActive ? "Deactivate" : "Activate"}
              disabled={isSelf || busyId === u.id}
              onClick={() => handleToggleStatus(u)}
              className={clsx(
                "relative mr-2 h-5 w-9 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                isActive ? "bg-success" : "bg-gray-300"
              )}
            >
              <span
                className={clsx(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
                  isActive ? "left-[18px]" : "left-0.5"
                )}
              />
            </button>

            <IconButton label="Edit user" onClick={() => setFormModal({ user: u })}>
              <Pencil size={15} />
            </IconButton>
            <IconButton label="Change password" onClick={() => setPasswordUser(u)}>
              <KeyRound size={15} />
            </IconButton>
            <IconButton
              label={isSelf ? "You cannot delete your own account" : "Delete user"}
              disabled={isSelf}
              danger
              onClick={() => setDeleteTarget(u)}
            >
              <Trash2 size={15} />
            </IconButton>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-title text-gray-900">Users & access</h2>
          <p className="text-sm text-gray-400">
            Manage staff accounts, roles and status
            {!isLoading && !loadError && ` · ${users.length} users, ${activeCount} active`}
          </p>
        </div>
        <Button onClick={() => setFormModal({})}>
          <Plus size={16} />
          Add user
        </Button>
      </div>

      <Card className="p-0">
        <div className="border-b border-gray-100 p-4">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, username or role…"
              className="w-full rounded-control border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
        </div>

        {loadError ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-sm text-danger">{loadError}</p>
            <Button variant="secondary" size="sm" onClick={loadUsers}>
              Try again
            </Button>
          </div>
        ) : (
          <Table
            columns={columns}
            data={filteredUsers}
            keyExtractor={(u) => u.id}
            isLoading={isLoading}
            emptyMessage={search ? "No users match your search." : "No users yet."}
          />
        )}
      </Card>

      {/* Add / Edit */}
      {formModal && (
        <UserFormModal
          key={formModal.user?.id ?? "new"}
          user={formModal.user}
          onClose={() => setFormModal(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Change password */}
      {passwordUser && (
        <ChangePasswordModal
          key={passwordUser.id}
          user={passwordUser}
          onClose={() => setPasswordUser(null)}
          onChanged={(u) => {
            push("success", `Password updated for "${u.username}".`);
            setPasswordUser(null);
          }}
        />
      )}

      {/* Delete confirmation */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        title="Delete user?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmDelete} isLoading={isDeleting}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Permanently delete <span className="font-semibold">{deleteTarget?.fullName}</span> (
          {deleteTarget?.username})? This cannot be undone.
        </p>
        <p className="mt-2 text-xs text-gray-400">
          If this user already has sales or expense records, deletion is blocked — deactivate them instead.
        </p>
      </Modal>
    </div>
  );
}

function IconButton({
  children,
  label,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "rounded-control p-2 text-gray-400 transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        danger ? "hover:bg-danger-light hover:text-danger" : "hover:bg-gray-100 hover:text-gray-700"
      )}
    >
      {children}
    </button>
  );
}