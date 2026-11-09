import { useConfirmDeleteStore } from "../store/confirmDeleteStore";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

export function ConfirmDeleteHost() {
  const request = useConfirmDeleteStore((s) => s.request);
  const close = useConfirmDeleteStore((s) => s.close);
  if (!request) return null;

  return (
    <ConfirmDeleteModal
      key={request.id}
      itemName={request.itemName}
      note={request.note}
      onClose={close}
      onDelete={request.run}
    />
  );
}