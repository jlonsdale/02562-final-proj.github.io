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

  const objDoc = new OBJDoc("diamond");
  try {
    let response = await fetch("../assets/Diamond_High_Poly.obj");
    if (response.ok) {
      const text = await response.text();
      const scale = 1;
      const reverse = true;
      await objDoc.parse(text, scale, reverse);
    }
  } catch (error) {
    console.log("ruh roh", error);
  }

  const drawingInfo = await objDoc.getDrawingInfo();

  const vertices = drawingInfo.vertices;
  const indices = drawingInfo.indices;
  const normals = drawingInfo.normals;

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

  let iuniforms = new Int32Array([vertices.length + 10]);
  let funiforms = new Float32Array([scrollValue]);

  await device.queue.writeBuffer(vertexBuffer, 0, vertices);
  await device.queue.writeBuffer(indexBuffer, 0, indices);
  await device.queue.writeBuffer(normalBuffer, 0, normals);

  const i_uniformBuffer = await device.createBuffer({
    size: iuniforms.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const f_uniformBuffer = await device.createBuffer({
    size: funiforms.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const render = () => {
    let iuniforms = new Uint32Array([vertices.length]);
    let funiforms = new Float32Array([scrollValue]);
    device.queue.writeBuffer(f_uniformBuffer, 0, funiforms);
    device.queue.writeBuffer(i_uniformBuffer, 0, iuniforms);

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
