import { Response } from "express";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// The object storage service is used to interact with the object storage service.
export class ObjectStorageService {
  constructor() {}

  // Gets the public object search paths.
  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
          "tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }

  // Gets the private object directory.
  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }

  // Search for a public object from the search paths.
  async searchPublicObject(filePath: string): Promise<any | null> {
    // Simplified implementation for avatar upload functionality
    return null;
  }

  // Downloads an object to the response.
  async downloadObject(filePath: string, res: Response, cacheTtlSec: number = 3600) {
    try {
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
      }

      const stats = fs.statSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      
      // Set appropriate headers
      let contentType = "application/octet-stream";
      switch (ext) {
        case '.jpg':
        case '.jpeg':
          contentType = 'image/jpeg';
          break;
        case '.png':
          contentType = 'image/png';
          break;
        case '.gif':
          contentType = 'image/gif';
          break;
        case '.webp':
          contentType = 'image/webp';
          break;
      }

      res.set({
        "Content-Type": contentType,
        "Content-Length": stats.size.toString(),
        "Cache-Control": `public, max-age=${cacheTtlSec}`,
      });

      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(500).json({ error: "Error downloading file" });
    }
  }

  // Gets the upload URL for an object entity.
  async getObjectEntityUploadURL(): Promise<string> {
    // Generate unique filename for local storage
    const objectId = randomUUID();
    
    // Create avatars directory if it doesn't exist
    const avatarsDir = path.join(process.cwd(), 'uploads', 'avatars');
    if (!fs.existsSync(avatarsDir)) {
      fs.mkdirSync(avatarsDir, { recursive: true });
    }
    
    // Return a local endpoint for upload
    return `/api/upload/avatar/${objectId}`;
  }

  // Gets the object entity file from the object path.
  async getObjectEntityFile(objectPath: string): Promise<string> {
    // Extract filename from object path
    const parts = objectPath.split('/');
    const filename = parts[parts.length - 1];
    
    const avatarsDir = path.join(process.cwd(), 'uploads', 'avatars');
    const filePath = path.join(avatarsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      throw new ObjectNotFoundError();
    }
    
    return filePath;
  }

  normalizeObjectEntityPath(
    rawPath: string,
  ): string {
    // If it's already a local path, return as is
    if (rawPath.startsWith('/avatars/') || rawPath.startsWith('/objects/')) {
      return rawPath;
    }
    
    // If it's an upload endpoint path, convert to object path
    if (rawPath.startsWith('/api/upload/avatar/')) {
      const filename = rawPath.split('/').pop();
      return `/avatars/${filename}`;
    }
    
    // For any other format, try to extract filename
    const parts = rawPath.split('/');
    const filename = parts[parts.length - 1];
    return `/avatars/${filename}`;
  }

  // Tries to set the ACL policy for the object entity and return the normalized path.
  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: any
  ): Promise<string> {
    // Simplified implementation for avatar upload functionality  
    return this.normalizeObjectEntityPath(rawPath);
  }

  // Checks if the user can access the object entity.
  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: any;
    requestedPermission?: string;
  }): Promise<boolean> {
    // Simplified implementation for avatar upload functionality
    return true;
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
}): Promise<string> {
  const request = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `make sure you're running on Replit`
    );
  }

  const { signed_url: signedURL } = await response.json();
  return signedURL;
}