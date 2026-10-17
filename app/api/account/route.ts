import { NextResponse } from "next/server";
import { getAdminSupabase, getServerSupabase } from "@/lib/supabase/server";

export async function DELETE() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const admin = getAdminSupabase();
  if (!admin) {
    return NextResponse.json({ error: "Account deletion isn't configured on this server." }, { status: 501 });
  }

  const { error: rowsError } = await admin.from("records").delete().eq("user_id", user.id);
  if (rowsError) return NextResponse.json({ error: "Couldn't delete your data. Try again." }, { status: 500 });
  await admin.from("vaults").delete().eq("user_id", user.id);
  await admin.from("profiles").delete().eq("user_id", user.id);
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: "Couldn't delete your account. Try again." }, { status: 500 });

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
