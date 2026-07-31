import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { BanIcon, FlagIcon, KeyIcon, UserSearchIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import * as z from "zod";
import {
  BanUserDialog,
  ChangePasswordDialog,
  CreateUserSheet,
} from "@/components/admin/users/dialogs";
import { DataTablePagination } from "@/components/data-table/pagination";
import { PagePending } from "@/components/shell/page-pending";
import { PageTitle } from "@/components/shell/page-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type AdminUser, invalidateAdminUsers } from "@/lib/admin-users";
import { orpc } from "@/lib/orpc";
import { invalidateBootstrap } from "@/lib/queries";

export const Route = createFileRoute("/admin/users")({
  component: UsersPage,
  pendingComponent: PagePending,
  validateSearch: z.object({
    page: z.number().int().positive().catch(1),
  }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ deps, context }) => {
    await context.queryClient.ensureQueryData(
      orpc.user.list.queryOptions({
        input: { page: deps.page },
      }),
    );

    return { page: deps.page };
  },
});

function UsersPage() {
  const page = Route.useSearch({ select: (search) => search.page as number });
  const navigate = Route.useNavigate();
  const [rowSelection, setRowSelection] = useState({});
  const [userToBan, setUserToBan] = useState<AdminUser | null>(null);
  const [userToChangePassword, setUserToChangePassword] = useState<AdminUser | null>(null);

  const {
    data: { users, pageCount, pageSize, totalCount },
  } = useSuspenseQuery(
    orpc.user.list.queryOptions({
      input: { page },
    }),
  );

  const columns: ColumnDef<AdminUser>[] = [
    ...userColumns,
    {
      id: "actions",
      cell: ({ row }) => (
        <UserActions
          user={row.original}
          onBan={setUserToBan}
          onChangePassword={setUserToChangePassword}
        />
      ),
    },
  ];

  const table = useReactTable({
    data: users || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onRowSelectionChange: setRowSelection,
    state: { rowSelection },
  });

  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center justify-between">
        <PageTitle title="Users" description="Manage user accounts" />
        <CreateUserSheet />
      </div>

      <div className="space-y-4">
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination
          currentPage={page}
          pageCount={pageCount}
          totalCount={totalCount}
          pageSize={pageSize}
          itemsCount={users.length}
          onPageChange={(nextPage) => navigate({ search: { page: nextPage } })}
        />
      </div>

      {userToBan && (
        <BanUserDialog
          user={userToBan}
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setUserToBan(null);
            }
          }}
        />
      )}

      {userToChangePassword && (
        <ChangePasswordDialog
          user={userToChangePassword}
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              setUserToChangePassword(null);
            }
          }}
        />
      )}
    </div>
  );
}

const userColumns: ColumnDef<AdminUser>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={!table.getIsAllPageRowsSelected() && table.getIsSomePageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <div className="capitalize">{row.getValue("name")}</div>,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => <div className="lowercase">{row.getValue("email")}</div>,
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => (
      <Badge className="capitalize" variant="outline">
        {row.getValue("role")}
      </Badge>
    ),
  },
];

interface UserActionsProps {
  user: AdminUser;
  onBan: (user: AdminUser) => void;
  onChangePassword: (user: AdminUser) => void;
}

function UserActions({ user, onBan, onChangePassword }: UserActionsProps) {
  const queryClient = useQueryClient();
  const unban = useMutation(
    orpc.user.unban.mutationOptions({
      onSuccess: async () => {
        await invalidateAdminUsers(queryClient);
        toast.success(`User ${user.email} has been unbanned`);
      },
      onError: (error) => toast.error(error.message),
    }),
  );
  const impersonate = useMutation(
    orpc.user.impersonate.mutationOptions({
      onSuccess: async () => {
        await invalidateBootstrap(queryClient);
        window.location.assign("/app");
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <div className="flex flex-row justify-end space-x-2">
      {user.banned ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => unban.mutate({ userId: user.id })}
          disabled={unban.isPending}
        >
          <FlagIcon />
          Unban
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={() => onBan(user)}>
          <BanIcon />
          Ban
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={() => onChangePassword(user)}>
        <KeyIcon />
        Password
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => impersonate.mutate({ userId: user.id })}
        disabled={impersonate.isPending}
      >
        <UserSearchIcon />
      </Button>
    </div>
  );
}
