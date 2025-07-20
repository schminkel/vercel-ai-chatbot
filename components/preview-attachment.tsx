import type { Attachment } from '@/lib/types';
import { LoaderIcon } from './icons';
import { usePresignedUrl } from '@/hooks/use-presigned-url';
import * as Dialog from '@radix-ui/react-dialog';
import { VisuallyHidden } from './ui/visually-hidden';

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
}: {
  attachment: Attachment;
  isUploading?: boolean;
}) => {
  const { name, url, contentType } = attachment;
  const presignedUrl = usePresignedUrl(url);

  const imageElement = (
    <div className="w-20 h-16 aspect-video bg-muted rounded-md relative flex flex-col items-center justify-center">
      {contentType ? (
        contentType.startsWith('image') ? (
          // NOTE: it is recommended to use next/image for images
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={presignedUrl}
            src={presignedUrl}
            alt={name ?? 'An image attachment'}
            className="rounded-md size-full object-cover"
          />
        ) : (
          <div className="" />
        )
      ) : (
        <div className="" />
      )}

      {isUploading && (
        <div
          data-testid="input-attachment-loader"
          className="animate-spin absolute text-zinc-500"
        >
          <LoaderIcon />
        </div>
      )}
    </div>
  );

  return (
    <div data-testid="input-attachment-preview" className="flex flex-col gap-2">
      {contentType?.startsWith('image') && !isUploading ? (
        <Dialog.Root>
          <Dialog.Trigger asChild>
            <div className="cursor-zoom-in">
              {imageElement}
            </div>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 z-50" />
            <Dialog.Content className="fixed inset-0 flex items-center justify-center z-50">
              <VisuallyHidden>
                <Dialog.Title>Image preview</Dialog.Title>
              </VisuallyHidden>
              <div className="bg-background rounded-lg shadow-lg p-0 max-w-full max-h-full flex flex-col items-center relative">
                {/* Overlay close button in top right of image */}
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="absolute -top-0.5 right-2.5 text-5xl font-bold text-white hover:text-zinc-200 focus:outline-none z-10 drop-shadow-lg"
                    aria-label="Close"
                    style={{ lineHeight: 1 }}
                  >
                    &times;
                  </button>
                </Dialog.Close>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={presignedUrl}
                  alt={name ?? 'An image attachment'}
                  className="rounded-md max-w-[90vw] max-h-[80vh] border-4 border-white"
                  style={{ background: '#fff' }}
                />
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      ) : (
        imageElement
      )}
      <div className="text-xs text-zinc-500 max-w-16 truncate">{name}</div>
    </div>
  );
};
