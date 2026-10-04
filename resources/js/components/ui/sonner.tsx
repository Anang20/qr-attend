import { Toaster as Sonner, type ToasterProps } from 'sonner';

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{ classNames: { toast: 'rounded-xl font-sans' } }}
      {...props}
    />
  );
}

export { Toaster };
