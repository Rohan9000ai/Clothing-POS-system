import { prisma } from "../../database/prisma";
import { Errors } from "../../common/errors";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  ToggleCategoryStatusInput,
} from "@muzammil-pos/validation";

export async function listCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
}

export async function createCategory(input: CreateCategoryInput) {
  const existing = await prisma.category.findUnique({ where: { name: input.name } });
  if (existing) {
    throw Errors.validation(`Category "${input.name}" already exists.`, { field: "name" });
  }
  return prisma.category.create({ data: { name: input.name, status: "ACTIVE" } });
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw Errors.notFound("Category", id);

  if (input.name && input.name !== category.name) {
    const duplicate = await prisma.category.findUnique({ where: { name: input.name } });
    if (duplicate) {
      throw Errors.validation(`Category "${input.name}" already exists.`, { field: "name" });
    }
  }

  return prisma.category.update({
    where: { id },
    data: { ...(input.name !== undefined ? { name: input.name } : {}) },
  });
}

export async function toggleCategoryStatus(id: string, input: ToggleCategoryStatusInput) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw Errors.notFound("Category", id);
  return prisma.category.update({ where: { id }, data: { status: input.status } });
}

export async function deleteCategory(id: string) {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) throw Errors.notFound("Category", id);

  const productCount = await prisma.product.count({ where: { categoryId: id } });
  if (productCount > 0) {
    throw Errors.categoryHasProducts(category.name);
  }

  await prisma.category.delete({ where: { id } });
  return { success: true };
}