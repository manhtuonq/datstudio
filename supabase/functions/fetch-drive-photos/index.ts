import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    if (!GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY is not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    const { folder_id, album_id } = await req.json();

    if (!folder_id || !album_id) {
      return new Response(
        JSON.stringify({ error: "folder_id and album_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify album belongs to user
    const { data: album, error: albumError } = await supabase
      .from("albums")
      .select("id")
      .eq("id", album_id)
      .eq("user_id", userId)
      .single();

    if (albumError || !album) {
      return new Response(
        JSON.stringify({ error: "Album not found or unauthorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch image files from Google Drive folder (max 50)
    const driveUrl = `https://www.googleapis.com/drive/v3/files?q='${folder_id}'+in+parents+and+mimeType+contains+'image/'&fields=files(id,name,mimeType,thumbnailLink,webContentLink)&pageSize=50&key=${GOOGLE_API_KEY}`;

    const driveRes = await fetch(driveUrl);
    if (!driveRes.ok) {
      const errBody = await driveRes.text();
      throw new Error(`Google Drive API error [${driveRes.status}]: ${errBody}`);
    }

    const driveData = await driveRes.json();
    const files = driveData.files || [];

    if (files.length === 0) {
      return new Response(
        JSON.stringify({ error: "Không tìm thấy ảnh nào trong folder. Hãy đảm bảo folder được chia sẻ công khai." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete existing photos for this album (in case of re-sync)
    await supabase.from("photos").delete().eq("album_id", album_id);

    // Insert photos
    const photosToInsert = files.map((file: any, index: number) => ({
      album_id,
      drive_file_id: file.id,
      url: `https://drive.google.com/uc?export=view&id=${file.id}`,
      thumbnail_url: file.thumbnailLink
        ? file.thumbnailLink.replace(/=s\d+/, "=s400")
        : `https://drive.google.com/thumbnail?id=${file.id}&sz=w400`,
      position: index,
    }));

    const { error: insertError } = await supabase.from("photos").insert(photosToInsert);

    if (insertError) {
      throw new Error(`Failed to insert photos: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, count: files.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error fetching drive photos:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
