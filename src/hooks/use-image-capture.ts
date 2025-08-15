import * as React from 'react';
import { saveAs } from 'file-saver';
import { showError, showSuccess } from '@/utils/toast';

interface UseImageCaptureOptions {
  fileName?: string;
  fileType?: 'image/png' | 'image/jpeg';
  quality?: number; // For JPEG
}

export const useImageCapture = () => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  const captureAndDownload = React.useCallback((options?: UseImageCaptureOptions) => {
    if (!canvasRef.current) {
      showError("3D canvas not found for capture.");
      return;
    }

    try {
      const { fileName = '3d_build', fileType = 'image/png', quality = 0.92 } = options || {};
      const dataURL = canvasRef.current.toDataURL(fileType, quality);
      saveAs(dataURL, `${fileName}.${fileType.split('/')[1]}`);
      showSuccess("Image captured and downloaded!");
    } catch (error: any) {
      console.error("Error capturing image:", error);
      showError(`Failed to capture image: ${error.message}`);
    }
  }, []);

  return { canvasRef, captureAndDownload };
};