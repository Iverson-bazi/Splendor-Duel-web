import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const port = Number(process.env.PORT || 4173);
const mime = { ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".css":"text/css; charset=utf-8", ".json":"application/json; charset=utf-8" };

createServer(async (req,res)=>{
  try {
    const requested = decodeURIComponent((req.url || "/").split("?")[0]);
    const relative = requested === "/" ? "index.html" : normalize(requested).replace(/^[/\\]+/, "");
    if (relative.startsWith("..")) throw new Error("invalid path");
    const file = join(process.cwd(), relative);
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": mime[extname(file)] || "application/octet-stream", "Cache-Control":"no-store" });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type":"text/plain; charset=utf-8" });
    res.end("Not found");
  }
}).listen(port,"127.0.0.1",()=>console.log(`宝石工坊已启动：http://127.0.0.1:${port}`));
