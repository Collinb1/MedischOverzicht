import { useState } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";
import heic2any from "heic2any";

// HEIC to JPG conversion utility
const convertHeicToJpg = async (file: File): Promise<File> => {
  try {
    const convertedBlob = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.9,
    }) as Blob;
    
    const convertedFile = new File([convertedBlob], file.name.replace(/\.heic$/i, '.jpg'), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
    
    console.log(`HEIC geconverteerd naar JPG: ${file.name} → ${convertedFile.name}`);
    return convertedFile;
  } catch (error) {
    console.warn("HEIC conversie mislukt:", error);
    return file; // Return original file if conversion fails
  }
};

// Image compression utility
const compressImage = (file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) {
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        } else {
          resolve(file); // Fallback to original if compression fails
        }
      }, file.type, quality);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  buttonClassName?: string;
  children: ReactNode;
}

/**
 * Een foto upload component die een knop toont en een modal interface biedt voor
 * bestandsbeheer met automatische HEIC conversie en beeldcompressie.
 * 
 * Functionaliteiten:
 * - Toont als aanpasbare knop die upload modal opent
 * - Automatische HEIC naar JPG conversie (iPhone foto's)
 * - Automatische beeldcompressie (max 1200px breedte, 80% kwaliteit)
 * - Accepteert tot 20MB grote bestanden voor verwerking
 * - Comprimeert tot max 5MB na conversie en compressie
 * - Ondersteunt: JPG, PNG, GIF, WebP, HEIC bestanden
 * - Biedt een modal interface voor:
 *   - Bestandsselectie
 *   - Bestandsvoorbeeld
 *   - Upload voortgang tracking
 *   - Upload status display
 * 
 * De component gebruikt Uppy onder de motorkap voor alle bestandsupload functionaliteit.
 * Alle bestandsbeheer functies worden automatisch afgehandeld door de Uppy dashboard modal.
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 5242880, // Reduced to 5MB after compression
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize: 20971520, // Allow 20MB before compression
        allowedFileTypes: ['image/*', '.heic', '.HEIC'], // Allow images and HEIC files
      },
      autoProceed: false,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: onGetUploadParameters,
      })
      .on("file-added", async (file) => {
        // Process HEIC and compress images before upload
        try {
          const originalSize = file.size || 0;
          if (originalSize === 0) return; // Skip if no size info
          
          let processedFile = file.data as File;
          
          // First, convert HEIC to JPG if needed
          if (file.name && file.name.toLowerCase().endsWith('.heic')) {
            processedFile = await convertHeicToJpg(processedFile);
          }
          
          // Then compress the image
          const compressedFile = await compressImage(processedFile);
          const compressionRatio = ((originalSize - compressedFile.size) / originalSize * 100).toFixed(1);
          
          // Update file with processed version
          uppy.setFileState(file.id, {
            data: compressedFile,
            size: compressedFile.size,
            name: `${processedFile.name} (gecomprimeerd ${compressionRatio}%)`,
            type: compressedFile.type,
          });
          
          console.log(`Foto verwerkt: ${(originalSize / 1024 / 1024).toFixed(1)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(1)}MB (${compressionRatio}% kleiner)`);
        } catch (error) {
          console.warn("Foto verwerking mislukt, origineel bestand wordt gebruikt:", error);
        }
      })
      .on("complete", (result) => {
        onComplete?.(result);
        setShowModal(false); // Close modal after upload
      })
  );

  return (
    <div>
      <Button onClick={() => setShowModal(true)} className={buttonClassName} type="button">
        {children}
      </Button>

      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
      />
    </div>
  );
}