import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface JobResultSheetProps {
  title: string;
  result: unknown;
}

export function JobResultSheet({ title, result }: JobResultSheetProps) {
  if (result == null) {
    return null;
  }

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <Eye className="h-3.5 w-3.5" />
          </Button>
        }
      />
      <SheetContent side="right" className="pl-4">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <pre className="mt-4 max-h-[calc(100vh-8rem)] overflow-auto rounded-lg bg-muted p-4 text-xs">
          {JSON.stringify(result, null, 2)}
        </pre>
      </SheetContent>
    </Sheet>
  );
}
