import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface Props {
  onFiles: (files: FileList | File[]) => void;
}

export default function DropZone({ onFiles }: Props) {
  /* Callback verpacken, damit wir das FileList-Interface akzeptieren */
  const handleDrop = useCallback((accepted: File[]) => onFiles(accepted), [onFiles]);

  const {
    getRootProps,
    getInputProps,
    isDragActive
  } = useDropzone({ onDrop: handleDrop });

  return (
    <div
      {...getRootProps()}
      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
                 ${isDragActive ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
    >
      <input {...getInputProps()} />

      <p>Dateien hierher ziehen …</p>
      <p className="text-xs text-gray-500">Sales-CSV oder Advertised-XLSX</p>
    </div>
  );
}
