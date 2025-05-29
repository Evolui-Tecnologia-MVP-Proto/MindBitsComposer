import { File, FileText, Image } from "lucide-react";

interface FileTypeIconProps {
  type: string;
  size?: number;
}

export function FileTypeIcon({ type, size = 4 }: FileTypeIconProps) {
  const iconSize = `${size}rem`;

  switch (type.toLowerCase()) {
    case "pdf":
      return <File className={`h-${size} w-${size} text-red-500`} />;
    case "doc":
    case "docx":
      return <FileText className={`h-${size} w-${size} text-blue-500`} />;
    case "jpg":
    case "jpeg":
    case "png":
    case "gif":
      return <Image className={`h-${size} w-${size} text-green-500`} />;
    case "txt":
      return <FileText className={`h-${size} w-${size} text-gray-500`} />;
    case "json":
      return <FileText className={`h-${size} w-${size} text-orange-500`} />;
    default:
      return <File className={`h-${size} w-${size} text-gray-400`} />;
  }
} 