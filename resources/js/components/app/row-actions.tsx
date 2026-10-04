import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface RowActionsProps {
  name: string;
  onEdit: () => void;
  onDelete: () => void;
}

export function RowActions({ name, onEdit, onDelete }: RowActionsProps) {
  return (
    <div className="flex justify-end gap-1">
      <Button type="button" variant="ghost" size="icon" onClick={onEdit} aria-label={`Ubah ${name}`}>
        <Pencil />
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={onDelete} aria-label={`Hapus ${name}`} className="text-destructive hover:bg-danger-soft hover:text-destructive">
        <Trash2 />
      </Button>
    </div>
  );
}
