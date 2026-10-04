import type { FormDataType } from '@inertiajs/core';
import { router, useForm } from '@inertiajs/react';
import { type FormEvent, useState } from 'react';

interface Identified {
  id: number;
}

/**
 * Status bersama halaman CRUD: panel form (tambah/ubah) dan dialog hapus.
 * Data mengalir: baris tabel → toForm() → useForm → POST/PUT → redirect back + flash.
 */
export function useResourceForm<Row extends Identified, Form extends FormDataType<Form>>(
  baseUrl: string,
  emptyForm: Form,
  toForm: (row: Row) => Form,
) {
  const form = useForm<Form>(emptyForm);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);

  const openCreate = () => {
    setEditing(null);
    form.clearErrors();
    form.setData(emptyForm);
    setIsOpen(true);
  };

  const openEdit = (row: Row) => {
    setEditing(row);
    form.clearErrors();
    form.setData(toForm(row));
    setIsOpen(true);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const options = { preserveScroll: true, onSuccess: () => setIsOpen(false) };
    if (editing) {
      form.put(`${baseUrl}/${editing.id}`, options);
    } else {
      form.post(baseUrl, options);
    }
  };

  const confirmDelete = () => {
    if (!deleting) return;
    router.delete(`${baseUrl}/${deleting.id}`, {
      preserveScroll: true,
      onFinish: () => setDeleting(null),
    });
  };

  return {
    form,
    isOpen,
    setIsOpen,
    editing,
    isEditing: editing !== null,
    openCreate,
    openEdit,
    submit,
    deleting,
    setDeleting,
    confirmDelete,
  };
}
