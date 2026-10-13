"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bookLesson, cancelBooking, getCurrentUserId, purchasePackage } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

function errorMessage(e: unknown) {
  return e instanceof Error ? e.message : "알 수 없는 오류가 발생했습니다";
}

async function requireLogin(next: string) {
  if (!(await getCurrentUserId())) redirect(`/login?next=${encodeURIComponent(next)}`);
}

export async function purchaseAction(formData: FormData) {
  const packageId = String(formData.get("packageId"));
  const proId = String(formData.get("proId"));
  await requireLogin(`/pros/${proId}`);

  try {
    await purchasePackage(packageId);
  } catch (e) {
    redirect(`/pros/${proId}?error=${encodeURIComponent(errorMessage(e))}`);
  }
  revalidatePath("/me");
  redirect(`/pros/${proId}/book?purchased=1`);
}

export async function bookAction(formData: FormData) {
  const proId = String(formData.get("proId"));
  const passId = String(formData.get("passId"));
  const startsAt = String(formData.get("startsAt"));
  await requireLogin(`/pros/${proId}/book`);

  try {
    await bookLesson(passId, startsAt);
  } catch (e) {
    redirect(`/pros/${proId}/book?error=${encodeURIComponent(errorMessage(e))}`);
  }
  revalidatePath(`/pros/${proId}/book`);
  redirect("/me?booked=1");
}

export async function cancelAction(formData: FormData) {
  const bookingId = String(formData.get("bookingId"));
  await requireLogin("/me");

  try {
    await cancelBooking(bookingId);
  } catch (e) {
    redirect(`/me?error=${encodeURIComponent(errorMessage(e))}`);
  }
  revalidatePath("/me");
  redirect("/me");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
