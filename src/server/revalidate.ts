import { revalidatePath } from "next/cache";

/** After a player changed (renamed, deleted, guest added or made permanent): every page that lists players. */
export function revalidatePlayerLists(): void {
  revalidatePath("/admin");
  revalidatePath("/players");
  revalidatePath("/new/x01");
}
