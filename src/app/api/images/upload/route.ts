import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import {
  IMAGE_STORAGE_MAX_UPLOAD_BYTES,
  validateImageBlobMetadata,
} from "@/lib/image-storage";
import { getRouteSession } from "@/lib/session";

function safeFileName(name: string) {
  const normalized = name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96);
  return normalized || "image";
}

export async function POST(request: Request) {
  const session = await getRouteSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Image file is required." }, { status: 400 });
  }

  const validation = validateImageBlobMetadata(file, {
    maxBytes: IMAGE_STORAGE_MAX_UPLOAD_BYTES,
  });
  if (!validation.ok) {
    return NextResponse.json(
      {
        code: validation.error.code,
        message: validation.error.message,
        note: validation.error.note,
      },
      { status: validation.error.code === "too_large" ? 413 : 400 },
    );
  }

  try {
    const pathname = `users/${session.user.id}/images/${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const blob = await put(pathname, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: validation.value.mimeType,
    });

    return NextResponse.json({
      image: {
        url: blob.url,
        pathname: blob.pathname,
        contentType: validation.value.mimeType,
        size: validation.value.byteLength,
        name: validation.value.name,
      },
    });
  } catch (error) {
    console.error("Vercel Blob image upload failed", error);
    return NextResponse.json(
      {
        message: "Could not upload this image to Vercel Blob.",
      },
      { status: 500 },
    );
  }
}
