import { NextRequest, NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { getAdminSession } from "@/lib/session";
import { prisma } from "@/lib/db";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session.isAdmin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "O arquivo precisa ser uma imagem" }, { status: 400 });
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Imagem muito grande (máximo 5MB)" }, { status: 400 });
  }

  const owner = await prisma.ownerAccount.findUnique({ where: { id: 1 }, select: { avatarImageUrl: true } });

  // Delete the previous photo first (its pathname may have a different
  // extension than this upload) so re-uploading doesn't accumulate orphaned
  // blobs from every past photo.
  if (owner?.avatarImageUrl) {
    try {
      await del(owner.avatarImageUrl);
    } catch (err) {
      console.error("Falha ao remover o avatar anterior do Blob:", err);
    }
  }

  const extension = file.type.split("/")[1] ?? "jpg";
  const { url } = await put(`avatar-1.${extension}`, file, { access: "public", addRandomSuffix: false });

  await prisma.ownerAccount.update({ where: { id: 1 }, data: { avatarImageUrl: url } });

  return NextResponse.json({ url });
}
