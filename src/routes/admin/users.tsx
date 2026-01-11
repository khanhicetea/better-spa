import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { UserWithRole } from "better-auth/plugins";
import {
  BanIcon,
  CopyIcon,
  Dice2Icon,
  EyeIcon,
  EyeOff,
  FlagIcon,
  KeyIcon,
  PlusCircle,
  Trash2Icon,
  UserSearchIcon,
} from "lucide-react";
import { type ReactElement, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import { PagePending } from "@/components/common/page-pending";
import { PageTitle } from "@/components/common/page-title";
import { DataTablePagination } from "@/components/data-table/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import authClient from "@/lib/auth/auth-client";
import { orpc } from "@/lib/orpc";
import type { Outputs } from "@/rpc/types";
export type User = Outputs["user"]["listUsers"]["users"][number];

export const Route = createFileRoute("/admin/users")({
  component: UsersPage,
  pendingComponent: PagePending,
  validateSearch: z.object({
    page: z.number().int().positive().catch(1),
  }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ deps, context }) => {
    context.queryClient.prefetchQuery(
      orpc.user.listUsers.queryOptions({
        input: { page: deps.page },
      }),
    );

    return { page: deps.page };
  },
});

function UsersPage() {
  const page = Route.useSearch({ select: (s) => s.page as number });
  const {
    data: { users, pageCount, pageSize, totalCount },
    refetch: refetchUsers,
  } = useSuspenseQuery(
    orpc.user.listUsers.queryOptions({
      input: { page },
    }),
  );
  const navigate = Route.useNavigate();
  const [rowSelection, setRowSelection] = useState({});
  const [userToBan, setUserToBan] = useState<User | null>(null);
  const [userToChangePassword, setUserToChangePassword] = useState<User | null>(
    null,
  );

  const actionsColumns: ColumnDef<User>[] = [
    {
      id: "actions",
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex flex-row space-x-2 justify-end">
            {user.banned ? (
              <UnbanUserButton
                user={user}
                onSuccess={() => {
                  refetchUsers();
                  toast.success(`User ${user.email} has been unbanned`);
                }}
              />
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setUserToBan(user);
                }}
              >
                <BanIcon />
                Ban
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setUserToChangePassword(user);
              }}
            >
              <KeyIcon />
              Password
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const res = await authClient.admin.impersonateUser({
                  userId: user.id,
                });

                if (res.error === null) {
                  return navigate({ to: "/app", reloadDocument: true });
                }

                toast.error(res.error.message);
              }}
            >
              <UserSearchIcon />
            </Button>
            <Button variant="destructive" size="sm">
              <Trash2Icon />
            </Button>
          </div>
        );
      },
    },
  ];

  const tableColumns = [...columns, ...actionsColumns];

  const table = useReactTable({
    data: users || [],
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
  });

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-4">
        <div className="flex flex-row justify-between items-center">
          <PageTitle title="Users" description="Manage user accounts" />
          <CreateUserForm
            trigger={
              <Button>
                <PlusCircle className="size-4" />
                <span>Add User</span>
              </Button>
            }
            onSuccess={() => {
              refetchUsers();
            }}
          />
        </div>
        <div className="space-y-4">
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
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
            onPageChange={(page) => navigate({ search: { page } })}
          />
        </div>
      </div>
      {userToBan && (
        <BanUserForm
          key={userToBan.id}
          user={userToBan}
          onOpenChange={(v) => v || setUserToBan(null)}
          onSuccess={() => {
            refetchUsers();
            toast.success(`User ${userToBan.email} has been banned !`);
          }}
        />
      )}
      {userToChangePassword && (
        <ChangePasswordForm
          key={userToChangePassword.id}
          user={userToChangePassword}
          onOpenChange={(v) => v || setUserToChangePassword(null)}
          onSuccess={() => {
            toast.success(
              `Password for user ${userToChangePassword.email} has been changed`,
            );
          }}
        />
      )}
    </div>
  );
}

export const columns: ColumnDef<User>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
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
      <Badge className="capitalize">{row.getValue("role")}</Badge>
    ),
  },
];

function UnbanUserButton({
  user,
  onSuccess,
}: {
  user: User;
  onSuccess: () => void;
}) {
  const [isUnbanningUser, setIsUnbanningUser] = useState(false);

  const handleUnban = async () => {
    setIsUnbanningUser(true);
    const res = await authClient.admin.unbanUser({
      userId: user.id,
    });
    if (res.error === null) {
      onSuccess();
    } else {
      setIsUnbanningUser(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleUnban}
      disabled={isUnbanningUser}
    >
      <FlagIcon /> Unban
    </Button>
  );
}

function BanUserForm({
  user,
  onOpenChange,
  onSuccess,
}: {
  user: User;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const form = useForm<{ banReason: string; banExpire: string | undefined }>({
    defaultValues: {
      banReason: "",
      banExpire: undefined,
    },
  });

  const banMutation = useMutation({
    mutationFn: async (data: {
      banReason: string;
      banExpire: string | undefined;
    }) => {
      const res = await authClient.admin.banUser({
        userId: user.id,
        banReason: data.banReason,
        banExpiresIn: data.banExpire
          ? Math.floor(
              (new Date(`${data.banExpire}:00`).getTime() - Date.now()) / 1000,
            )
          : undefined,
      });

      if (res.error) {
        throw new Error(res.error.message);
      }
    },
    onSuccess: () => {
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Banning user '{user.email}'</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(async (data) => {
              await banMutation.mutateAsync(data);
            })}
          >
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="banReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ban Reason</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter ban reason" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="banExpire"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ban Expiration</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div>
                <Button
                  disabled={banMutation.isPending}
                  type="submit"
                  variant="destructive"
                >
                  Ban User
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ChangePasswordForm({
  user,
  onOpenChange,
  onSuccess,
}: {
  user: User;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<{ newPassword: string }>({
    defaultValues: {
      newPassword: "",
    },
  });

  const generateRandomPassword = () => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    form.setValue("newPassword", result);
  };

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { newPassword: string }) => {
      const res = await authClient.admin.setUserPassword({
        newPassword: data.newPassword,
        userId: user.id,
      });

      if (res.error) {
        throw new Error(res.error.message);
      }
    },
    onSuccess: () => {
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change password for '{user.email}'</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(async (data) => {
              await changePasswordMutation.mutateAsync(data);
            })}
          >
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <ButtonGroup className="w-full">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter new password"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={generateRandomPassword}
                        >
                          <Dice2Icon />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard
                              .writeText(field.value)
                              .then(() => {
                                toast.success("Password copied to clipboard");
                              });
                          }}
                        >
                          <CopyIcon />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff /> : <EyeIcon />}
                        </Button>
                      </ButtonGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div>
                <Button
                  disabled={changePasswordMutation.isPending}
                  type="submit"
                >
                  Change Password
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

type CreateUser = {
  email: string;
  password: string;
  name: string;
  role: "user" | "admin";
};

function CreateUserForm({
  trigger,
  onSuccess,
}: {
  trigger: ReactElement;
  onSuccess: (user: UserWithRole) => void;
}) {
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);

  const form = useForm<CreateUser>({
    defaultValues: {
      email: "",
      password: "",
      name: "",
      role: "user",
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUser) => {
      const res = await authClient.admin.createUser({
        email: data.email,
        password: data.password,
        name: data.name,
        role: data.role as "user" | "admin",
      });

      if (res.error) {
        throw new Error(res.error.message);
      }

      return res.data;
    },
    onSuccess: (data) => {
      setIsCreateUserDialogOpen(false);
      form.reset();
      onSuccess(data.user);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <Sheet
      open={isCreateUserDialogOpen}
      onOpenChange={setIsCreateUserDialogOpen}
    >
      <SheetTrigger render={trigger} />
      <SheetContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(async (data) => {
              await createUserMutation.mutateAsync(data);
            })}
          >
            <SheetHeader>
              <SheetTitle>Create new user</SheetTitle>
            </SheetHeader>
            <div className="grid flex-1 auto-rows-min gap-6 px-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="Email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User role</FormLabel>
                    <FormControl>
                      <NativeSelect
                        onChange={field.onChange}
                        value={field.value}
                      >
                        <NativeSelectOption value="user">
                          User
                        </NativeSelectOption>
                        <NativeSelectOption value="admin">
                          Admin
                        </NativeSelectOption>
                      </NativeSelect>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <SheetFooter className="flex flex-row justify-end">
              <Button disabled={createUserMutation.isPending} type="submit">
                {createUserMutation.isPending ? "Saving ..." : "Save"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
