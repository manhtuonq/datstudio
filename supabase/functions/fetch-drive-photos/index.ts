import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DriveApiFile {
  id: string;
  thumbnailLink?: string | null;
}

const getUniqueMatches = (value: string, pattern: RegExp) => {
  const seen = new Set<string>();
  const matches: string[] = [];

  for (const match of value.matchAll(pattern)) {
    const id = match[1];
    if (id && !seen.has(id)) {
      seen.add(id);
      matches.push(id);
    }
  }

  return matches;
};

const buildPhotoRowsFromIds = (albumId: string, fileIds: string[]) =>
  fileIds.map((fileId, index) => ({
    album_id: albumId,
    drive_file_id: fileId,
    url: `https://drive.google.com/uc?export=view&id=${fileId}`,
    thumbnail_url: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`,
    position: index,
  }));

const buildPhotoRowsFromApiFiles = (albumId: string, files: DriveApiFile[]) =>
  files.map((file, index) => ({
    album_id: albumId,
    drive_file_id: file.id,
    url: `https://drive.google.com/uc?export=view&id=${file.id}`,
    thumbnail_url: file.thumbnailLink
      ? file.thumbnailLink.replace(/=s\d+/, "=s1200")
      : `https://drive.google.com/thumbnail?id=${file.id}&sz=w1200`,
    position: index,
  }));

const fetchPublicFolderFileIds = async (folderId: string) => {
  const embeddedUrl = `https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(folderId)}#grid`;
  const response = await fetch(embeddedUrl, {
    headers: {
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Public Google Drive folder error [${response.status}]: ${body}`);
  }

  const html = await response.text();
  return getUniqueMatches(html, /\/file\/d\/([a-zA-Z0-9_-]{20,})/g);
};

const fetchDriveFilesViaApi = async (folderId: string, apiKey: string) => {
  const query = encodeURIComponent(`'${folderId}' in parents and mimeType contains 'image/' and trashed = false`);
  const fields = encodeURIComponent("files(id,thumbnailLink)");
  const driveUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=50&key=${apiKey}`;

  const driveRes = await fetch(driveUrl);
  if (!driveRes.ok) {
    const errBody = await driveRes.text();
    throw new Error(`Google Drive API error [${driveRes.status}]: ${errBody}`);
  }

  const driveData = (await driveRes.json()) as { files?: DriveApiFile[] };
  return Array.isArray(driveData.files) ? driveData.files.filter((file) => Boolean(file?.id)) : [];
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

    let photosToInsert: Array<{
      album_id: string;
      drive_file_id: string;
      url: string;
      thumbnail_url: string;
      position: number;
    }> = [];
    let source = "public-folder";

    if (GOOGLE_API_KEY) {
      try {
        const apiFiles = await fetchDriveFilesViaApi(folder_id, GOOGLE_API_KEY);
        if (apiFiles.length > 0) {
          photosToInsert = buildPhotoRowsFromApiFiles(album_id, apiFiles);
          source = "google-drive-api";
        }
      } catch (apiError) {
        console.warn("Drive API import failed, falling back to public folder parser:", apiError);
      }
    }

    if (photosToInsert.length === 0) {
      const publicFileIds = await fetchPublicFolderFileIds(folder_id);

      if (publicFileIds.length === 0) {
        return new Response(
          JSON.stringify({
            error: "Không tìm thấy ảnh trong folder. Hãy đảm bảo folder đang ở chế độ public và ảnh nằm trực tiếp trong folder này.",
          }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      photosToInsert = buildPhotoRowsFromIds(album_id, publicFileIds);
    }

    // Delete existing photos for this album (in case of re-sync)
    await supabase.from("photos").delete().eq("album_id", album_id);

    const { error: insertError } = await supabase.from("photos").insert(photosToInsert);

    if (insertError) {
      throw new Error(`Failed to insert photos: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, count: photosToInsert.length, source }),
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
