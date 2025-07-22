'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Prompt } from '@/lib/db/schema';
import { updateUserPrompt } from '@/app/(chat)/actions';
import { toast } from 'sonner';

interface EditPromptDialogProps {
  prompt: Prompt;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const availableModels = [
  { id: 'openai-gpt-4.1', name: 'GPT-4.1' },
  { id: 'openai-gpt-4.1-mini', name: 'GPT-4.1 Mini' },
  { id: 'anthropic-claude-sonnet-4', name: 'Claude Sonnet 4' },
  { id: 'xai-grok-3-mini', name: 'Grok 3 Mini' },
];

export function EditPromptDialog({
  prompt,
  isOpen,
  onClose,
  onSuccess,
}: EditPromptDialogProps) {
  const [title, setTitle] = useState(prompt.title);
  const [promptText, setPromptText] = useState(prompt.prompt);
  const [modelId, setModelId] = useState(prompt.modelId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !promptText.trim()) {
      toast.error('Title and prompt text are required');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await updateUserPrompt({
        id: prompt.id,
        title: title.trim(),
        prompt: promptText.trim(),
        modelId: modelId || undefined,
      });
      
      toast.success('Prompt updated successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to update prompt:', error);
      toast.error('Failed to update prompt');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    setTitle(prompt.title);
    setPromptText(prompt.prompt);
    setModelId(prompt.modelId || '');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-screen-toast-mobile">
        <DialogHeader>
          <DialogTitle>Edit Suggested Action</DialogTitle>
          <DialogDescription>
            Update the title, prompt text, and model for this suggested action.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for this action"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="prompt">Prompt Text</Label>
            <Textarea
              id="prompt"
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Enter the prompt text"
              rows={4}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="model">Model (Optional)</Label>
            <Select value={modelId || 'none'} onValueChange={(value) => setModelId(value === 'none' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a model (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific model</SelectItem>
                {availableModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
