import { useUploadFiles } from "@better-upload/client";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { handleFormError } from "@/lib/helpers/form";
import { orpc } from "@/lib/orpc";

export const Route = createFileRoute("/(user)/app/hello-form")({
  component: RouteComponent,
});

function RouteComponent() {
  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
    },
  });

  const formHello = useMutation(
    orpc.form.hello.mutationOptions({
      onSuccess: (data) => {
        toast.success(data.message);
      },
      onError: (error) => handleFormError(error, form.setError),
    }),
  );

  return (
    <div className="p-4 space-y-8">
      <div className="max-w-md mx-auto p-4 rounded-lg shadow-md">
        <h2 className="mb-4 font-semibold">Hello Form</h2>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(async (data) => {
              await formHello.mutateAsync(data);
            })}
          >
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="shadcn" {...field} />
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
                      <Input placeholder="shadcn@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">
                {form.formState.isSubmitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <ImageUploadForm />
    </div>
  );
}

function ImageUploadForm() {
  const [selectedImageFiles, setSelectedImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    upload,
    progresses,
    isPending: isUploadingImages,
  } = useUploadFiles({
    route: "images",
    api: "/api/upload",
    onUploadComplete: ({ files }) => {
      toast.success(`Successfully uploaded ${files.length} image(s)`);

      // Clear files
      setSelectedImageFiles([]);
      setImagePreviews([]);
    },
    onUploadFail: ({ failedFiles }) => {
      for (const file of failedFiles) {
        toast.error(`Failed to upload ${file.raw.name}`);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Upload failed");
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    setSelectedImageFiles((prev) => [...prev, ...imageFiles]);

    // Generate previews
    imageFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImageFile = (index: number) => {
    setSelectedImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImageUpload = () => {
    if (selectedImageFiles.length === 0) {
      toast.error("Please select at least one image");
      return;
    }

    upload(selectedImageFiles);
  };

  return (
    <div className="max-w-md mx-auto p-4 rounded-lg shadow-md">
      <h2 className="mb-4 font-semibold">Image Upload</h2>

      <div className="space-y-4">
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="image-upload"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
          >
            <Upload className="mr-2 size-4" />
            Select Images
          </Button>
        </div>

        {selectedImageFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {selectedImageFiles.length} image(s) selected
            </p>
            <div className="grid grid-cols-3 gap-2">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="group relative aspect-square">
                  <img
                    src={preview}
                    alt={selectedImageFiles[index].name}
                    className="size-full rounded object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImageFile(index)}
                    className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="size-3 text-destructive-foreground" />
                  </button>
                  {isUploadingImages && progresses[index] !== undefined && (
                    <div className="absolute inset-0 flex items-center justify-center rounded bg-black/50">
                      <span className="text-sm font-semibold text-white">
                        {Math.round(progresses[index].progress * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <Button
          onClick={handleImageUpload}
          disabled={selectedImageFiles.length === 0 || isUploadingImages}
          className="w-full"
        >
          {isUploadingImages ? "Uploading..." : "Upload Images"}
        </Button>
      </div>
    </div>
  );
}
