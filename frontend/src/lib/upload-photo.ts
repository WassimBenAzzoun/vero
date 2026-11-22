import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { api, post } from "./api";
export async function uploadPhoto(uri: string) {
  // Converts phone HEIC/large selections to a bounded JPEG before uploading.
  const context = ImageManipulator.manipulate(uri);
  const original = await context.renderAsync();
  if (Math.max(original.width, original.height) > 1800)
    context.resize(
      original.width >= original.height ? { width: 1800 } : { height: 1800 },
    );
  const rendered = await context.renderAsync();
  const normalized = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: 0.8,
  });
  const intent = await post<{
    id: string;
    uploadPath: string;
    completePath: string;
  }>("/media/uploads", {});
  const form = new FormData();
  if (process.env.EXPO_OS === "web") {
    const blob = await (await fetch(normalized.uri)).blob();
    form.append("file", blob, "review.jpg");
  } else
    form.append("file", {
      uri: normalized.uri,
      name: "review.jpg",
      type: "image/jpeg",
    } as unknown as Blob);
  await api(intent.uploadPath, { method: "PUT", body: form });
  await post(intent.completePath, {});
  return intent.id;
}
