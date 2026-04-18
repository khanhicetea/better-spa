import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
import { toast } from "sonner";
import * as z from "zod";
import { PagePending } from "@/components/common/page-pending";
import { PageTitle } from "@/components/common/page-title";
import { DataTablePagination } from "@/components/data-table/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { orpc } from "@/lib/orpc";
import {
  BanUserDialog,
  ChangePasswordDialog,
  CreateUserSheet,
} from "./-users/dialogs";
import { userColumns } from "./-users/columns";
import type { User } from "./-users/types";
import { UserActions } from "./-users/user-actions";

export const Route = createFileRoute("/admin/users")({
  component: UsersPage,
  pendingComponent: PagePending,
  validateSearch: z.object({
    page: z.number().int().positive().catch(1),
  }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ deps, context }) => {
    context.queryClient.prefetchQuery(
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
  const [userToBan, setUserToBan] = useState<User | null>(null);
  const [userToChangePassword, setUserToChangePassword] = useState<User | null>(
    null,
  );

  const {
    data: { users, pageCount, pageSize, totalCount },
    refetch: refetchUsers,
  } = useSuspenseQuery(
    orpc.user.list.queryOptions({
      input: { page },
    }),
  );

  const columns: ColumnDef<User>[] = [
    ...userColumns,
    {
      id: "actions",
      cell: ({ row }) => (
        <UserActions
          user={row.original}
          onBan={setUserToBan}
          onChangePassword={setUserToChangePassword}
          onUpdated={(message) => {
            refetchUsers();
            toast.success(message);
          }}
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
        <CreateUserSheet
          onSuccess={() => {
            refetchUsers();
            toast.success("User created");
          }}
        />
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
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
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
          onSuccess={() => {
            refetchUsers();
            toast.success(`User ${userToBan.email} has been banned`);
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
          onSuccess={() => {
            toast.success(
              `Password for ${userToChangePassword.email} has been changed`,
            );
          }}
        />
      )}
    </div>
  );
}
