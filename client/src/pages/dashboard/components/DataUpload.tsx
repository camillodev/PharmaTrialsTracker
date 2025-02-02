import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";

export default function DataUpload() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Upload Successful",
        description: data.message,
      });
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/analysis'] });
      queryClient.invalidateQueries({ queryKey: ['/api/outliers'] });
      setOpen(false);

      // Force immediate refetch for latest analysis
      Promise.all([
        queryClient.refetchQueries({ queryKey: ['/api/analysis'] }),
        queryClient.refetchQueries({ queryKey: ['/api/outliers'] }),
      ]);
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    uploadMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="bg-gradient-to-r from-primary/90 to-primary hover:from-primary hover:to-primary/90 transition-all duration-300 shadow-lg hover:shadow-xl">
          <Upload className="mr-2 h-5 w-5" />
          Upload Trial Data
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Trial Data</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" encType="multipart/form-data">
          <div className="space-y-2">
            <Label htmlFor="file">Select File (CSV, JSON, or XML)</Label>
            <Input id="file" name="file" type="file" accept=".csv,.json,.xml" required />
          </div>
          <Button 
            type="submit" 
            disabled={uploadMutation.isPending}
            className="w-full bg-gradient-to-r from-primary/90 to-primary hover:from-primary hover:to-primary/90"
          >
            {uploadMutation.isPending ? "Uploading..." : "Upload"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}