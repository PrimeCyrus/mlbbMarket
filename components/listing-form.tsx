"use client";

import type React from "react";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";

async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const objectUrl = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (e) => reject(e);
      img.src = objectUrl;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create image blob"));
      },
      type,
      quality,
    );
  });
}

async function processFileForUpload(file: File): Promise<Blob> {
  const img = await loadImageFromFile(file);

  const targetWidth = 1080;
  let scale = 1;
  if (img.width > targetWidth) {
    scale = targetWidth / img.width;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this environment");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return await canvasToBlob(canvas, "image/webp", 0.85);
}

export default function ListingForm() {
  const { user } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [isGirlsId, setIsGirlsId] = useState(false);
  const [collectorLevel, setCollectorLevel] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fs = Array.from(e.target.files ?? []).slice(0, 4);
    setFiles(fs);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      console.log("Starting listing upload...");
      if (!user) throw new Error("You must be signed in");
      if (!title.trim() || !description.trim() || !price)
        throw new Error("Please fill all fields");

      console.log("Uploading images to storage...");
      const uploadUrls = await Promise.all(
        files.map(async (f, idx) => {
          const id = `${Date.now()}_${idx}_${Math.random().toString(36).slice(2)}`;
          const compressed = await processFileForUpload(f);
          const fileName = `${user.id}/${id}_${f.name.replace(/\.[^.]+$/, "")}.webp`;

          const { data, error } = await supabase.storage
            .from("listings")
            .upload(fileName, compressed, {
              contentType: "image/webp",
              upsert: false,
            });

          if (error) throw new Error(`Image upload failed: ${error.message}`);

          const {
            data: { publicUrl },
          } = supabase.storage.from("listings").getPublicUrl(fileName);
          return publicUrl;
        }),
      );
      console.log("Images uploaded successfully:", uploadUrls);

      console.log("Inserting listing into database...");
      const { data, error: insertError } = await supabase
        .from("listings")
        .insert({
          title: title.trim(),
          description: description.trim(),
          price: typeof price === "string" ? Number.parseFloat(price) : price,
          image_urls: uploadUrls,
          user_id: user.id,
          is_girls_id: isGirlsId,
          collector_level: collectorLevel || null,
          status: "active",
          created_at: new Date().toISOString(),
          sold_at: null,
        })
        .select()
        .single();

      if (insertError)
        throw new Error(`Database insert failed: ${insertError.message}`);

      console.log("Listing created successfully:", data);
      setSuccess("Listing published successfully! Redirecting...");

      setTimeout(() => {
        router.push(`/listing/${data.id}`);
      }, 1500);
    } catch (err: any) {
      console.error("Listing submission error:", err);
      setError(err?.message || "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-5">
      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="e.g. Mythic #120 ★ 70 Skins"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border-slate-200 bg-white placeholder:text-slate-400"
          maxLength={100}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Add relevant details (rank, skins, MMR, transfer info)..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-[8rem] border-slate-200 bg-white placeholder:text-slate-400"
          maxLength={2000}
          required
        />
      </div>

      <div className="grid gap-2 max-w-xs">
        <Label htmlFor="price">Price (Rs)</Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          min="0"
          placeholder="199.00"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="border-slate-200 bg-white placeholder:text-slate-400"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-md">
        <div className="grid gap-2">
          <Label htmlFor="collectorLevel">Collector Level (Optional)</Label>
          <select
            id="collectorLevel"
            value={collectorLevel}
            onChange={(e) => setCollectorLevel(e.target.value)}
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50"
          >
            <option value="">None</option>
            <option value="Amateur">Amateur</option>
            <option value="Junior">Junior</option>
            <option value="Seasoned">Seasoned</option>
            <option value="Expert">Expert</option>
            <option value="Renowned">Renowned</option>
            <option value="Exalted">Exalted</option>
            <option value="Mega">Mega</option>
            <option value="World">World</option>
          </select>
        </div>

        <div className="flex items-center space-x-2 pt-8">
          <input
            type="checkbox"
            id="isGirlsId"
            checked={isGirlsId}
            onChange={(e) => setIsGirlsId(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 bg-slate-50 text-cyan-500"
          />
          <Label htmlFor="isGirlsId" className="cursor-pointer">
            Girls ID
          </Label>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="images">Images (up to 4)</Label>
        <Input
          id="images"
          type="file"
          accept="image/*"
          multiple
          onChange={onFiles}
          className="border-slate-200 bg-white"
        />
        {!!files.length && (
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {files.map((f, i) => {
              const url = URL.createObjectURL(f);
              return (
                <div
                  key={i}
                  className="rounded-md border border-slate-200 p-1 bg-slate-50"
                >
                  <img
                    src={url || "/placeholder.svg"}
                    alt={"Preview " + (i + 1)}
                    className="h-28 w-full rounded object-cover"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-fuchsia-300">{error}</p>}
      {success && <p className="text-sm text-emerald-300">{success}</p>}

      <div className="pt-2">
        <Button
          type="submit"
          disabled={submitting}
          className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-emerald-500 text-white hover:from-cyan-600 hover:via-fuchsia-600 hover:to-emerald-600 shadow-md"
        >
          {submitting ? "Publishing..." : "Publish listing"}
        </Button>
      </div>
    </form>
  );
}
