import * as fs from "fs";
import * as path from "path";
import { prisma } from "../../database/prisma";
import { Errors } from "../../common/errors";
import { env } from "../../common/env";
import { productImageUrl } from "../../common/upload";
import type {
  CreateProductInput,
  UpdateProductInput,
  ToggleProductStatusInput,
} from "@muzammil-pos/validation";
import type { PaginationQuery } from "@muzammil-pos/types";

const PRODUCT_INCLUDE = {
  category: true,
  images: { orderBy: { sortOrder: "asc" as const } },
  variants: true,
} as const;

async function generateUniqueProductCode(): Promise<string> {
  const count = await prisma.product.count();
  let attempt = count + 1;
  // Loop defensively in case a product was deleted, freeing up a lower number.
  for (let i = 0; i < 20; i++) {
    const code = `PROD-${String(attempt).padStart(4, "0")}`;
    const existing = await prisma.product.findUnique({ where: { productCode: code } });
    if (!existing) return code;
    attempt++;
  }
  return `PROD-${Date.now()}`;
}

interface ListProductsQuery extends PaginationQuery {
  categoryId?: string;
  status?: string;
}

export async function listProducts(query: ListProductsQuery) {
  const page = query.page && !Number.isNaN(query.page) ? query.page : 1;
  const pageSize = query.pageSize && !Number.isNaN(query.pageSize) ? query.pageSize : 20;

  const where = {
    ...(query.search
      ? { OR: [{ name: { contains: query.search } }, { productCode: { contains: query.search } }] }
      : {}),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.status ? { status: query.status } : {}),
  };

  const [items, totalItems] = await Promise.all([
    prisma.product.findMany({
      where,
      include: PRODUCT_INCLUDE,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items,
    meta: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(Math.ceil(totalItems / pageSize), 1),
    },
  };
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({ where: { id }, include: PRODUCT_INCLUDE });
  if (!product) throw Errors.notFound("Product", id);
  return product;
}

export async function createProduct(input: CreateProductInput) {
  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category) {
    throw Errors.validation("Selected category does not exist.", { field: "categoryId" });
  }

  const productCode = await generateUniqueProductCode();

  return prisma.product.create({
    data: {
      productCode,
      name: input.name,
      categoryId: input.categoryId,
      basePrice: input.basePrice,
      costPrice: input.costPrice ?? null,
      status: "ACTIVE",
    },
    include: PRODUCT_INCLUDE,
  });
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw Errors.notFound("Product", id);

  if (input.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
    if (!category) {
      throw Errors.validation("Selected category does not exist.", { field: "categoryId" });
    }
  }

  return prisma.product.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.basePrice !== undefined ? { basePrice: input.basePrice } : {}),
      ...(input.costPrice !== undefined ? { costPrice: input.costPrice } : {}),
    },
    include: PRODUCT_INCLUDE,
  });
}

export async function toggleProductStatus(id: string, input: ToggleProductStatusInput) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw Errors.notFound("Product", id);

  return prisma.product.update({
    where: { id },
    data: { status: input.status },
    include: PRODUCT_INCLUDE,
  });
}

function removeImageFileSafely(imageUrl: string) {
  try {
    const fileName = path.basename(imageUrl);
    const filePath = path.join(env.uploadsRootDir, "products", fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    // Deleting the DB record should not fail just because the file on disk
    // was already missing or locked — log and continue.
    console.error("[products] Failed to remove image file:", err);
  }
}

export async function deleteProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id }, include: { images: true } });
  if (!product) throw Errors.notFound("Product", id);

  const [variantCount, saleItemCount] = await Promise.all([
    prisma.productVariant.count({ where: { productId: id } }),
    prisma.saleItem.count({ where: { productId: id } }),
  ]);

  if (variantCount > 0 || saleItemCount > 0) {
    throw Errors.productHasRelatedRecords(product.name);
  }

  for (const image of product.images) {
    removeImageFileSafely(image.imageUrl);
  }

  await prisma.product.delete({ where: { id } });
  return { success: true };
}

export async function addProductImages(productId: string, files: Express.Multer.File[]) {
  const product = await prisma.product.findUnique({ where: { id: productId }, include: { images: true } });
  if (!product) throw Errors.notFound("Product", productId);

  const hasExistingPrimary = product.images.some((img) => img.isPrimary);
  const startSortOrder = product.images.length;

  const created = await prisma.$transaction(
    files.map((file, index) =>
      prisma.productImage.create({
        data: {
          productId,
          imageUrl: productImageUrl(file.filename),
          isPrimary: !hasExistingPrimary && index === 0,
          sortOrder: startSortOrder + index,
        },
      })
    )
  );

  if (!hasExistingPrimary && created[0]) {
    await prisma.product.update({
      where: { id: productId },
      data: { primaryImageUrl: created[0].imageUrl },
    });
  }

  return getProductById(productId);
}

export async function deleteProductImage(productId: string, imageId: string) {
  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image || image.productId !== productId) {
    throw Errors.notFound("Product image", imageId);
  }

  removeImageFileSafely(image.imageUrl);
  await prisma.productImage.delete({ where: { id: imageId } });

  if (image.isPrimary) {
    const nextImage = await prisma.productImage.findFirst({
      where: { productId },
      orderBy: { sortOrder: "asc" },
    });
    if (nextImage) {
      await prisma.productImage.update({ where: { id: nextImage.id }, data: { isPrimary: true } });
      await prisma.product.update({
        where: { id: productId },
        data: { primaryImageUrl: nextImage.imageUrl },
      });
    } else {
      await prisma.product.update({ where: { id: productId }, data: { primaryImageUrl: null } });
    }
  }

  return getProductById(productId);
}

export async function setPrimaryProductImage(productId: string, imageId: string) {
  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image || image.productId !== productId) {
    throw Errors.notFound("Product image", imageId);
  }

  await prisma.$transaction([
    prisma.productImage.updateMany({ where: { productId }, data: { isPrimary: false } }),
    prisma.productImage.update({ where: { id: imageId }, data: { isPrimary: true } }),
    prisma.product.update({ where: { id: productId }, data: { primaryImageUrl: image.imageUrl } }),
  ]);

  return getProductById(productId);
}