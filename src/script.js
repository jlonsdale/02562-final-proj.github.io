window.onload = function () {
  main();
};

let scrollValue = 3;
const minscrollValue = 3;
const maxscrollValue = 100;

async function main() {
  // Event Listeners

  const handleScroll = (event) => {
    scrollValue = Math.max(
      minscrollValue,
      Math.min(maxscrollValue, scrollValue + (event.deltaY < 0 ? -0.1 : 0.1))
    );
    render();
  };

  window.addEventListener("wheel", handleScroll);

  const gpu = navigator.gpu;
  const adapter = await gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const canvas = document.getElementById("c");

  let response = await fetch("../assets/Diamond_Low_Poly.obj");
  let objtext = await response.text();
  let objects = await readObj(objtext);

  vertices = new Float32Array(objects[0].v);
  normals = new Float32Array(objects[0].n);
  indices = new Int32Array(objects[0].f);

  const context =
    canvas.getContext("gpupresent") || canvas.getContext("webgpu");
  const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device: device,
    format: canvasFormat,
  });
  const wgsl = device.createShaderModule({
    code: document.getElementById("wgsl").text,
  });

  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: wgsl,
      entryPoint: "main_vs",
    },
    fragment: {
      module: wgsl,
      entryPoint: "main_fs",
      targets: [{ format: canvasFormat }],
    },
    primitive: {
      topology: "triangle-strip",
    },
  });

  const vertexBuffer = await device.createBuffer({
    size: (vertices.byteLength + 3) & ~3,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  const indexBuffer = await device.createBuffer({
    size: (indices.byteLength + 3) & ~3,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  const normalBuffer = await device.createBuffer({
    size: (normals.byteLength + 3) & ~3,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  let funiforms = new Float32Array([scrollValue]);
  let iuniforms = new Uint32Array([(numberOfTriangles = vertices.length / 4)]);

  await device.queue.writeBuffer(vertexBuffer, 0, vertices);
  await device.queue.writeBuffer(indexBuffer, 0, indices);
  await device.queue.writeBuffer(normalBuffer, 0, normals);

  const f_uniformBuffer = await device.createBuffer({
    size: funiforms.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const i_uniformBuffer = await device.createBuffer({
    size: iuniforms.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  await device.queue.writeBuffer(f_uniformBuffer, 0, funiforms);
  await device.queue.writeBuffer(i_uniformBuffer, 0, iuniforms);

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: f_uniformBuffer } },
      { binding: 1, resource: { buffer: i_uniformBuffer } },
      { binding: 2, resource: { buffer: vertexBuffer } },
      { binding: 3, resource: { buffer: indexBuffer } },
      { binding: 4, resource: { buffer: normalBuffer } },
    ],
  });

  const render = () => {
    let funiforms = new Float32Array([scrollValue]);
    device.queue.writeBuffer(f_uniformBuffer, 0, funiforms);

    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: f_uniformBuffer } },
        { binding: 1, resource: { buffer: i_uniformBuffer } },
        { binding: 2, resource: { buffer: vertexBuffer } },
        { binding: 3, resource: { buffer: indexBuffer } },
        { binding: 4, resource: { buffer: normalBuffer } },
      ],
    });

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(4);
    pass.end();

    device.queue.submit([encoder.finish()]);
  };

  render();
}
