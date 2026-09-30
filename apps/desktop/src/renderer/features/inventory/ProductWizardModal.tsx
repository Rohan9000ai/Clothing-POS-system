import { useState } from "react";
import { Loader2, Plus, Trash2, UploadCloud } from "lucide-react";
import clsx from "clsx";
import { Badge, Button, Input, Modal, Select, ToggleSwitch } from "@muzammil-pos/ui";
import type { Product, ProductVariant, ProductImage, Category } from "@muzammil-pos/types";
import { createProductSchema, updateProductSchema, createProductVariantSchema } from "@muzammil-pos/validation";
import { toPaisa, fromPaisa } from "@muzammil-pos/utils";
import { productsApi, variantsApi, productImagesApi } from "../../services/inventory";
import { API_ORIGIN } from "../../services/http";
import { getFieldErrors, zodFieldErrors } from "../../utils/formErrors";

type Step = 1 | 2 | 3;

interface ProductWizardModalProps {
  /** Pass a product to edit; omit to create a new one. */
  product?: Product;
  categories: Category[];
  onClose: () => void;
  /** Fires once, right after the core product fields are first saved. */
  onSaved: (product: Product, mode: "create" | "edit") => void;
}

export function ProductWizardModal({ product, categories, onClose, onSaved }: ProductWizardModalProps) {
  const isEdit = !!product;

  const [step, setStep] = useState<Step>(1);
  const [workingProduct, setWorkingProduct] = useState<Product | undefined>(product);

  // Step 1: Details
  const [name, setName] = useState(product?.name ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? categories[0]?.id ?? "");
  const [basePrice, setBasePrice] = useState(product ? String(fromPaisa(product.basePrice)) : "");
  const [costPrice, setCostPrice] = useState(
    product?.costPrice != null ? String(fromPaisa(product.costPrice)) : ""
  );
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});
  const [step1FormError, setStep1FormError] = useState<string | null>(null);
  const [isSavingStep1, setIsSavingStep1] = useState(false);

  // Step 2: Sizes & stock
  const [variants, setVariants] = useState<ProductVariant[]>(product?.variants ?? []);
  const [newSize, setNewSize] = useState("");
  const [newColor, setNewColor] = useState("");
  const [newQuantity, setNewQuantity] = useState("0");
  const [newPriceOverride, setNewPriceOverride] = useState("");
  const [variantError, setVariantError] = useState<string | null>(null);
  const [isAddingVariant, setIsAddingVariant] = useState(false);
  const [busyVariantId, setBusyVariantId] = useState<string | null>(null);

  // Step 3: Images
  const [images, setImages] = useState<ProductImage[]>(product?.images ?? []);
  const [isUploading, setIsUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  async function handleStep1Submit() {
    setStep1FormError(null);

    const rawInput = {
      name: name.trim(),
      categoryId,
      basePrice: basePrice === "" ? NaN : Number(basePrice),
      costPrice: costPrice === "" ? null : Number(costPrice),
    };

    const schema = workingProduct ? updateProductSchema : createProductSchema;
    const parsed = schema.safeParse(rawInput);
    if (!parsed.success) {
      setStep1Errors(zodFieldErrors(parsed.error));
      return;
    }
    setStep1Errors({});

    setIsSavingStep1(true);
    try {
      const payload = {
        name: rawInput.name,
        categoryId: rawInput.categoryId,
        basePrice: toPaisa(rawInput.basePrice),
        costPrice: rawInput.costPrice === null ? null : toPaisa(rawInput.costPrice),
      };

      const saved = workingProduct
        ? await productsApi.update(workingProduct.id, payload)
        : await productsApi.create(payload);

      const isFirstSave = !workingProduct;
      setWorkingProduct(saved);
      setVariants(saved.variants ?? []);
      setImages(saved.images ?? []);
      if (isFirstSave) onSaved(saved, "create");
      setStep(2);
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setStep1Errors(fieldErrors);
      } else {
        setStep1FormError(err instanceof Error ? err.message : "Could not save product.");
      }
    } finally {
      setIsSavingStep1(false);
    }
  }

  function isDuplicateVariant(size: string, color: string): boolean {
    const s = size.trim().toLowerCase();
    const c = color.trim().toLowerCase();
    return variants.some((v) => v.size.trim().toLowerCase() === s && v.color.trim().toLowerCase() === c);
  }

  async function handleAddVariant() {
    if (!workingProduct) return;
    setVariantError(null);

    const rawInput = {
      size: newSize.trim(),
      color: newColor.trim(),
      quantity: newQuantity === "" ? NaN : Number(newQuantity),
      priceOverride: newPriceOverride === "" ? null : toPaisa(Number(newPriceOverride)),
    };

    const parsed = createProductVariantSchema.safeParse(rawInput);
    if (!parsed.success) {
      setVariantError(Object.values(zodFieldErrors(parsed.error))[0] ?? "Invalid variant details.");
      return;
    }
    if (isDuplicateVariant(rawInput.size, rawInput.color)) {
      setVariantError(`A variant with size "${rawInput.size}" and color "${rawInput.color}" already exists.`);
      return;
    }

    setIsAddingVariant(true);
    try {
      const created = await variantsApi.create(workingProduct.id, rawInput);
      setVariants((prev) => [...prev, created]);
      setNewSize("");
      setNewColor("");
      setNewQuantity("0");
      setNewPriceOverride("");
    } catch (err) {
      // Server-side duplicate check is the final backstop even though we
      // already checked client-side above.
      setVariantError(err instanceof Error ? err.message : "Could not add variant.");
    } finally {
      setIsAddingVariant(false);
    }
  }

  async function handleVariantQuantityChange(variant: ProductVariant, nextQuantity: number) {
    if (!workingProduct || Number.isNaN(nextQuantity) || nextQuantity < 0 || nextQuantity === variant.quantity) return;
    setBusyVariantId(variant.id);
    try {
      const updated = await variantsApi.update(workingProduct.id, variant.id, { quantity: nextQuantity });
      setVariants((prev) => prev.map((v) => (v.id === variant.id ? updated : v)));
    } catch (err) {
      setVariantError(err instanceof Error ? err.message : "Could not update quantity.");
    } finally {
      setBusyVariantId(null);
    }
  }

  async function handleVariantPriceChange(variant: ProductVariant, nextValue: string) {
    if (!workingProduct) return;
    const nextPriceOverride = nextValue === "" ? null : toPaisa(Number(nextValue));
    if (nextPriceOverride === variant.priceOverride) return;
    setBusyVariantId(variant.id);
    try {
      const updated = await variantsApi.update(workingProduct.id, variant.id, {
        priceOverride: nextPriceOverride,
      });
      setVariants((prev) => prev.map((v) => (v.id === variant.id ? updated : v)));
    } catch (err) {
      setVariantError(err instanceof Error ? err.message : "Could not update price override.");
    } finally {
      setBusyVariantId(null);
    }
  }

  async function handleToggleVariantStatus(variant: ProductVariant) {
    if (!workingProduct) return;
    const next = variant.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setBusyVariantId(variant.id);
    try {
      const updated = await variantsApi.setStatus(workingProduct.id, variant.id, next);
      setVariants((prev) => prev.map((v) => (v.id === variant.id ? updated : v)));
    } catch (err) {
      setVariantError(err instanceof Error ? err.message : "Could not change variant status.");
    } finally {
      setBusyVariantId(null);
    }
  }

  async function handleDeleteVariant(variant: ProductVariant) {
    if (!workingProduct) return;
    setBusyVariantId(variant.id);
    try {
      await variantsApi.remove(workingProduct.id, variant.id);
      setVariants((prev) => prev.filter((v) => v.id !== variant.id));
    } catch (err) {
      // e.g. variant already has sale history — server message explains.
      setVariantError(err instanceof Error ? err.message : "Could not delete variant.");
    } finally {
      setBusyVariantId(null);
    }
  }

  async function handleUploadImages(fileList: FileList | null) {
    if (!workingProduct || !fileList || fileList.length === 0) return;
    setImageError(null);
    setIsUploading(true);
    try {
      const updated = await productImagesApi.upload(workingProduct.id, Array.from(fileList));
      setImages(updated.images ?? []);
      setWorkingProduct(updated);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Could not upload images.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDeleteImage(imageId: string) {
    if (!workingProduct) return;
    try {
      const updated = await productImagesApi.remove(workingProduct.id, imageId);
      setImages(updated.images ?? []);
      setWorkingProduct(updated);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Could not delete image.");
    }
  }

  async function handleSetPrimaryImage(imageId: string) {
    if (!workingProduct) return;
    try {
      const updated = await productImagesApi.setPrimary(workingProduct.id, imageId);
      setImages(updated.images ?? []);
      setWorkingProduct(updated);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Could not set primary image.");
    }
  }

  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  return (
    <Modal isOpen onClose={onClose} title={isEdit ? "Edit product" : "Add product"} size="lg" footer={
      <div className="flex w-full items-center justify-between">
        <div>
          {step > 1 && (
            <Button variant="secondary" onClick={() => setStep((s) => (s - 1) as Step)}>
              Back
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {step === 1 && (
            <Button onClick={handleStep1Submit} isLoading={isSavingStep1}>
              Save & continue
            </Button>
          )}
          {step === 2 && <Button onClick={() => setStep(3)}>Continue to images</Button>}
          {step === 3 && <Button onClick={onClose}>Done</Button>}
        </div>
      </div>
    }>
      {/* Step indicator */}
      <div className="mb-5 flex items-center gap-2">
        {(["Details", "Sizes & stock", "Images"] as const).map((label, index) => {
          const stepNumber = (index + 1) as Step;
          const isActive = step === stepNumber;
          const isAccessible = stepNumber === 1 || !!workingProduct;
          return (
            <button
              key={label}
              type="button"
              disabled={!isAccessible}
              onClick={() => isAccessible && setStep(stepNumber)}
              className={clsx(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                isActive
                  ? "bg-brand text-white"
                  : isAccessible
                    ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    : "bg-gray-50 text-gray-300"
              )}
            >
              {stepNumber}. {label}
            </button>
          );
        })}

        <span className="ml-auto">
          {workingProduct ? (
            <Badge tone="brand">{workingProduct.productCode}</Badge>
          ) : (
            <Badge tone="neutral">Auto-generated after saving</Badge>
          )}
        </span>
      </div>

      {/* Step 1: Details */}
      {step === 1 && (
        <div className="space-y-4">
          <Input
            label="Product name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={step1Errors.name}
            disabled={isSavingStep1}
            autoFocus
          />
          <Select
            label="Category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            options={categoryOptions}
            error={step1Errors.categoryId}
            disabled={isSavingStep1}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Selling price (Rs.)"
              type="number"
              min="0"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              error={step1Errors.basePrice}
              disabled={isSavingStep1}
            />
            <Input
              label="Cost price (Rs.) — optional"
              type="number"
              min="0"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              error={step1Errors.costPrice}
              disabled={isSavingStep1}
            />
          </div>

          {step1FormError && (
            <div className="rounded-control bg-danger-light px-3 py-2 text-sm text-danger">{step1FormError}</div>
          )}
        </div>
      )}

      {/* Step 2: Sizes & stock */}
      {step === 2 && workingProduct && (
        <div className="space-y-4">
          {variants.length === 0 ? (
            <p className="rounded-control border border-dashed border-gray-300 p-4 text-center text-sm text-gray-400">
              No sizes/colors added yet. Add at least one below before this product can be sold.
            </p>
          ) : (
            <div className="overflow-hidden rounded-control border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Size</th>
                    <th className="px-3 py-2">Color</th>
                    <th className="px-3 py-2">SKU</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Price override</th>
                    <th className="px-3 py-2 text-right">Status</th>
                    <th className="px-3 py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v) => (
                    <tr key={v.id} className="border-t border-gray-100">
                      <td className="px-3 py-2">{v.size}</td>
                      <td className="px-3 py-2">{v.color}</td>
                      <td className="px-3 py-2 text-xs text-gray-400">{v.variantSku}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          defaultValue={v.quantity}
                          disabled={busyVariantId === v.id}
                          onBlur={(e) => handleVariantQuantityChange(v, Number(e.target.value))}
                          className="w-16 rounded-control border border-gray-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          placeholder="—"
                          defaultValue={v.priceOverride != null ? fromPaisa(v.priceOverride) : ""}
                          disabled={busyVariantId === v.id}
                          onBlur={(e) => handleVariantPriceChange(v, e.target.value)}
                          className="w-20 rounded-control border border-gray-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <ToggleSwitch
                          checked={v.status === "ACTIVE"}
                          onChange={() => handleToggleVariantStatus(v)}
                          disabled={busyVariantId === v.id}
                          label={v.status === "ACTIVE" ? "Deactivate variant" : "Activate variant"}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          title="Delete variant"
                          disabled={busyVariantId === v.id}
                          onClick={() => handleDeleteVariant(v)}
                          className="rounded-control p-1.5 text-gray-400 hover:bg-danger-light hover:text-danger disabled:opacity-40"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="rounded-control border border-gray-200 bg-gray-50 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Add a size / color</p>
            <div className="grid grid-cols-4 gap-2">
              <input
                placeholder="Size (e.g. M)"
                value={newSize}
                onChange={(e) => setNewSize(e.target.value)}
                className="rounded-control border border-gray-300 px-2 py-1.5 text-sm"
              />
              <input
                placeholder="Color (e.g. Navy)"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="rounded-control border border-gray-300 px-2 py-1.5 text-sm"
              />
              <input
                type="number"
                min="0"
                placeholder="Quantity"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                className="rounded-control border border-gray-300 px-2 py-1.5 text-sm"
              />
              <input
                type="number"
                min="0"
                placeholder="Price override (optional)"
                value={newPriceOverride}
                onChange={(e) => setNewPriceOverride(e.target.value)}
                className="rounded-control border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div className="mt-2 flex items-center justify-between">
              {variantError && <p className="text-xs text-danger">{variantError}</p>}
              <Button size="sm" className="ml-auto" onClick={handleAddVariant} isLoading={isAddingVariant}>
                <Plus size={14} />
                Add
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Images */}
      {step === 3 && workingProduct && (
        <div className="space-y-4">
          {images.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {images.map((img) => (
                <div key={img.id} className="group relative overflow-hidden rounded-control border border-gray-200">
                  <img src={`${API_ORIGIN}${img.imageUrl}`} alt="" className="h-24 w-full object-cover" />
                  {img.isPrimary && (
                    <span className="absolute left-1 top-1">
                      <Badge tone="brand">Primary</Badge>
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 px-1.5 py-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {!img.isPrimary && (
                      <button
                        onClick={() => handleSetPrimaryImage(img.id)}
                        className="text-[11px] font-medium text-white hover:underline"
                      >
                        Set primary
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteImage(img.id)}
                      className="ml-auto text-[11px] font-medium text-white hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <label
            className={clsx(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-control border-2 border-dashed border-gray-300 p-8 text-center text-sm text-gray-400 hover:border-brand hover:text-brand",
              isUploading && "pointer-events-none opacity-60"
            )}
          >
            {isUploading ? <Loader2 size={22} className="animate-spin" /> : <UploadCloud size={22} />}
            <span>{isUploading ? "Uploading…" : "Click to upload images (JPG, PNG or WEBP, up to 10MB each)"}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => handleUploadImages(e.target.files)}
              disabled={isUploading}
            />
          </label>

          {imageError && (
            <div className="rounded-control bg-danger-light px-3 py-2 text-sm text-danger">{imageError}</div>
          )}
        </div>
      )}
    </Modal>
  );
}