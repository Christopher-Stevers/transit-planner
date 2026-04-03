import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { PMTiles, type RangeResponse, type Source } from "pmtiles";

const PMTILES_PATH = path.join(process.cwd(), "public", "can_pop.pmtiles");

// Node.js-compatible PMTiles source using fs
class NodeFileSource implements Source {
  private fd: number | null = null;
  private size: number | null = null;

  private open() {
    if (this.fd === null) {
      this.fd = fs.openSync(PMTILES_PATH, "r");
      this.size = fs.fstatSync(this.fd).size;
    }
  }

  async getBytes(offset: number, length: number): Promise<RangeResponse> {
    this.open();
    const buf = Buffer.alloc(length);
    fs.readSync(this.fd!, buf, 0, length, offset);
    return { data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) };
  }

  getKey() { return PMTILES_PATH; }
}

const source = new NodeFileSource();
const pmtiles = new PMTiles(source);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ z: string; x: string; y: string }> }
) {
  const { z, x, y } = await params;
  const zi = parseInt(z), xi = parseInt(x), yi = parseInt(y);
  if ([zi, xi, yi].some(isNaN)) return new NextResponse("Bad params", { status: 400 });

  try {
    const tile = await pmtiles.getZxy(zi, xi, yi);
    if (!tile?.data) return new NextResponse(null, { status: 204 });

    const bytes = new Uint8Array(tile.data as ArrayBuffer);
    const isGzip = bytes[0] === 0x1f && bytes[1] === 0x8b;

    const headers: Record<string, string> = {
      "Content-Type": "application/x-protobuf",
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*",
    };
    if (isGzip) headers["Content-Encoding"] = "gzip";

    return new NextResponse(tile.data, { headers });
  } catch (e) {
    console.error("PMTiles error:", e);
    return new NextResponse("Error", { status: 500 });
  }
}
