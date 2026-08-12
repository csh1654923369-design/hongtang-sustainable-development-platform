use std::fs::{self, File};
use std::io::BufWriter;
use std::path::{Path, PathBuf};

use anyhow::{bail, Context, Result};
use glam::{Mat3, Quat, Vec3, Vec3A};
use serde_json::Value;
use spark_lib::decoder::ChunkReceiver;
use spark_lib::gsplat::GsplatArray;
use spark_lib::ply::PlyEncoder;
use spark_lib::spz::SpzDecoder;
use spark_lib::tsplat::{Tsplat, TsplatMut};

const GLB_MAGIC: u32 = 0x4654_6c67;
const JSON_CHUNK: u32 = 0x4e4f_534a;
const BIN_CHUNK: u32 = 0x004e_4942;

#[derive(Debug)]
struct LeafTile {
    uri: String,
    declared_splats: usize,
}

#[derive(Debug)]
struct GlbPayload {
    spz: Vec<u8>,
    node_matrix: [f32; 16],
    declared_splats: usize,
}

fn read_u32(bytes: &[u8], offset: usize) -> Result<u32> {
    let raw = bytes
        .get(offset..offset + 4)
        .with_context(|| format!("GLB 在字节 {offset} 处被截断"))?;
    Ok(u32::from_le_bytes(raw.try_into().unwrap()))
}

fn parse_glb(path: &Path) -> Result<GlbPayload> {
    let bytes = fs::read(path).with_context(|| format!("无法读取 {}", path.display()))?;
    if read_u32(&bytes, 0)? != GLB_MAGIC {
        bail!("{} 不是 GLB 文件", path.display());
    }
    if read_u32(&bytes, 4)? != 2 {
        bail!("{} 不是 GLB 2.0 文件", path.display());
    }

    let file_len = read_u32(&bytes, 8)? as usize;
    if file_len > bytes.len() {
        bail!("{} 的 GLB 长度声明超出实际文件", path.display());
    }

    let json_len = read_u32(&bytes, 12)? as usize;
    if read_u32(&bytes, 16)? != JSON_CHUNK {
        bail!("{} 缺少 JSON chunk", path.display());
    }
    let json_start = 20;
    let json_end = json_start + json_len;
    let json: Value = serde_json::from_slice(
        bytes
            .get(json_start..json_end)
            .with_context(|| format!("{} 的 JSON chunk 被截断", path.display()))?,
    )
    .with_context(|| format!("{} 的 JSON chunk 无法解析", path.display()))?;

    let bin_header = json_end;
    let bin_len = read_u32(&bytes, bin_header)? as usize;
    if read_u32(&bytes, bin_header + 4)? != BIN_CHUNK {
        bail!("{} 缺少 BIN chunk", path.display());
    }
    let bin_start = bin_header + 8;
    let bin = bytes
        .get(bin_start..bin_start + bin_len)
        .with_context(|| format!("{} 的 BIN chunk 被截断", path.display()))?;

    let primitive = json
        .pointer("/meshes/0/primitives/0")
        .with_context(|| format!("{} 缺少高斯 primitive", path.display()))?;
    let buffer_view_index = primitive
        .pointer("/extensions/KHR_gaussian_splatting/extensions/KHR_gaussian_splatting_compression_spz_2/bufferView")
        .and_then(Value::as_u64)
        .with_context(|| format!("{} 缺少 SPZ bufferView", path.display()))?
        as usize;
    let buffer_view = json
        .pointer(&format!("/bufferViews/{buffer_view_index}"))
        .with_context(|| format!("{} 的 SPZ bufferView 无效", path.display()))?;
    let byte_offset = buffer_view
        .get("byteOffset")
        .and_then(Value::as_u64)
        .unwrap_or(0) as usize;
    let byte_length = buffer_view
        .get("byteLength")
        .and_then(Value::as_u64)
        .with_context(|| format!("{} 的 SPZ bufferView 缺少长度", path.display()))?
        as usize;
    let spz = bin
        .get(byte_offset..byte_offset + byte_length)
        .with_context(|| format!("{} 的 SPZ 数据超出 BIN 范围", path.display()))?
        .to_vec();

    let matrix_values = json
        .pointer("/nodes/0/matrix")
        .and_then(Value::as_array)
        .with_context(|| format!("{} 缺少节点矩阵", path.display()))?;
    if matrix_values.len() != 16 {
        bail!("{} 的节点矩阵不是 4x4", path.display());
    }
    let mut node_matrix = [0.0f32; 16];
    for (index, value) in matrix_values.iter().enumerate() {
        node_matrix[index] = value
            .as_f64()
            .with_context(|| format!("{} 的节点矩阵含非数字值", path.display()))?
            as f32;
    }

    let declared_splats = json
        .pointer("/accessors/0/count")
        .and_then(Value::as_u64)
        .with_context(|| format!("{} 缺少高斯点数量", path.display()))?
        as usize;

    Ok(GlbPayload {
        spz,
        node_matrix,
        declared_splats,
    })
}

fn collect_leaves(tile: &Value, leaves: &mut Vec<LeafTile>) -> Result<()> {
    let children = tile
        .get("children")
        .and_then(Value::as_array)
        .map(Vec::as_slice)
        .unwrap_or(&[]);
    if children.is_empty() {
        let uri = tile
            .pointer("/content/uri")
            .and_then(Value::as_str)
            .with_context(|| "末级瓦片缺少 content.uri")?
            .to_string();
        leaves.push(LeafTile {
            uri,
            declared_splats: 0,
        });
        return Ok(());
    }
    for child in children {
        collect_leaves(child, leaves)?;
    }
    Ok(())
}

fn source_transform(node: &[f32; 16]) -> (Mat3, Vec3) {
    // glTF uses Y-up. The original converter recorded this model as Z-up.
    // Convert glTF coordinates [x, y, z] back to source [x, -z, y].
    let gltf_to_source = Mat3::from_cols(Vec3::X, Vec3::Z, -Vec3::Y);
    let node_rotation = Mat3::from_cols(
        Vec3::new(node[0], node[1], node[2]),
        Vec3::new(node[4], node[5], node[6]),
        Vec3::new(node[8], node[9], node[10]),
    );
    let node_translation = Vec3::new(node[12], node[13], node[14]);
    (
        gltf_to_source * node_rotation,
        gltf_to_source * node_translation,
    )
}

fn main() -> Result<()> {
    let mut args = std::env::args_os().skip(1);
    let tileset_dir = PathBuf::from(
        args.next()
            .context("用法：recover-3dtiles <3D Tiles 文件夹> <输出 PLY>")?,
    );
    let output_path = PathBuf::from(
        args.next()
            .context("用法：recover-3dtiles <3D Tiles 文件夹> <输出 PLY>")?,
    );
    if args.next().is_some() {
        bail!("参数过多。用法：recover-3dtiles <3D Tiles 文件夹> <输出 PLY>");
    }

    let tileset_path = tileset_dir.join("tileset.json");
    let tileset: Value = serde_json::from_reader(
        File::open(&tileset_path)
            .with_context(|| format!("无法读取 {}", tileset_path.display()))?,
    )
    .with_context(|| format!("无法解析 {}", tileset_path.display()))?;

    let root = tileset
        .get("root")
        .context("tileset.json 缺少 root")?;
    let mut leaves = Vec::new();
    collect_leaves(root, &mut leaves)?;
    if leaves.is_empty() {
        bail!("tileset 中没有末级瓦片");
    }

    let mut total_splats = 0usize;
    for leaf in &mut leaves {
        let payload = parse_glb(&tileset_dir.join(Path::new(&leaf.uri)))?;
        leaf.declared_splats = payload.declared_splats;
        total_splats += payload.declared_splats;
    }
    println!(
        "找到 {} 个末级瓦片，共 {} 个高斯点。",
        leaves.len(),
        total_splats
    );

    let mut recovered = GsplatArray::new();
    recovered.splats.reserve(total_splats);
    let mut bounds_min = Vec3A::splat(f32::INFINITY);
    let mut bounds_max = Vec3A::splat(f32::NEG_INFINITY);

    for (index, leaf) in leaves.iter().enumerate() {
        let path = tileset_dir.join(Path::new(&leaf.uri));
        let payload = parse_glb(&path)?;
        let mut decoder = SpzDecoder::new(GsplatArray::new());
        decoder
            .push(&payload.spz)
            .with_context(|| format!("无法解码 {}", path.display()))?;
        decoder
            .finish()
            .with_context(|| format!("无法完成解码 {}", path.display()))?;
        let mut tile_splats = decoder.into_splats();

        if tile_splats.max_sh_degree != 0 {
            bail!(
                "{} 含 {} 阶球谐系数；当前恢复器仅用于本项目已确认的 SH0 模型",
                path.display(),
                tile_splats.max_sh_degree
            );
        }
        if tile_splats.splats.len() != leaf.declared_splats {
            bail!(
                "{} 解码数量 {} 与 GLB 声明数量 {} 不一致",
                path.display(),
                tile_splats.splats.len(),
                leaf.declared_splats
            );
        }

        let (rotation, translation) = source_transform(&payload.node_matrix);
        let rotation_quat = Quat::from_mat3(&rotation).normalize();
        for splat in &mut tile_splats.splats {
            let center = rotation * (&*splat).center().to_vec3() + translation;
            let quaternion = (rotation_quat * (&*splat).quaternion()).normalize();
            (&mut *splat).set_center(center.to_vec3a());
            (&mut *splat).set_quaternion(quaternion);
            bounds_min = bounds_min.min(center.to_vec3a());
            bounds_max = bounds_max.max(center.to_vec3a());
        }
        recovered.splats.append(&mut tile_splats.splats);

        if (index + 1) % 50 == 0 || index + 1 == leaves.len() {
            println!(
                "已恢复 {}/{} 个瓦片，累计 {} 个高斯点。",
                index + 1,
                leaves.len(),
                recovered.splats.len()
            );
        }
    }

    if recovered.splats.len() != total_splats {
        bail!(
            "恢复数量 {} 与预期 {} 不一致",
            recovered.splats.len(),
            total_splats
        );
    }

    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent)
            .with_context(|| format!("无法创建 {}", parent.display()))?;
    }
    let output = File::create(&output_path)
        .with_context(|| format!("无法创建 {}", output_path.display()))?;
    let mut writer = BufWriter::with_capacity(8 * 1024 * 1024, output);
    PlyEncoder::new(recovered)
        .with_max_sh(0)
        .encode_to_writer(&mut writer)
        .with_context(|| format!("无法写入 {}", output_path.display()))?;

    println!("恢复完成：{}", output_path.display());
    println!(
        "坐标范围：min [{:.3}, {:.3}, {:.3}]，max [{:.3}, {:.3}, {:.3}]",
        bounds_min.x,
        bounds_min.y,
        bounds_min.z,
        bounds_max.x,
        bounds_max.y,
        bounds_max.z
    );
    Ok(())
}
