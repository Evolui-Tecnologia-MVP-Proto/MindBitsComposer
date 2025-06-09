export const isImageFileHandle = (handle: any): boolean => {
  return handle && handle.kind === "file" && handle.name && isImageFile(handle);
};

export const isImageFileHandleType = (handle: any): boolean => {
  return handle && handle.type && handle.type.startsWith("image/");
};

export const isImageFile = (file: { name: string } | { type: string }): boolean => {
  if ("name" in file) {
    const name = file.name.toLowerCase();
    return /\.(png|jpg|jpeg|gif|svg|webp|bmp|ico)$/i.test(name);
  }
  if ("type" in file) {
    return file.type.startsWith("image/");
  }
  return false;
};

export const loadFileContents = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
};

export const loadImageAsDataURL = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
};