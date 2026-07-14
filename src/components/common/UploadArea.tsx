"use client";

import { ImagePlus, UploadCloud, X } from "lucide-react";
import Image from "next/image";
import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";

export function UploadArea({ onChange, label = "上传现场照片" }: { onChange?: (files: File[]) => void; label?: string }) {
  const [files, setFiles] = useState<Array<{ file: File; url: string }>>([]);
  const urlsRef = useRef<string[]>([]);

  useEffect(() => () => urlsRef.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const add = (incoming: File[]) => {
    const images = incoming.filter((file) => file.type.startsWith("image/")).slice(0, 4 - files.length);
    const created = images.map((file) => ({ file, url: URL.createObjectURL(file) }));
    urlsRef.current.push(...created.map((item) => item.url));
    const next = [...files, ...created];
    setFiles(next);
    onChange?.(next.map((item) => item.file));
  };
  const inputChange = (event: ChangeEvent<HTMLInputElement>) => add(Array.from(event.target.files ?? []));
  const drop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); add(Array.from(event.dataTransfer.files)); };
  const remove = (index: number) => {
    URL.revokeObjectURL(files[index].url);
    urlsRef.current = urlsRef.current.filter((url) => url !== files[index].url);
    const next = files.filter((_, itemIndex) => itemIndex !== index);
    setFiles(next);
    onChange?.(next.map((item) => item.file));
  };
  return (
    <div className="upload-component">
      <div className="upload-area" onDragOver={(event) => event.preventDefault()} onDrop={drop}>
        <UploadCloud size={30} /><strong>{label}</strong><p>可拖拽图片到此处，也可以使用下方按钮选择。最多 4 张，仅在浏览器中预览。</p><label className="button button-secondary"><ImagePlus size={17} />选择图片<input type="file" accept="image/*" multiple onChange={inputChange} hidden /></label>
      </div>
      {files.length ? <div className="upload-previews">{files.map((item, index) => <figure key={`${item.file.name}-${index}`}><Image src={item.url} alt={`待上传预览 ${index + 1}`} width={240} height={160} unoptimized /><button type="button" onClick={() => remove(index)} aria-label={`移除${item.file.name}`}><X size={16} /></button><figcaption>{item.file.name}</figcaption></figure>)}</div> : null}
    </div>
  );
}
