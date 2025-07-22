'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Prompt } from '@/lib/db/schema';
import { deleteUserPrompt } from '@/app/(chat)/actions';
import { toast } from 'sonner';

interface DeletePromptDialogProps {
  prompt: Prompt;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeletePromptDialog({
  prompt,
  isOpen,
  onClose,
  onSuccess,
}: DeletePromptDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      await deleteUserPrompt({ id: prompt.id });
      toast.success('Prompt deleted successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to delete prompt:', error);
      toast.error('Failed to delete prompt');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Suggested Action</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{prompt.title}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
