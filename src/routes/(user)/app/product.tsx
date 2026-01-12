import { useUploadFiles } from "@better-upload/client";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Package, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { PagePending } from "@/components/common/page-pending";
import { PageTitle } from "@/components/common/page-title";
import { DataTablePagination } from "@/components/data-table/pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { handleFormError } from "@/lib/helpers/form";
import { orpc } from "@/lib/orpc";
import type { Outputs } from "@/rpc/types";

export type Product = Outputs["product"]["listProducts"]["items"][number];

export const Route = createFileRoute("/(user)/app/product")({
  component: ProductPage,
  pendingComponent: PagePending,
  validateSearch: z.object({
    page: z.number().int().positive().catch(1),
  }),
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ deps, context }) => {
    context.queryClient.prefetchQuery(
      orpc.product.listProducts.queryOptions({
        input: { page: deps.page },
      }),
    );
  },
});

function ProductPage() {
  const page = Route.useSearch({ select: (s) => s.page });
  const navigate = Route.useNavigate();
  const {
    data: { items: products, pageCount, totalCount, pageSize },
    refetch,
  } = useSuspenseQuery(
    orpc.product.listProducts.queryOptions({
      input: { page },
    }),
  );

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const openCreateForm = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const openEditForm = (product: Product) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6 py-6 px-4">
      <div className="flex flex-row justify-between items-center">
        <PageTitle
          title="Products"
          description="Manage your product inventory"
        />
        <Button onClick={openCreateForm}>
          <Plus className="size-4" />
          <span>Add Product</span>
        </Button>
      </div>

      {products.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={() => openEditForm(product)}
                onDelete={() => setProductToDelete(product)}
              />
            ))}
          </div>
          <DataTablePagination
            currentPage={page}
            pageCount={pageCount}
            totalCount={totalCount}
            pageSize={pageSize}
            itemsCount={products.length}
            onPageChange={(page) => navigate({ search: { page } })}
          />
        </div>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <Package className="size-12 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>No products found</EmptyTitle>
            <EmptyDescription>
              You haven't added any products yet. Click the button above to
              create your first product.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      <ProductForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        product={editingProduct}
        onSuccess={() => {
          refetch();
          setIsFormOpen(false);
        }}
      />

      <DeleteProductDialog
        product={productToDelete}
        onOpenChange={(open) => !open && setProductToDelete(null)}
        onSuccess={() => {
          refetch();
          setProductToDelete(null);
        }}
      />
    </div>
  );
}

function ProductCard({
  product,
  onEdit,
  onDelete,
}: {
  product: Product;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const firstImage = product.images?.files?.[0];

  return (
    <Card className="overflow-hidden flex flex-col group">
      <div className="relative">
        <AspectRatio ratio={4 / 3}>
          {firstImage ? (
            <img
              src={firstImage.url}
              alt={product.name}
              className="size-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="size-full bg-muted flex items-center justify-center">
              <Package className="size-12 text-muted-foreground/50" />
            </div>
          )}
        </AspectRatio>
      </div>
      <CardHeader className="p-4 space-y-1">
        <h3 className="font-semibold text-lg leading-tight line-clamp-1">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
            {product.description}
          </p>
        )}
      </CardHeader>
      <CardContent className="p-4 pt-0 flex-1" />
      <CardFooter className="p-4 pt-0 flex flex-row justify-end space-x-2">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="size-4" />
          <span>Edit</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="size-4" />
          <span>Delete</span>
        </Button>
      </CardFooter>
    </Card>
  );
}

const ProductFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  images: z.array(z.object({ key: z.string(), url: z.string() })),
});

type ProductFormValues = z.infer<typeof ProductFormSchema>;

function ProductForm({
  open,
  onOpenChange,
  product,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  onSuccess: () => void;
}) {
  const isEditing = !!product;
  const form = useForm<ProductFormValues>({
    values: {
      name: product?.name ?? "",
      description: product?.description ?? "",
      images: product?.images?.files ?? [],
    },
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { upload, isPending: isUploading } = useUploadFiles({
    route: "private_images",
    api: "/api/upload",
    onUploadComplete: ({ files }) => {
      const newImages = files.map((f) => ({
        key: f.objectInfo.key,
        url: (f.objectInfo.metadata as any).url || "",
      }));
      form.setValue("images", [...form.getValues("images"), ...newImages]);
      toast.success(`Uploaded ${files.length} image(s)`);
    },
    onError: (error) => toast.error(error.message || "Upload failed"),
  });

  const createMutation = useMutation(
    orpc.product.createProduct.mutationOptions({
      onSuccess: () => {
        toast.success("Product created successfully");
        onSuccess();
      },
      onError: (error: any) => handleFormError(error, form.setError),
    }),
  );

  const updateMutation = useMutation(
    orpc.product.updateProduct.mutationOptions({
      onSuccess: () => {
        toast.success("Product updated successfully");
        onSuccess();
      },
      onError: (error: any) => handleFormError(error, form.setError),
    }),
  );

  const onSubmit = async (values: ProductFormValues) => {
    const payload = {
      name: values.name,
      description: values.description || null,
      images:
        values.images.length > 0
          ? { files: values.images.map((img) => ({ key: img.key })) }
          : null,
    };

    if (isEditing && product) {
      await updateMutation.mutateAsync({ id: product.id, ...payload });
    } else {
      await createMutation.mutateAsync(payload as any);
    }
  };

  const removeImage = (index: number) => {
    const currentImages = form.getValues("images");
    form.setValue(
      "images",
      currentImages.filter((_, i) => i !== index),
    );
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      upload(files);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const images = form.watch("images");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <SheetHeader>
              <SheetTitle>
                {isEditing ? "Edit Product" : "Create Product"}
              </SheetTitle>
            </SheetHeader>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Product name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Product description"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <FormLabel>Images</FormLabel>
                <div className="grid grid-cols-3 gap-2">
                  {images.map((img, index) => (
                    <div key={img.key} className="relative aspect-square group">
                      <img
                        src={img.url}
                        alt="Product"
                        className="size-full object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -right-2 -top-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="aspect-square flex flex-col items-center justify-center border-2 border-dashed rounded-md hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    {isUploading ? (
                      <div className="size-4 border-2 border-primary border-t-transparent animate-spin rounded-full" />
                    ) : (
                      <>
                        <Upload className="size-5 mb-1" />
                        <span className="text-xs">Upload</span>
                      </>
                    )}
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            </div>

            <SheetFooter>
              <Button
                type="submit"
                disabled={
                  createMutation.isPending ||
                  updateMutation.isPending ||
                  isUploading
                }
                className="w-full"
              >
                {isEditing ? "Update Product" : "Create Product"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

function DeleteProductDialog({
  product,
  onOpenChange,
  onSuccess,
}: {
  product: Product | null;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const deleteMutation = useMutation(
    orpc.product.deleteProduct.mutationOptions({
      onSuccess: () => {
        toast.success("Product deleted successfully");
        onSuccess();
      },
      onError: (error: any) => toast.error(error.message),
    }),
  );

  return (
    <AlertDialog open={!!product} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the product{" "}
            <strong>{product?.name}</strong>. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              if (product) deleteMutation.mutate({ id: product.id });
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete Product"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
