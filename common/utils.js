//found this object parser here: https://webgpulab.xbdev.net/index.php?page=editor&id=objmodel&
//easier to read/understand than the one on learn so i decided to use this one instead

function readObj(txt) {
  console.log("readObj...");

  let objects = [];

  objects.push({
    name: "test",
    v: [],
    vt: [],
    vn: [],
    f: [],
    usemtl: "",
  });
  let data = { v: [], n: [], f: [] };

  txt = txt.replaceAll("  ", " ");
  let lines = txt.split("\n");
  console.log("num lines:", lines.length);

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    line = line.trim();
    if (line.length < 2) continue;
    if (line[0] == "#") continue;

    let parts = line.split(" ");
    if (parts.length < 1) continue;
    switch (parts[0]) {
      case "v": // v 0.089624 1.419387 0.052847
        {
          objects.reverse()[0].v.push(parts[1]);
          objects.reverse()[0].v.push(parts[2]);
          objects.reverse()[0].v.push(parts[3]);
        }
        break;

      case "vt": // vt 0.818181 0.000000
        {
          objects.reverse()[0].vt.push(parts[1]);
          objects.reverse()[0].vt.push(parts[2]);
        }
        break;

      case "vn": // vn 0.5499 0.7413 0.3847
        {
          objects.reverse()[0].vn.push(parts[1]);
          objects.reverse()[0].vn.push(parts[2]);
          objects.reverse()[0].vn.push(parts[3]);
        }
        break;

      case "f": // f 1/1/1 14/2/1 13/3/1
        {
          let i0 = parts[1].split("/")[0] - 1;
          let i1 = parts[2].split("/")[0] - 1;
          let i2 = parts[3].split("/")[0] - 1;
          let i3 = parts.length == 4 ? undefined : parts[4].split("/")[0] - 1;

          let n0 = parts[1].split("/")[2] - 1;
          let n1 = parts[2].split("/")[2] - 1;
          let n2 = parts[3].split("/")[2] - 1;
          let n3 = parts.length == 4 ? undefined : parts[4].split("/")[2] - 1;

          if (parts[1].includes("//")) {
            n0 = parts[1].split("//")[1] - 1;
            n1 = parts[2].split("//")[1] - 1;
            n2 = parts[3].split("//")[1] - 1;
            n3 = parts.length == 4 ? undefined : parts[4].split("//")[1] - 1;
          }

          if (i3 == undefined) {
            // triangles
            for (let g = 0; g < 3; g++) {
              let idx = [i0, i1, i2][g];
              let x0 = objects.reverse()[0].v[3 * idx + 0];
              let y0 = objects.reverse()[0].v[3 * idx + 1];
              let z0 = objects.reverse()[0].v[3 * idx + 2];

              data.v.push(x0);
              data.v.push(y0);
              data.v.push(z0);
              data.f.push(data.f.length);
            }

            for (let g = 0; g < [n0, n1, n2].length; g++) {
              let nx0 = objects.reverse()[0].vn[3 * [n0, n1, n2][g] + 0];
              let ny0 = objects.reverse()[0].vn[3 * [n0, n1, n2][g] + 1];
              let nz0 = objects.reverse()[0].vn[3 * [n0, n1, n2][g] + 2];
              data.n.push(-nx0);
              data.n.push(-ny0);
              data.n.push(-nz0);
            }
          } // quads
          else {
            let v = [];
            for (let g = 0; g < 4; g++) {
              let idx = [i0, i1, i2, i3][g];
              let x0 = objects.reverse()[0].v[3 * idx + 0];
              let y0 = objects.reverse()[0].v[3 * idx + 1];
              let z0 = objects.reverse()[0].v[3 * idx + 2];
              v.push({ x: x0, y: y0, z: z0 });
            }
            data.v.push(v[0].x);
            data.v.push(v[0].y);
            data.v.push(v[0].z);
            data.v.push(v[1].x);
            data.v.push(v[1].y);
            data.v.push(v[1].z);
            data.v.push(v[2].x);
            data.v.push(v[2].y);
            data.v.push(v[2].z);
            data.f.push(data.f.length);
            data.f.push(data.f.length);
            data.f.push(data.f.length);

            data.v.push(v[0].x);
            data.v.push(v[0].y);
            data.v.push(v[0].z);
            data.v.push(v[2].x);
            data.v.push(v[2].y);
            data.v.push(v[2].z);
            data.v.push(v[3].x);
            data.v.push(v[3].y);
            data.v.push(v[3].z);
            data.f.push(data.f.length);
            data.f.push(data.f.length);
            data.f.push(data.f.length);

            let n = [];
            for (let g = 0; g < 4; g++) {
              let idx = [n0, n1, n2, n3][g];
              let nx0 = -objects.reverse()[0].vn[3 * idx + 0];
              let ny0 = -objects.reverse()[0].vn[3 * idx + 1];
              let nz0 = -objects.reverse()[0].vn[3 * idx + 2];
              n.push({ x: nx0, y: ny0, z: nz0 });
            }
            data.n.push(n[0].x);
            data.n.push(n[0].y);
            data.n.push(n[0].z);
            data.n.push(n[1].x);
            data.n.push(n[1].y);
            data.n.push(n[1].z);
            data.n.push(n[2].x);
            data.n.push(n[2].y);
            data.n.push(n[2].z);

            data.n.push(n[0].x);
            data.n.push(n[0].y);
            data.n.push(n[0].z);
            data.n.push(n[2].x);
            data.n.push(n[2].y);
            data.n.push(n[2].z);
            data.n.push(n[3].x);
            data.n.push(n[3].y);
            data.n.push(n[3].z);
          }
        }
        break;
    }
  }
  console.log("done ;)");
  return [data];
}

function processObjFile(objects) {
  console.log("processObjFile... ");

  console.log("num meshes:", objects.length);
  console.log("vertices:", objects[0].v.length);
  console.log("faces:", objects[0].f.length);
  console.log("normals:", objects[0].n.length);

  // get some bounds for the model (doesn't go off screen)
  let min = { x: 10000, y: 10000, z: 10000 };
  let max = { x: -10000, y: -10000, z: -10000 };
  for (let i = 0; i < objects[0].v.length / 3; i++) {
    min.x = Math.min(min.x, objects[0].v[i * 3 + 0]);
    min.y = Math.min(min.y, objects[0].v[i * 3 + 1]);
    min.z = Math.min(min.z, objects[0].v[i * 3 + 2]);
    if (i < 10) {
      console.log(objects[0].v[i * 3 + 0]);
    }
    max.x = Math.max(max.x, objects[0].v[i * 3 + 0]);
    max.y = Math.max(max.y, objects[0].v[i * 3 + 1]);
    max.z = Math.max(max.z, objects[0].v[i * 3 + 2]);
  }
  let delta = { x: max.x - min.x, y: max.y - min.y, z: max.z - min.z };
  middle = {
    x: min.x + delta.x * 0.5,
    y: min.y + delta.y * 0.5,
    z: min.z + delta.z * 0.5,
  };
  dist = Math.sqrt(delta.x * delta.x + delta.y * delta.y + delta.z * delta.z);
  console.log("model size:", dist);
  console.log("min:", min.x, min.y, min.z);
  console.log("max:", max.x, max.y, max.z);
  console.log("middle:", middle.x, middle.y, middle.z);
  return { dist, min, max, middle };
}
